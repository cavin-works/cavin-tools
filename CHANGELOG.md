# [0.1.0](https://github.com/cavin-works/cavin-tools/compare/v0.0.4...v0.1.0) (2026-01-18)



## [0.0.4](https://github.com/cavin-works/cavin-tools/compare/v0.0.3...v0.0.4) (2026-01-18)


### ✨ 新功能

* 更新 GitHub Actions 工作流以支持 CHANGELOG 自动提交 ([0a7b021](https://github.com/cavin-works/cavin-tools/commit/0a7b0214745ddd20836cb4d064186fee271de302))



## [0.0.3](https://github.com/cavin-works/cavin-tools/compare/v0.0.2...v0.0.3) (2026-01-18)



## [0.0.2](https://github.com/cavin-works/cavin-tools/compare/v0.0.1...v0.0.2) (2026-01-18)


### ✨ 新功能

* 添加 conventional-changelog-cli 依赖以支持自动化变更日志生成 ([c1ec841](https://github.com/cavin-works/cavin-tools/commit/c1ec841f3b6a56fafb13bf5e5126471ee80da8ba))



## [0.0.1](https://github.com/cavin-works/cavin-tools/compare/36650309d94f7af90f5f3f18094684927ee20fb8...v0.0.1) (2026-01-18)


### 🐛 Bug 修复

* 改进视频元数据提取的健壮性和异步处理 ([c346ced](https://github.com/cavin-works/cavin-tools/commit/c346cedaccd78d6a10340dc780f0c27fa79b137b))
* 启用Tauri窗口文件拖拽功能 ([51b9723](https://github.com/cavin-works/cavin-tools/commit/51b97238d5eeead2359d8bad222608ce71c33aff))
* 修复非Windows平台的FFmpeg文件扩展名 ([85e2831](https://github.com/cavin-works/cavin-tools/commit/85e2831b279af56fbc33604d530d8d2167ca5ee0))
* 修复文件导入和拖拽功能 ([bd09a4e](https://github.com/cavin-works/cavin-tools/commit/bd09a4e6e58290423cd66ed72a72984f4f8c4304))
* 修复Rust编译错误和警告 ([24e2aa9](https://github.com/cavin-works/cavin-tools/commit/24e2aa950f4f331ed72a0fb3bd45e3c34c768105))
* 修复Tauri capabilities配置错误 ([0caa49d](https://github.com/cavin-works/cavin-tools/commit/0caa49d27c85c27cbcbf3c21b06d719b7e62c7f1))
* add edge case handling for zoom levels ([29d0319](https://github.com/cavin-works/cavin-tools/commit/29d0319398458ae96da38df4ac3f33f6460c7d45))
* add input validation and edge case handling for zoom levels ([ec3052b](https://github.com/cavin-works/cavin-tools/commit/ec3052bf2396d2ba3624437335043a89260bfa45))
* resolve memory leaks and code quality issues in Timeline component ([236eafb](https://github.com/cavin-works/cavin-tools/commit/236eafb9e3380fdf9e76470daac97812fd2e7ab0))


### ✨ 新功能

* 初始化 shadcn/ui 组件系统并升级到 Tailwind CSS 4.x ([cc4f916](https://github.com/cavin-works/cavin-tools/commit/cc4f916a201f0390c60cbdc40e11250c985b8f20))
* 初始化Tauri + React项目 ([3665030](https://github.com/cavin-works/cavin-tools/commit/36650309d94f7af90f5f3f18094684927ee20fb8))
* 更新依赖和配置，优化样式系统 ([28b1179](https://github.com/cavin-works/cavin-tools/commit/28b11798e552b2e6b931c7f28cd860d985c4cefd))
* 删除无用代码 ([fe6aa1d](https://github.com/cavin-works/cavin-tools/commit/fe6aa1d8b2360bbd68a9060dd2aca0d945057b6d))
* 实现所有视频处理功能 ([053bf9a](https://github.com/cavin-works/cavin-tools/commit/053bf9a47a1bc547785706c2d3312afe76dd1b8c))
* 添加 Radix UI 组件并更新样式系统 ([2ea6d70](https://github.com/cavin-works/cavin-tools/commit/2ea6d70195267028827ccd8fb0069811308fcb55))
* 添加前端视频导入和拖拽功能 ([c2c9477](https://github.com/cavin-works/cavin-tools/commit/c2c947710fd49e9f148c4cf4cbd8232132a0e80a))
* 添加时间轴组件 ([e4091b0](https://github.com/cavin-works/cavin-tools/commit/e4091b01cd3915938749f23d2a84214a2b57325d))
* 添加视频元数据提取功能 ([f18e65f](https://github.com/cavin-works/cavin-tools/commit/f18e65f4a13c122272e3d67077e37e1f585fd50d))
* 添加自动化发布流程和相关配置 ([d31904d](https://github.com/cavin-works/cavin-tools/commit/d31904daf5e59cc4331a9e7131de5ede677cf258))
* 添加FFmpeg检测和路径管理 ([9f59765](https://github.com/cavin-works/cavin-tools/commit/9f59765318cdd8226f8d1a1557c81e24c58ec161))
* 添加Tauri文件拖拽事件监听和调试日志 ([34e470b](https://github.com/cavin-works/cavin-tools/commit/34e470b089482b8bf699e31be54fb0c25bb3c2e5))
* 统一所有工具页面的主题颜色系统 ([389f4ae](https://github.com/cavin-works/cavin-tools/commit/389f4aeab283640612fc3d57a320d7e03e078a0d))
* 完善应用主题系统和设置页面 ([c0da36b](https://github.com/cavin-works/cavin-tools/commit/c0da36b2af5feea1510f4aa60a496104cf690b91))
* 完善UI组件和用户体验 ([dd29bb7](https://github.com/cavin-works/cavin-tools/commit/dd29bb7a11ced9093a43842eeb6def790945f527))
* 完整重构图片编辑器为标签页式布局并实现实时预览 ([89b2d4f](https://github.com/cavin-works/cavin-tools/commit/89b2d4f6528b239c81c03d089a46bcfe45fd5217))
* 新增进程管理工具和 Serena 项目配置 ([98162d4](https://github.com/cavin-works/cavin-tools/commit/98162d4689a8e2d8cb5fb0495b8c97bdf5dd4abc))
* 增加预览 ([bdadcac](https://github.com/cavin-works/cavin-tools/commit/bdadcac068d8aed6384693a45911cf9220f65a51))
* 重构样式 ([35ff344](https://github.com/cavin-works/cavin-tools/commit/35ff344e4b8b8c7ec13a14402a607aac592cd331))
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


### ⚡ 性能优化

* add memoization to optimize zoom performance ([1c7c4fc](https://github.com/cavin-works/cavin-tools/commit/1c7c4fc50c230ba0c9deb0fb9ee47472aee06e3f))



