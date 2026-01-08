# Rust编译环境修复指南

## 问题诊断

您的系统中Git的link.exe覆盖了Visual Studio的链接器,导致Rust编译失败。

## 解决方案

### 方案A: 安装Visual Studio Build Tools (推荐)

**优点**: 最稳定,所有Windows程序都能正常编译

**步骤**:

1. 访问 https://visualstudio.microsoft.com/zh-hans/downloads/

2. 下载"Visual Studio 2022 生成工具"

3. 运行安装程序,勾选:
   - ✅ "使用C++的桌面开发"

4. 在右侧确保勾选:
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 生成工具
   - ✅ Windows 10 SDK

5. 安装(约6-8GB)

6. 重启电脑

7. 使用"Visual Studio Developer Command Prompt"编译:
   ```bash
   # 开始菜单搜索"x64 Native Tools Command Prompt for VS 2022"
   cd E:\projects\ai-projects\video-editor
   cargo build
   ```

### 方案B: 使用GNU工具链 (快速)

**优点**: 无需安装大型软件

**缺点**: 可能有一些兼容性问题

**步骤**:

1. 打开PowerShell(管理员模式)

2. 安装GNU工具链:
   ```bash
   rustup toolchain install stable-x86_64-pc-windows-gnu
   rustup default stable-x86_64-pc-windows-gnu
   ```

3. 安装MinGW-w64:
   ```bash
   # 访问 https://www.mingw-w64.org/
   # 下载并安装 MinGW-w64
   ```

4. 将MinGW的bin目录添加到系统PATH:
   - 通常是 C:\mingw64\bin
   - 确保在 Git\usr\bin 之前

5. 重启终端

6. 测试编译:
   ```bash
   cd E:\projects\ai-projects\video-editor
   cargo build
   ```

### 方案C: 修复系统PATH (不推荐)

**临时解决方案**: 在编译前临时修改PATH

**步骤**:

1. 找到Visual Studio的link.exe位置:
   ```
   C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\[版本号]\bin\Hostx64\x64\
   ```

2. 临时将此路径添加到PATH前面:
   ```powershell
   $env:PATH = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\[版本]\bin\Hostx64\x64;$env:PATH"
   cargo build
   ```

## 验证安装

运行以下命令检查:

```bash
# 检查link.exe位置
where link

# 应该显示Visual Studio的link.exe,而不是Git的

# 检查Rust配置
rustup show

# 测试编译
cd src-tauri
cargo build
```

## 推荐使用方案A

虽然需要下载6-8GB,但:
- ✅ 最稳定
- ✅ 所有Windows程序都能编译
- ✅ 微软官方支持
- ✅ 不会有兼容性问题
