# macOS Network Extension 集成指南

## 文件结构

```
src-tauri/
└── macos-extension/
    └── TransparentProxyProvider.swift      # macOS Network Extension 源码
```

## 功能实现状态

### ✅ 已完成

| 组件 | 文件 | 状态 |
|--------|------|------|
| **Swift Extension** | `TransparentProxyProvider.swift` | 完整实现，支持按应用过滤 |
| **Rust 桥接** | `redirector/macos.rs` | 占位实现（返回说明） |

### 📋 待完成（Phase 2）

| 任务 | 说明 |
|------|------|
| **Xcode 项目** | 需要创建完整的 Xcode 项目配置 |
| **entitlements.plist** | 配置 Network Extension 权限 |
| **Info.plist** | 配置 Extension 元数据 |
| **Rust-Swift IPC** | 实现两个进程间通信 |
| **代码签名** | Apple Developer 证书签名 |
| **系统扩展安装** | 实现 Extension 加载和卸载 |

## 使用方式（当前占位状态）

在 macOS 环境下运行时，重定向器会返回友好提示，说明需要完成 Phase 2 配置。

## Swift 代码特性

`TransparentProxyProvider.swift` 实现了：

1. **按应用流量过滤** - 通过 `targetAppIds` 配置
2. **透明代理隧道** - 所有流量重定向到 `127.0.0.1:9527`
3. **动态规则配置** - 运行时启用/禁用应用拦截
4. **日志输出** - 便于调试
5. **协议支持** - TCP 协议（HTTP/HTTPS）

## 与 Tauri 集成方式

### 方案 A：独立 Extension（推荐）

1. 使用 Swift 代码创建独立的 macOS App Bundle
2. 通过 Unix Domain Socket 或 Named Pipe 与 Rust Tauri 进程通信
3. 用户首次运行时自动安装 Extension

### 方案 B：内嵌到 Tauri App

1. 将 Extension Bundle 嵌入到 Tauri App 中
2. 修改 `Info.plist` 添加 Extension 配置
3. 更新 Tauri 打包配置

## 完整实施步骤

### 步骤 1：创建 Xcode 项目

```bash
# 创建新的 macOS App 项目
cd /path/to/project
mkdir -p macos-extension
cd macos-extension

# 使用 Xcode 命令行工具创建项目
swift package init --type executable
swift package init --type library
```

### 步骤 2：配置 Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.yourcompany.cavin-tools.proxy</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSSystemExtensionUsageDescription</key>
    <string>Transparent proxy for application network capture</string>
    <key>NSExtension</key>
    <dict>
        <key>com.apple.developer.networking.networkextension</key>
        <array>
            <string>app-proxy-provider</string>
        </array>
    </dict>
</dict>
</plist>
</plist>
```

### 步骤 3：配置 entitlements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.networking.networkextension.app-proxy-provider</key>
    <array>
        <string>com.apple.Safari</string>
        <string>com.google.Chrome</string>
        <string>com.tencent.xinWeChat</string>
    </array>
</dict>
</plist>
```

### 步骤 4：实现 Rust-Swift IPC

在 `redirector/macos.rs` 中添加：

```rust
use std::path::PathBuf;
use tokio::net::UnixStream;

pub async fn start_redirector(
    redirector: &mut Redirector,
) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
    let socket_path = PathBuf::from("/tmp/cavin-tools-proxy.sock");
    
    // 启动 Swift Extension 子进程
    // 这里需要实现 OSExtensionRequest API 调用
    // 或者让 Extension 在启动时主动连接 Rust 端点
    
    // 建立 IPC 连接
    let stream = UnixStream::connect(&socket_path).await
        .map_err(|e| format!("Failed to connect to extension: {}", e))?;
    
    // 启动事件循环，处理 Extension 发来的连接信息
    tokio::spawn(async move {
        // ... IPC 处理逻辑
    });
    
    Ok(conn_rx)
}
```

### 步骤 5：更新 Tauri 配置

在 `src-tauri/tauri.conf.json` 中：

```json
{
  "bundle": {
    "macOSPrivateFrameworks": [],
    "macOS": {
      "hardenedRuntime": true,
      "exceptionDomains": [
        "apple.com",
        "localhost"
      ]
    },
    "systemExtension": {
      "identifier": "com.yourcompany.cavin-tools",
      "extensionIdentifier": "com.yourcompany.cavin-tools.proxy"
    }
  }
}
```

### 步骤 6：代码签名

```bash
# 为 Rust 代码签名
codesign --deep --force --sign "Developer ID Application: YourCompany" \
  dist/CaptureTool.app

# 为 Extension 签名
codesign --deep --force --entitlements macos-extension/entitlements.plist \
  --sign "Developer ID Application: YourCompany" \
  dist/CaptureTool.app/Contents/Library/SystemExtensions/com.yourcompany.cavin-tools.proxy.systemextension
```

### 步骤 7：公证（可选）

```bash
xcrun notarytool submit \
  dist/CaptureTool.dmg \
  "YourCompany" \
  "apple@example.com" \
  "Password" \
  --web
```

## 测试步骤

1. **构建 Tauri App**：
   ```bash
   npm run tauri build
   ```

2. **手动安装 Extension**：
   ```bash
   open -a System\ Preferences
   ```

3. **验证功能**：
   - 打开网络抓包工具
   - 选择要抓包的应用
   - 开始抓包
   - 检查网络请求是否被捕获

## 已知限制

1. **需要 Apple Developer Program 会员**（$99/年）
2. **需要用户授权**（首次使用时）
3. **系统扩展可能被系统禁用**（用户手动启用）
4. **macOS 版本要求**：10.15+ (Catalina)
5. **不能拦截 SIP 保护的系统应用**

## 替代方案

如果不想处理 Network Extension 的复杂性，可以考虑：

### 方案 A：使用 pf + utun

```bash
# 配置 pf 规则重定向流量
echo "rdr pass on lo0 proto tcp from any to any port 80 -> 127.0.0.1 port 9527" | \
  sudo pfctl -ef -
```

**优点**：简单，无需代码签名
**缺点**：无法按应用过滤

### 方案 B：环境变量注入

对于支持代理的应用，可以设置环境变量：

```bash
# 对于 Chrome
HTTP_PROXY=127.0.0.1:9527 /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

# 对于使用 curl 的应用
export HTTP_PROXY=127.0.0.1:9527
./your-app
```

## 参考资料

- [Apple Network Extension Documentation](https://developer.apple.com/documentation/networkextension)
- [NETransparentProxyProvider](https://developer.apple.com/documentation/networkextension/netransparentproxyprovider)
- [Tauri macOS 指南](https://tauri.app/v1/guides/features/system-tray)
- [mitmproxy_rs macOS 实现](https://github.com/mitmproxy/mitmproxy_rs/tree/main/mitmproxy-macos)
