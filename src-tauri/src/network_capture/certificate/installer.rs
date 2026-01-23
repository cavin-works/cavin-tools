pub fn get_install_instructions() -> String {
    #[cfg(target_os = "macos")]
    {
        r#"## macOS 安装 CA 证书

1. 双击打开 CA 证书文件（ca.crt）
2. 在"钥匙串访问"中选择"登录"钥匙串
3. 找到 "Cavin Tools Local CA" 证书
4. 双击证书，展开"信任"选项
5. 将"使用此证书时"改为"始终信任"
6. 关闭窗口，输入密码确认

或使用命令行：
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```"#
            .to_string()
    }

    #[cfg(target_os = "windows")]
    {
        r#"## Windows 安装 CA 证书

1. 双击打开 CA 证书文件（ca.crt）
2. 点击"安装证书"
3. 选择"本地计算机"，点击下一步
4. 选择"将所有证书放入下列存储"
5. 点击"浏览"，选择"受信任的根证书颁发机构"
6. 点击下一步，然后完成

或使用命令行（管理员权限）：
```powershell
certutil -addstore -f "ROOT" ca.crt
```"#
            .to_string()
    }

    #[cfg(target_os = "linux")]
    {
        r#"## Linux 安装 CA 证书

### Ubuntu/Debian:
```bash
sudo cp ca.crt /usr/local/share/ca-certificates/cavin-tools-ca.crt
sudo update-ca-certificates
```

### Fedora/RHEL/CentOS:
```bash
sudo cp ca.crt /etc/pki/ca-trust/source/anchors/cavin-tools-ca.crt
sudo update-ca-trust
```

### Arch Linux:
```bash
sudo trust anchor --store ca.crt
```

### 浏览器单独配置:
Chrome/Firefox 可能需要在浏览器设置中单独导入证书"#
            .to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "请查阅您操作系统的文档了解如何安装 CA 证书".to_string()
    }
}
