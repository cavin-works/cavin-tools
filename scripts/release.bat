@echo off
REM 快速发布脚本 (Windows)

setlocal enabledelayedexpansion

if "%1"=="" (
  echo ❌ 错误：请提供版本号
  echo 用法: scripts\release.bat ^<version^>
  echo 示例: scripts\release.bat 0.2.0
  exit /b 1
)

set VERSION=%1

echo 🚀 开始发布 v%VERSION%
echo.

REM 1. 检查是否有未提交的更改
for /f "delims=" %%i in ('git status --porcelain') do set UNCOMMITTED=%%i
defined UNCOMMITTED (
  echo ⚠️  警告：存在未提交的更改
  git status
  echo.
  set /p CONTINUE="是否继续？(y/N): "
  if /i not "!CONTINUE!"=="y" exit /b 1
)

REM 2. 测试生成 changelog
echo 📝 生成 CHANGELOG...
node scripts/test-changelog.cjs %VERSION%

REM 3. 显示生成的 notes
echo.
set /p SATISFIED="是否满意生成的 changelog？(y/N): "
if /i not "%SATISFIED%"=="y" (
  echo ❌ 取消发布
  exit /b 1
)

REM 4. 提交 changelog
echo.
echo 📤 提交 CHANGELOG...
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 到 v%VERSION%"

REM 5. 创建标签
echo 🏷️  创建标签 v%VERSION%...
git tag v%VERSION%

REM 6. 推送代码和标签
echo.
echo 🚀 推送到远程仓库...
git push
git push origin v%VERSION%

echo.
echo ✅ 发布成功！
echo.
echo 📦 GitHub Actions 将自动：
echo   - 更新版本号到配置文件
echo   - 创建 GitHub Release
echo   - 多平台构建应用
echo.
echo 🔗 查看构建进度：
echo   https://github.com/cavin-works/cavin-tools/actions

endlocal
