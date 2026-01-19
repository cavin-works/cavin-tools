# 建议的命令

## 开发命令

### 启动开发模式
```bash
npm run tauri dev
```
启动 Tauri 开发模式（包括前端开发服务器和 Rust 后端）

### 仅启动前端开发服务器
```bash
npm run dev
```
仅启动 Vite 开发服务器（不包含 Tauri）

### 构建生产版本
```bash
npm run tauri build
```
构建 Tauri 应用生产版本

### 预览构建结果
```bash
npm run preview
```
预览 Vite 构建的生产版本

## 测试命令

### 运行测试
```bash
npm test
```
运行 Vitest 测试（允许无测试文件通过）

### 运行测试 UI
```bash
npm run test:ui
```
使用 Vitest UI 界面运行测试

### 生成测试覆盖率报告
```bash
npm run test:coverage
```
运行测试并生成覆盖率报告

## 构建命令

### TypeScript 类型检查 + 构建
```bash
npm run build
```
先运行 TypeScript 编译检查，然后构建生产版本

## 版本管理命令

### 同步版本号
```bash
npm run version:sync
```
同步 package.json、Cargo.toml、tauri.conf.json 的版本号

### 测试 Changelog
```bash
npm run changelog:test
```
测试 Changelog 生成脚本

## Git Hooks

### 安装 Husky
```bash
npm run prepare
```
安装和配置 Git hooks（Husky）

## 系统命令（Darwin/macOS）

### 文件操作
```bash
ls -la                    # 列出文件（包含隐藏文件）
pwd                       # 显示当前目录
cd /path/to/directory     # 切换目录
```

### Git 操作
```bash
git status                # 查看状态
git add .                 # 添加所有更改
git commit -m "message"   # 提交
git push                  # 推送
git pull                  # 拉取
git log --oneline         # 查看提交历史
git diff                  # 查看更改
```

### 进程管理
```bash
ps aux                    # 查看所有进程
kill <PID>                # 终止进程
```

## 常用开发工具

### 查找文件
```bash
find . -name "*.ts"       # 查找所有 TypeScript 文件
```

### 搜索文件内容
```bash
grep -r "pattern" ./src   # 在 src 目录中搜索内容
```

### 端口占用检查
```bash
lsof -i :1421             # 查看端口 1421 的占用情况
```
