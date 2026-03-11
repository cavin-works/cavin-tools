## [0.1.10](https://github.com/cavin-works/cavin-tools/compare/v0.1.9...v0.1.10) (2026-03-03)


### ✨ 新功能

* 优化便签 ([1e10ba4](https://github.com/cavin-works/cavin-tools/commit/1e10ba49598716311817d02ed8a3389ecad66012))
* 增加便签 ([2c38b6e](https://github.com/cavin-works/cavin-tools/commit/2c38b6e7bf24d49fba4400c8b218736edebef576))



## [0.1.9](https://github.com/cavin-works/cavin-tools/compare/v0.1.8...v0.1.9) (2026-02-10)


### 🐛 Bug 修复

* **layout:** 优化 macOS 标题栏拖动区域实现 ([c4865d7](https://github.com/cavin-works/cavin-tools/commit/c4865d78c9436d16049b83b9598b70936a7bf59b))



## [0.1.8](https://github.com/cavin-works/cavin-tools/compare/v0.1.7...v0.1.8) (2026-02-09)


### ✨ 新功能

* **ai-assistant:** add assistant section pages and configs ([0484af7](https://github.com/cavin-works/cavin-tools/commit/0484af7647992c9113aa9c7a9e281a3db977dc7d))
* **ai-assistant:** 增强技能管理系统 ([83b2946](https://github.com/cavin-works/cavin-tools/commit/83b294683b9c8e82cb88ffbd2bdcf1a62284faab))
* **ai-assistant:** 实现 Skill 缓存系统 ([5259a04](https://github.com/cavin-works/cavin-tools/commit/5259a043d96c13eef7197da37689aa9288c957d4))
* **ai-assistant:** 添加技能文件内容预览功能 ([e290e52](https://github.com/cavin-works/cavin-tools/commit/e290e52bd08ac631afed6240be63ddf3f24cf6b9))



## [0.1.7](https://github.com/cavin-works/cavin-tools/compare/v0.1.6...v0.1.7) (2026-02-04)


### 🐛 Bug 修复

* **release:** 修复 macOS 签名文件名匹配问题 ([092e638](https://github.com/cavin-works/cavin-tools/commit/092e63876292b20a3d9c0a32710ea54ab29c10fb))
* 修正版本号为 0.1.7 ([9b10f50](https://github.com/cavin-works/cavin-tools/commit/9b10f50b48e0b7d6b5f29b7a1e435f90ed73ae02))


### ✨ 新功能

* **ai-assistant:** 添加 Cursor skill 支持并修复 macOS 窗口问题 ([43b2d9c](https://github.com/cavin-works/cavin-tools/commit/43b2d9c641c05b355fed8bc7cabdfdf4ca3dfbbd))



## [0.1.6](https://github.com/cavin-works/cavin-tools/compare/v0.1.5...v0.1.6) (2026-02-03)


### 🐛 Bug 修复

* **version:** 修复 GitHub Actions 版本号更新问题 ([48a7417](https://github.com/cavin-works/cavin-tools/commit/48a7417e2e5df51bc8b601b5913da85b13850889))



## [0.1.5](https://github.com/cavin-works/cavin-tools/compare/v0.1.4...v0.1.5) (2026-02-03)


### 🐛 Bug 修复

* **ci:** 修复 latest.json 签名字段为空的问题 ([9985eea](https://github.com/cavin-works/cavin-tools/commit/9985eead5df5baf932cd829160d2aa6e8eee493e)), closes [tauri-apps/tauri-action#950](https://github.com/tauri-apps/tauri-action/issues/950)



## [0.1.4](https://github.com/cavin-works/cavin-tools/compare/v0.1.3...v0.1.4) (2026-02-03)


### 🐛 Bug 修复

* **process-manager:** 修复 Windows 平台 cmd 窗口弹出问题 ([b3612b2](https://github.com/cavin-works/cavin-tools/commit/b3612b283a57f961e2edc9e65d0996d7defcfffe))
* **types:** add cursor to TypeScript type definitions ([2bcd3a9](https://github.com/cavin-works/cavin-tools/commit/2bcd3a91df663b2c4c487685c87b4232f7e52c85))
* **windows:** add CommandExt import for creation_flags ([62b7ce4](https://github.com/cavin-works/cavin-tools/commit/62b7ce4f1f622c1b03a5dcc417cc00072db7cfee))


### ✨ 新功能

* **mcp:** add Cursor MCP server integration ([7f0dd75](https://github.com/cavin-works/cavin-tools/commit/7f0dd752bb5d53f9bcb00332d6e204d6306f090c)), closes [#cursor-mcp-integration](https://github.com/cavin-works/cavin-tools/issues/cursor-mcp-integration)



## [0.1.3](https://github.com/cavin-works/cavin-tools/compare/v0.1.0...v0.1.3) (2026-01-28)


### 🐛 Bug 修复

* **ci:** use pnpm version from packageManager in workflows ([5bcf323](https://github.com/cavin-works/cavin-tools/commit/5bcf323d85f8919d4d361e85d82f4ccefd8c4e8d))
* **deps:** downgrade @tauri-apps/api to 2.8.0 to match rust crate ([b4e5c78](https://github.com/cavin-works/cavin-tools/commit/b4e5c78fc659b79ed0214d3973096126df4c9cde))
* **deps:** upgrade @tauri-apps/api to 2.9.1 to match rust crate ([825cacb](https://github.com/cavin-works/cavin-tools/commit/825cacba3b82903b825e39de762c34bc0f3b287c))
* 优化 AI 助手在 Cavin Tools 中的集成体验 ([1091c1b](https://github.com/cavin-works/cavin-tools/commit/1091c1b160ca7721deb8521f4ebff471401feb6a))


### ✨ 新功能

* **ui:** update application logo and icons ([d4a6fa6](https://github.com/cavin-works/cavin-tools/commit/d4a6fa6009db79195a1a0985cd697cd98df3cbc3))
* 将工具箱重命名为 Mnemosyne ([792c44c](https://github.com/cavin-works/cavin-tools/commit/792c44c4c99c5d047cf820aa37aa8ace5fbd33e7))
* 添加 AI 助手工具 ([1537d64](https://github.com/cavin-works/cavin-tools/commit/1537d64d41f7a6a61b530f9bb695eea97b2b08fa))



# [0.1.0](https://github.com/cavin-works/cavin-tools/compare/v0.1.2...v0.1.0) (2026-01-25)


### 🐛 Bug 修复

* 临时禁用 updater 构件以避免签名错误 ([ffd265b](https://github.com/cavin-works/cavin-tools/commit/ffd265b7d07c1b0e10b16df2178853dba2aa6f81))
* 修复 Tauri 插件版本不匹配和编译错误 ([4d6b8a6](https://github.com/cavin-works/cavin-tools/commit/4d6b8a618f1b8a4c81586a5dd80939d8aa142782))
* 删除对已删除的 packet-capture 工具的引用 ([d7667a7](https://github.com/cavin-works/cavin-tools/commit/d7667a7ffeba00fc4a39b3441d6e0f07590b6163))
* 启用 tauri.conf.json 中的 createUpdaterArtifacts 选项 ([e47f290](https://github.com/cavin-works/cavin-tools/commit/e47f2900ec57767823588baf16f465aea208a6e0))
* 更新 release.yml 和 tauri.conf.json 配置 ([0ab7097](https://github.com/cavin-works/cavin-tools/commit/0ab70973150f0f927220b0feab89788edc591ba2))
* 添加 process:allow-restart 权限以支持重启功能 ([316a727](https://github.com/cavin-works/cavin-tools/commit/316a7270c420e0d353d9975890abc552482bc19c))
* 添加 TAURI_SIGNING_PRIVATE_KEY_PASSWORD 环境变量以支持签名 ([a921b7c](https://github.com/cavin-works/cavin-tools/commit/a921b7c9474217d11b1fa8e596074272089358d9))
* 移除 process 插件的 relaunch 权限 ([70b2636](https://github.com/cavin-works/cavin-tools/commit/70b2636a3db88fabd3869704e4fd8862f9417ce6))



## [0.1.2](https://github.com/cavin-works/cavin-tools/compare/v0.1.1...v0.1.2) (2026-01-24)


### 🐛 Bug 修复

* 修复 release.yml 版本更新语法错误 ([95bbd60](https://github.com/cavin-works/cavin-tools/commit/95bbd60deabdba0478851a5240dba846ed39f6bd))



## [0.1.1](https://github.com/cavin-works/cavin-tools/compare/v0.0.9...v0.1.1) (2026-01-24)


### 🐛 Bug 修复

* 修复 macOS 平台进程管理和端口查询问题 ([b2f3fef](https://github.com/cavin-works/cavin-tools/commit/b2f3fef59627bae7a2c2d801b66137e9a6fb5500))


### ✨ 新功能

* 添加 Tauri 2 自动更新功能 ([d46220e](https://github.com/cavin-works/cavin-tools/commit/d46220edf8116572fef73a1aad05b2764bb005c3))
* 添加网络捕获工具模块 ([a2ca980](https://github.com/cavin-works/cavin-tools/commit/a2ca9804ca17eb4969c1fd1538de2d0e1c7545cb))



## [0.0.9](https://github.com/cavin-works/cavin-tools/compare/v0.0.8...v0.0.9) (2026-01-19)


### 🐛 Bug 修复

* **ci:** 修复 Windows 临时目录路径 + 移除不支持的 x86_64 macOS 构建 ([403362d](https://github.com/cavin-works/cavin-tools/commit/403362d19be14a0d56f8eb04df35cfd923ab3e4e))



## [0.0.7](https://github.com/cavin-works/cavin-tools/compare/v0.0.6...v0.0.7) (2026-01-18)


### 🐛 Bug 修复

* 修复 TypeScript 编译错误 ([3e7bff4](https://github.com/cavin-works/cavin-tools/commit/3e7bff440220a297f9bc1e39a71e05c4898f251c))



## [0.0.6](https://github.com/cavin-works/cavin-tools/compare/v0.0.5...v0.0.6) (2026-01-18)


### 🐛 Bug 修复

* **ci:** 修复 GitHub Actions multiline output EOF 解析错误 ([434716a](https://github.com/cavin-works/cavin-tools/commit/434716aee21c4140feb7eb8481969fc8281b69c9))



## [0.0.4](https://github.com/cavin-works/cavin-tools/compare/v0.0.3...v0.0.4) (2026-01-18)


### ✨ 新功能

* 更新 GitHub Actions 工作流以支持 CHANGELOG 自动提交 ([0a7b021](https://github.com/cavin-works/cavin-tools/commit/0a7b0214745ddd20836cb4d064186fee271de302))



## [0.0.3](https://github.com/cavin-works/cavin-tools/compare/v0.0.2...v0.0.3) (2026-01-18)



## [0.0.2](https://github.com/cavin-works/cavin-tools/compare/v0.0.1...v0.0.2) (2026-01-18)


### ✨ 新功能

* 添加 conventional-changelog-cli 依赖以支持自动化变更日志生成 ([c1ec841](https://github.com/cavin-works/cavin-tools/commit/c1ec841f3b6a56fafb13bf5e5126471ee80da8ba))



## [0.0.1](https://github.com/cavin-works/cavin-tools/compare/36650309d94f7af90f5f3f18094684927ee20fb8...v0.0.1) (2026-01-18)


### 🐛 Bug 修复

* add edge case handling for zoom levels ([29d0319](https://github.com/cavin-works/cavin-tools/commit/29d0319398458ae96da38df4ac3f33f6460c7d45))
* add input validation and edge case handling for zoom levels ([ec3052b](https://github.com/cavin-works/cavin-tools/commit/ec3052bf2396d2ba3624437335043a89260bfa45))
* resolve memory leaks and code quality issues in Timeline component ([236eafb](https://github.com/cavin-works/cavin-tools/commit/236eafb9e3380fdf9e76470daac97812fd2e7ab0))
* 修复Rust编译错误和警告 ([24e2aa9](https://github.com/cavin-works/cavin-tools/commit/24e2aa950f4f331ed72a0fb3bd45e3c34c768105))
* 修复Tauri capabilities配置错误 ([0caa49d](https://github.com/cavin-works/cavin-tools/commit/0caa49d27c85c27cbcbf3c21b06d719b7e62c7f1))
* 修复文件导入和拖拽功能 ([bd09a4e](https://github.com/cavin-works/cavin-tools/commit/bd09a4e6e58290423cd66ed72a72984f4f8c4304))
* 修复非Windows平台的FFmpeg文件扩展名 ([85e2831](https://github.com/cavin-works/cavin-tools/commit/85e2831b279af56fbc33604d530d8d2167ca5ee0))
* 启用Tauri窗口文件拖拽功能 ([51b9723](https://github.com/cavin-works/cavin-tools/commit/51b97238d5eeead2359d8bad222608ce71c33aff))
* 改进视频元数据提取的健壮性和异步处理 ([c346ced](https://github.com/cavin-works/cavin-tools/commit/c346cedaccd78d6a10340dc780f0c27fa79b137b))


### ✨ 新功能

* add background remover tool for image processing ([4f87159](https://github.com/cavin-works/cavin-tools/commit/4f871594ab137ebdcbf4edb691736238adce0dd1))
* add dark theme support and unify UI styles ([e608685](https://github.com/cavin-works/cavin-tools/commit/e608685078cac18e9de2c143cc6e0f0d6b13bd0d))
* add image compression and conversion tools ([b6824ed](https://github.com/cavin-works/cavin-tools/commit/b6824ededc7c32c1f9137033583389025628b207))
* add image editor with watermark, collage, and batch processing ([3013c76](https://github.com/cavin-works/cavin-tools/commit/3013c76618c1d9b99a934216ec0296d04bee18a9))
* add macOS FFmpeg auto-download support ([0bf9e0a](https://github.com/cavin-works/cavin-tools/commit/0bf9e0afa1ecb942d139697e68e1c4883217a58f))
* add watermark remover tool and enhance image processing capabilities ([af39242](https://github.com/cavin-works/cavin-tools/commit/af392422142857554342f9caac65a674d128724f))
* add zoom level constants and helper functions ([6730d28](https://github.com/cavin-works/cavin-tools/commit/6730d28977bff552efbd5ff9e68e2855767fdd78))
* implement extended zoom range (0.1x-10x) with wheel and button controls ([658d347](https://github.com/cavin-works/cavin-tools/commit/658d347d29055b43ae3acf2b32735f77cadefdca))
* improve UI and fix video processing queue ([1f3dcde](https://github.com/cavin-works/cavin-tools/commit/1f3dcde244149cdc68c25682b6737849e165c6ab))
* integrate react-image-crop and enhance image editor functionality ([aa31a89](https://github.com/cavin-works/cavin-tools/commit/aa31a890c43f1bc08f3a5cace468a7e654f3b48a))
* refactor application architecture to extensible toolbox ([c2be40b](https://github.com/cavin-works/cavin-tools/commit/c2be40bbd5d26c2541c7cfdc10bdde96cc8d4876))
* unify dark theme and refactor image tool architecture ([b08c9c0](https://github.com/cavin-works/cavin-tools/commit/b08c9c007af38d61f7f0f93c718da210b0434779))
* 初始化 shadcn/ui 组件系统并升级到 Tailwind CSS 4.x ([cc4f916](https://github.com/cavin-works/cavin-tools/commit/cc4f916a201f0390c60cbdc40e11250c985b8f20))
* 初始化Tauri + React项目 ([3665030](https://github.com/cavin-works/cavin-tools/commit/36650309d94f7af90f5f3f18094684927ee20fb8))
* 删除无用代码 ([fe6aa1d](https://github.com/cavin-works/cavin-tools/commit/fe6aa1d8b2360bbd68a9060dd2aca0d945057b6d))
* 增加预览 ([bdadcac](https://github.com/cavin-works/cavin-tools/commit/bdadcac068d8aed6384693a45911cf9220f65a51))
* 完善UI组件和用户体验 ([dd29bb7](https://github.com/cavin-works/cavin-tools/commit/dd29bb7a11ced9093a43842eeb6def790945f527))
* 完善应用主题系统和设置页面 ([c0da36b](https://github.com/cavin-works/cavin-tools/commit/c0da36b2af5feea1510f4aa60a496104cf690b91))
* 完整重构图片编辑器为标签页式布局并实现实时预览 ([89b2d4f](https://github.com/cavin-works/cavin-tools/commit/89b2d4f6528b239c81c03d089a46bcfe45fd5217))
* 实现所有视频处理功能 ([053bf9a](https://github.com/cavin-works/cavin-tools/commit/053bf9a47a1bc547785706c2d3312afe76dd1b8c))
* 新增进程管理工具和 Serena 项目配置 ([98162d4](https://github.com/cavin-works/cavin-tools/commit/98162d4689a8e2d8cb5fb0495b8c97bdf5dd4abc))
* 更新依赖和配置，优化样式系统 ([28b1179](https://github.com/cavin-works/cavin-tools/commit/28b11798e552b2e6b931c7f28cd860d985c4cefd))
* 添加 Radix UI 组件并更新样式系统 ([2ea6d70](https://github.com/cavin-works/cavin-tools/commit/2ea6d70195267028827ccd8fb0069811308fcb55))
* 添加FFmpeg检测和路径管理 ([9f59765](https://github.com/cavin-works/cavin-tools/commit/9f59765318cdd8226f8d1a1557c81e24c58ec161))
* 添加Tauri文件拖拽事件监听和调试日志 ([34e470b](https://github.com/cavin-works/cavin-tools/commit/34e470b089482b8bf699e31be54fb0c25bb3c2e5))
* 添加前端视频导入和拖拽功能 ([c2c9477](https://github.com/cavin-works/cavin-tools/commit/c2c947710fd49e9f148c4cf4cbd8232132a0e80a))
* 添加时间轴组件 ([e4091b0](https://github.com/cavin-works/cavin-tools/commit/e4091b01cd3915938749f23d2a84214a2b57325d))
* 添加视频元数据提取功能 ([f18e65f](https://github.com/cavin-works/cavin-tools/commit/f18e65f4a13c122272e3d67077e37e1f585fd50d))
* 添加自动化发布流程和相关配置 ([d31904d](https://github.com/cavin-works/cavin-tools/commit/d31904daf5e59cc4331a9e7131de5ede677cf258))
* 统一所有工具页面的主题颜色系统 ([389f4ae](https://github.com/cavin-works/cavin-tools/commit/389f4aeab283640612fc3d57a320d7e03e078a0d))
* 重构样式 ([35ff344](https://github.com/cavin-works/cavin-tools/commit/35ff344e4b8b8c7ec13a14402a607aac592cd331))


### ⚡ 性能优化

* add memoization to optimize zoom performance ([1c7c4fc](https://github.com/cavin-works/cavin-tools/commit/1c7c4fc50c230ba0c9deb0fb9ee47472aee06e3f))



