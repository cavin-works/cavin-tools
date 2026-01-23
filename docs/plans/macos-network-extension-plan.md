# macOS Network Extension 实施计划 (Phase 2)

## 概述

macOS 平台的按应用抓包需要使用 Apple 的 Network Extension 框架，这需要：
1. Swift/Objective-C 代码
2. Apple Developer Program 会员资格 ($99/年)
3. 特殊的 entitlements 和签名

## 技术方案

### 使用 NETransparentProxyProvider

```swift
import NetworkExtension

class TransparentProxyProvider: NETransparentProxyProvider {
    
    override func startProxy(options: [String: Any]?) async throws {
        let settings = NETransparentProxyNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        
        // 配置拦截规则
        let appRule = NENetworkRule(
            remoteNetwork: nil,
            remotePrefix: 0,
            localNetwork: nil,
            localPrefix: 0,
            protocol: .TCP,
            direction: .outbound
        )
        
        settings.includedNetworkRules = [appRule]
        try await setTunnelNetworkSettings(settings)
    }
    
    override func handleNewFlow(_ flow: NEAppProxyFlow) -> Bool {
        // flow.metaData.sourceAppSigningIdentifier 获取 Bundle ID
        // 判断是否需要拦截该应用的流量
        
        if shouldIntercept(flow) {
            // 重定向到本地代理
            handleFlow(flow)
            return true
        }
        return false  // 放行
    }
}
```

## 项目结构

```
src-tauri/
├── macos-extension/
│   ├── NetworkExtension.xcodeproj
│   ├── TransparentProxyProvider.swift
│   ├── Info.plist
│   └── entitlements.plist
└── src/network_capture/redirector/
    └── macos.rs  # Rust 桥接代码
```

## 所需的 Entitlements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.networking.networkextension</key>
    <array>
        <string>app-proxy-provider</string>
        <string>content-filter-provider</string>
    </array>
    <key>com.apple.developer.system-extension.install</key>
    <true/>
</dict>
</plist>
```

## 实施步骤

### 1. 申请 Network Extension 权限
- 登录 Apple Developer 账号
- 申请 "Network Extension" entitlement
- 等待 Apple 审批 (可能需要几天)

### 2. 创建 System Extension 项目
```bash
# 在 Xcode 中创建新的 System Extension target
# 选择 "Network Extension" 模板
# 配置 signing 和 entitlements
```

### 3. 实现 Rust-Swift 桥接
```rust
// macos.rs
use std::process::Command;

pub async fn start_redirector(
    redirector: &mut Redirector,
) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
    // 通过 IPC (Unix Domain Socket) 与 Swift Extension 通信
    let socket_path = "/tmp/cavin-tools-proxy.sock";
    
    // 启动 System Extension
    activate_system_extension()?;
    
    // 建立 IPC 连接
    let stream = UnixStream::connect(socket_path)?;
    
    // ... 实现通信逻辑
}

fn activate_system_extension() -> Result<(), String> {
    // 使用 OSSystemExtensionRequest 激活扩展
    // 这需要调用 Objective-C API
}
```

### 4. 打包配置
```
YourApp.app/
├── Contents/
│   ├── Library/
│   │   └── SystemExtensions/
│   │       └── com.yourapp.proxy-extension.systemextension/
│   ├── MacOS/
│   │   └── YourApp
│   └── Info.plist
```

## 用户授权流程

1. 首次运行时，系统会弹出对话框请求权限
2. 用户需要在 "系统偏好设置" > "安全性与隐私" 中允许
3. 可能需要重启应用

## 开发环境要求

- macOS 10.15+ (Catalina)
- Xcode 12+
- Apple Developer Program 会员
- 有效的代码签名证书

## 时间估算

| 阶段 | 时间 |
|------|------|
| 申请权限 | 1-5 天 |
| 创建 Extension 项目 | 1 天 |
| 实现核心功能 | 2-3 天 |
| Rust 桥接 | 1-2 天 |
| 测试和调试 | 2-3 天 |
| **总计** | **7-14 天** |

## 替代方案

如果不想使用 Network Extension，可以考虑：

1. **pf + utun** - 使用 macOS 的包过滤器和虚拟网卡
   - 需要 root 权限
   - 配置更复杂
   - 不能按应用过滤

2. **环境变量注入** - 对于支持代理的应用
   - 仅对遵守 `HTTP_PROXY` 的应用有效
   - Chrome/Firefox 可用，微信不行

## 参考资源

- [Apple Network Extension Documentation](https://developer.apple.com/documentation/networkextension)
- [mitmproxy_rs macOS implementation](https://github.com/mitmproxy/mitmproxy_rs/tree/main/mitmproxy-macos)
- [NETransparentProxyProvider](https://developer.apple.com/documentation/networkextension/netransparentproxyprovider)
