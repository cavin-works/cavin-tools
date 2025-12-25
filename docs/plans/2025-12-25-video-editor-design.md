# 视频编辑应用设计方案

**日期**: 2025-12-25
**版本**: 1.0
**状态**: 设计阶段

## 项目概述

开发一款基于 Tauri + Rust 的桌面视频编辑应用,专注于视频变速、压缩、提取帧、截断和转GIF等核心功能。采用FFmpeg作为视频处理引擎,提供简洁专业的用户界面。

### 核心目标
- 轻量级(约50MB,相比Electron方案减少67%体积)
- 快速启动和高性能处理
- 简洁直观的用户界面
- 覆盖95%的主流视频处理场景

---

## 1. 技术栈

### 前端
- **框架**: React + TypeScript
- **样式**: TailwindCSS
- **状态管理**: Zustand(轻量级,适合单文件处理)
- **UI组件**: 可选 shadcn/ui 或 Chakra UI

### 后端
- **框架**: Tauri + Rust
- **视频处理**: FFmpeg(通过命令行调用)
- **异步运行时**: tokio

### 工具链
- **构建工具**: Tauri CLI
- **包管理**: npm(前端) + cargo(后端)
- **代码质量**: ESLint + Prettier + clippy

---

## 2. 整体架构

### 架构模式
采用**分层架构**,分为三层:

```
┌─────────────────────────────────┐
│         UI层 (React)             │
│  - 组件渲染                      │
│  - 用户交互                      │
│  - 状态展示                      │
└─────────────────────────────────┘
           ↕ Tauri IPC
┌─────────────────────────────────┐
│      业务逻辑层 (Rust)           │
│  - FFmpeg命令封装               │
│  - 参数验证                      │
│  - 进度管理                      │
└─────────────────────────────────┘
           ↕
┌─────────────────────────────────┐
│         数据层                   │
│  - 临时文件管理                  │
│  - 配置存储                      │
│  - 操作历史                      │
└─────────────────────────────────┘
```

### 项目结构
```
video-editor/
├── src-tauri/                # Rust后端
│   ├── src/
│   │   ├── ffmpeg/           # FFmpeg操作封装
│   │   │   ├── mod.rs
│   │   │   ├── compress.rs
│   │   │   ├── speed.rs
│   │   │   ├── extract.rs
│   │   │   ├── trim.rs
│   │   │   └── gif.rs
│   │   ├── commands/         # Tauri命令
│   │   │   ├── mod.rs
│   │   │   ├── video.rs
│   │   │   └── system.rs
│   │   ├── utils/            # 工具函数
│   │   │   ├── mod.rs
│   │   │   ├── validation.rs
│   │   │   └── progress.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── ffmpeg/               # FFmpeg二进制文件
├── src/                      # React前端
│   ├── components/           # UI组件
│   │   ├── Timeline/
│   │   ├── VideoInfo/
│   │   ├── ControlPanel/
│   │   └── ProgressBar/
│   ├── pages/                # 页面
│   │   ├── Editor.tsx
│   │   └── Settings.tsx
│   ├── store/                # Zustand状态管理
│   │   └── videoStore.ts
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── resources/                # 静态资源
│   └── icons/
├── docs/
│   └── plans/
├── package.json
└── README.md
```

---

## 3. 核心功能模块

### 3.1 视频加载模块

**功能**:
- 拖拽或点击选择视频文件
- 文件格式验证(MP4/MOV/AVI/WMV等主流格式)
- 元数据提取(时长、分辨率、编码器、比特率)
- 生成关键帧缩略图

**技术实现**:
```typescript
// 前端: 文件选择和验证
const handleFileSelect = async (file: File) => {
  if (!isValidVideoFormat(file.name)) {
    showError('不支持的文件格式');
    return;
  }

  const videoInfo = await invoke<VideoInfo>('get_video_info', {
    path: file.path
  });

  updateStore({ currentVideo: videoInfo });
};
```

```rust
// 后端: 提取视频元数据
#[tauri::command]
async fn get_video_info(path: String) -> Result<VideoInfo, String> {
    let output = Command::new("ffmpeg")
        .args(["-i", &path])
        .output()
        .map_err(|e| e.to_string())?;

    // 解析FFmpeg输出获取元数据
    parse_video_metadata(&output.stderr)
}
```

### 3.2 时间轴组件

**设计要点**:
- 简化单轨道设计(不涉及多轨道复杂性)
- 可视化显示完整视频长度
- 支持拖拽选择裁剪区域
- 显示时间刻度(支持缩放)
- 当前播放位置标记

**交互方式**:
1. 拖拽滑块快速定位
2. 拖拽选择区域设置开始/结束时间
3. 点击设置精确时间点
4. 滚轮缩放调整精度

**数据结构**:
```typescript
interface TimelineState {
  duration: number;        // 总时长(秒)
  startTime: number;       // 选择开始时间
  endTime: number;         // 选择结束时间
  currentTime: number;     // 当前播放位置
  zoomLevel: number;       // 缩放级别(像素/秒)
}
```

### 3.3 视频变速模块

**功能**:
- 速度范围: 0.25x - 4x
- 滑块快速选择 + 精确输入
- 音视频同步处理
- 可选保持音高(避免声音变调)

**FFmpeg实现**:
```bash
# 视频变速: 使用setpts滤镜
ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" output.mp4

# 音频变速: 使用atempo滤镜
ffmpeg -i input.mp4 -filter:a "atempo=2.0" output.mp4

# 音视频同步变速
ffmpeg -i input.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" output.mp4
```

**参数控制**:
```typescript
interface SpeedParams {
  speed: number;           // 速度倍数(0.25-4.0)
  preservePitch: boolean;  // 是否保持音高
}
```

### 3.4 视频压缩模块

**智能预设**:

| 预设名称 | 分辨率 | 比特率 | 用途 |
|---------|-------|--------|------|
| 手机优化 | 720p | 1-2 Mbps | 手机存储和播放 |
| 网络分享 | 480p | 500Kbps-1Mbps | 快速分享到社交网络 |
| 高质量 | 1080p | 原比特率80% | 保持高质量,减小文件 |
| 自定义 | 用户指定 | 用户指定 | 完全控制 |

**高级参数**:
- 分辨率调整(宽度/高度/保持比例)
- 比特率模式(CBR/VBR)
- 帧率调整(24/30/60fps)
- 编码器选择(H.264/H.265/VP9)
- CRF值调整(0-51,数值越小质量越高)
- 音频比特率

**FFmpeg示例**:
```bash
# 高质量压缩(H.264 + CRF)
ffmpeg -i input.mp4 -vcodec libx264 -crf 23 -preset medium output.mp4

# 分辨率调整
ffmpeg -i input.mp4 -vf "scale=-1:720" output.mp4

# 比特率控制
ffmpeg -i input.mp4 -b:v 1M -maxrate 1.5M -bufsize 2M output.mp4
```

### 3.5 提取帧模块

**提取模式**:

1. **单帧提取**: 提取当前时间点的一帧
2. **间隔提取**: 每N秒提取一帧
3. **均匀提取**: 从视频中均匀提取N帧

**输出选项**:
- 格式: JPG/PNG/WebP
- 图片质量调整
- 批量打包为ZIP

**FFmpeg命令**:
```bash
# 提取单帧
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 frame.jpg

# 每秒提取一帧
ffmpeg -i input.mp4 -vf "fps=1" frame_%04d.jpg

# 提取100帧(均匀分布)
ffmpeg -i input.mp4 -vf "select='eq(n,0)+gt(mod(n,100),99)'" -vsync 0 frame_%04d.jpg
```

### 3.6 截断视频模块

**裁剪模式**:

1. **精确截断**: 按时间码精确裁剪,重新编码
2. **关键帧对齐**: 按GOP对齐,无需重新编码(速度快)

**与时间轴集成**:
- 直接使用时间轴选择的区域
- 支持手动输入时间码
- 实时显示裁剪时长

**FFmpeg命令**:
```bash
# 精确截断(重新编码)
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c:v libx264 -c:a aac output.mp4

# 关键帧对齐(流复制,快速)
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c copy output.mp4

# 高精度截断(包含关键帧)
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c:v libx264 -preset ultrafast -crf 18 output.mp4
```

### 3.7 转GIF模块

**参数控制**:
- 时间范围选择(基于时间轴)
- 帧率调整(降低帧率减小文件)
- 尺寸调整(建议320-640px宽)
- 颜色优化(256色或更少)
- 循环次数设置

**智能建议**:
根据时长自动推荐参数:
- < 3秒: 保持原帧率和尺寸
- 3-10秒: 降低帧率到15fps
- > 10秒: 降低帧率到10fps,限制尺寸

**FFmpeg命令**:
```bash
# 转GIF(带调色板优化)
ffmpeg -i input.mp4 -vf "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif

# 简单转GIF(质量较低)
ffmpeg -i input.mp4 -vf "fps=10,scale=320:-1" output.gif
```

---

## 4. 用户界面设计

### 主界面布局

```
┌─────────────────────────────────────────────────┐
│  文件  编辑  设置           [导入视频] [帮助]    │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐    视频信息                │
│  │                 │    时长: 02:30             │
│  │   视频预览      │    分辨率: 1920x1080       │
│  │                 │    编码器: H.264           │
│  └─────────────────┘    文件大小: 150MB         │
├─────────────────────────────────────────────────┤
│  时间轴                                          │
│  ┌───────────────────────────────────────────┐  │
│  │ 0:00 [════════════════════════════] 2:30  │  │
│  │      [────────选择区域────────]            │  │
│  └───────────────────────────────────────────┘  │
│  开始: 0:30  结束: 1:45  当前: 0:45             │
├───────────────────┬─────────────────────────────┤
│                   │  操作面板                    │
│                   │  ┌─────────────────────┐    │
│                   │  │ [变速][压缩][帧]... │    │
│                   │  ├─────────────────────┤    │
│                   │  │                     │    │
│                   │  │  参数控制区          │    │
│                   │  │  (根据功能动态显示)  │    │
│                   │  │                     │    │
│                   │  │  [应用操作]         │    │
│                   │  └─────────────────────┘    │
├───────────────────┴─────────────────────────────┤
│  进度: ████████░░░░░░░░ 45%  正在压缩...        │
└─────────────────────────────────────────────────┘
```

### 用户交互流程

```
1. 导入视频
   ├─ 拖拽文件到窗口
   └─ 或点击"导入视频"按钮
   ↓
2. 自动加载到时间轴
   └─ 显示视频信息和缩略图
   ↓
3. 选择操作(可选步骤)
   ├─ 在时间轴上选择区域
   └─ 或直接对整个视频操作
   ↓
4. 选择功能 + 调整参数
   ├─ 右侧面板选择功能标签
   └─ 根据需求调整参数
   ↓
5. 点击"应用"
   ├─ 显示进度条
   └─ 显示实时状态
   ↓
6. 处理完成
   ├─ 显示结果预览
   ├─ 提供保存位置
   └─ 可选: 继续编辑或导出
```

### UI组件设计

**时间轴组件**:
```typescript
<Timeline
  duration={videoInfo.duration}
  startTime={timelineStart}
  endTime={timelineEnd}
  currentTime={currentTime}
  onRegionChange={handleRegionChange}
  onSeek={handleSeek}
  zoomLevel={zoomLevel}
/>
```

**控制面板**:
```typescript
<ControlPanel>
  <Tabs>
    <Tab label="变速">
      <SpeedControl
        value={speed}
        onChange={setSpeed}
        preservePitch={preservePitch}
      />
    </Tab>
    <Tab label="压缩">
      <CompressControl
        preset={preset}
        advancedParams={params}
      />
    </Tab>
    <!-- 其他功能标签 -->
  </Tabs>
</ControlPanel>
```

---

## 5. 数据流与状态管理

### Zustand Store设计

```typescript
interface VideoStore {
  // 当前视频信息
  currentVideo: VideoInfo | null;
  setCurrentVideo: (video: VideoInfo | null) => void;

  // 时间轴状态
  timelineStart: number;
  timelineEnd: number;
  currentTime: number;
  setTimelineRegion: (start: number, end: number) => void;
  setCurrentTime: (time: number) => void;

  // 处理状态
  isProcessing: boolean;
  progress: number;
  currentOperation: string;
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number) => void;
  setOperation: (operation: string) => void;

  // 历史记录
  history: Operation[];
  addHistory: (operation: Operation) => void;

  // 错误处理
  error: string | null;
  setError: (error: string | null) => void;
}

const useVideoStore = create<VideoStore>((set) => ({
  // 初始状态和实现
}));
```

### 典型操作流程(视频压缩)

```typescript
// 1. 前端: 用户选择压缩预设
const handleCompress = async (preset: CompressPreset) => {
  // 2. 参数验证
  if (!currentVideo) {
    showError('请先导入视频');
    return;
  }

  // 3. 更新状态
  setProcessing(true);
  setOperation('compress');

  try {
    // 4. 调用Tauri命令
    const outputPath = await invoke('compress_video', {
      inputPath: currentVideo.path,
      params: preset.params
    });

    // 5. 处理成功
    showSuccess(`压缩完成: ${outputPath}`);
    addHistory({
      type: 'compress',
      inputPath: currentVideo.path,
      outputPath,
      timestamp: Date.now()
    });
  } catch (error) {
    // 6. 错误处理
    showError(error.message);
  } finally {
    setProcessing(false);
  }
};
```

```rust
// 后端: Rust压缩处理
#[tauri::command]
async fn compress_video(
    input_path: String,
    params: CompressParams,
    window: Window
) -> Result<String, String> {
    // 1. 参数验证
    validate_path(&input_path)?;

    // 2. 生成输出路径
    let output_path = generate_output_path(&input_path, "_compressed");

    // 3. 构建FFmpeg命令
    let cmd = build_compress_command(&input_path, &output_path, &params);

    // 4. 执行命令(带进度监听)
    execute_with_progress(cmd, &window).await?;

    // 5. 返回结果
    Ok(output_path)
}
```

---

## 6. 错误处理

### 分层错误处理策略

#### 6.1 前端验证(第一道防线)

```typescript
// 文件格式验证
const isValidVideoFormat = (filename: string): boolean => {
  const validExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.mkv', '.flv'];
  return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// 参数范围验证
const validateCompressParams = (params: CompressParams): ValidationResult => {
  if (params.bitrate && params.bitrate < 100) {
    return { valid: false, error: '比特率不能低于100Kbps' };
  }

  if (params.resolution && params.resolution.width > 4096) {
    return { valid: false, error: '分辨率宽度不能超过4096px' };
  }

  return { valid: true };
};
```

#### 6.2 Rust后端验证(第二道防线)

```rust
// 路径验证
fn validate_path(path: &str) -> Result<(), String> {
    let path = Path::new(path);

    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    if !path.is_file() {
        return Err("路径不是文件".to_string());
    }

    // 检查文件扩展名
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) if VALID_EXTENSIONS.contains(&ext) => Ok(()),
        _ => Err("不支持的文件格式".to_string()),
    }
}

// 磁盘空间检查
fn check_disk_space(path: &Path, required_size: u64) -> Result<(), String> {
    let space = get_available_disk_space(path)?;
    if space < required_size * 2 {
        // 需要2倍空间(临时文件 + 输出文件)
        Err("磁盘空间不足".to_string())
    } else {
        Ok(())
    }
}
```

#### 6.3 FFmpeg错误处理

```rust
// 解析FFmpeg错误并转换为友好提示
fn parse_ffmpeg_error(stderr: &str) -> String {
    if stderr.contains("Invalid data found when processing input") {
        return "视频文件可能已损坏,请尝试其他文件".to_string();
    }

    if stderr.contains("Unsupported codec") {
        return "该视频使用了不支持的编码器,建议先转换为H.264格式".to_string();
    }

    if stderr.contains("Permission denied") {
        return "没有文件访问权限,请检查文件是否被其他程序占用".to_string();
    }

    // 默认错误消息
    "处理失败,请检查视频文件是否正常".to_string()
}
```

#### 6.4 用户友好的错误展示

```typescript
// Toast通知
const showError = (message: string, suggestions?: string[]) => {
  toast.error({
    title: '操作失败',
    message,
    suggestions: suggestions || [
      '请检查文件格式是否正确',
      '尝试关闭其他可能占用文件的程序',
      '查看帮助文档获取更多信息'
    ],
    duration: 5000
  });
};

// 示例: 显示带建议的错误
showError('磁盘空间不足', [
  '清理磁盘后重试',
  '选择更低的压缩质量',
  '更改输出保存位置'
]);
```

### 进度反馈机制

```rust
// FFmpeg进度解析
fn parse_progress(line: &str) -> Option<f64> {
    // FFmpeg输出格式: out_time_ms=12345678
    if line.contains("out_time_ms") {
        let time_str = line.split("out_time_ms=").nth(1)?;
        let time_ms: f64 = time_str.trim().parse().ok()?;
        Some(time_ms)
    } else {
        None
    }
}

// 发送进度到前端
async fn execute_with_progress(
    cmd: Command,
    window: &Window
) -> Result<(), String> {
    let total_duration = get_video_duration(&cmd.input_path)?;

    let child = cmd.spawn()?;

    // 读取FFmpeg输出
    let reader = BufReader::new(child.stdout);
    for line in reader.lines() {
        if let Some(current_time) = parse_progress(&line?) {
            let progress = (current_time / total_duration) * 100.0;

            // 发送到前端
            window.emit("progress", progress)?;
        }
    }

    Ok(())
}
```

```typescript
// 前端监听进度
useEffect(() => {
  const unlisten = listen('progress', (event: ProgressEvent) => {
    setProgress(event.payload);
  });

  return () => {
    unlisten.then(fn => fn());
  };
}, []);
```

---

## 7. 性能优化

### 7.1 FFmpeg优化

**硬件加速**:
```rust
// 自动检测并使用GPU编码
fn get_hardware_encoder() -> &'static str {
    if cfg!(target_os = "windows") {
        // Windows: 优先使用QSV(Intel)或NVENC(NVIDIA)
        "h264_qsv"  // 或 "h264_nvenc"
    } else if cfg!(target_os = "macos") {
        // macOS: 使用VideoToolbox
        "h264_videotoolbox"
    } else {
        // Linux: 尝试VA-API
        "h264_vaapi"
    }
}
```

**预设选择**:
```bash
# 平衡速度和质量
ffmpeg -i input.mp4 -preset medium -crf 23 output.mp4

# 快速处理(适合预览)
ffmpeg -i input.mp4 -preset fast -crf 28 output.mp4

# 最佳质量(处理慢)
ffmpeg -i input.mp4 -preset slow -crf 18 output.mp4
```

**多线程优化**:
```bash
# FFmpeg默认使用多线程,可以显式设置
ffmpeg -threads 0 -i input.mp4 ...  # 0=自动检测CPU核心数
```

### 7.2 前端优化

**缩略图懒加载**:
```typescript
const ThumbnailGrid = () => {
  const [visibleThumbnails, setVisible] = useState(new Set());

  // 使用IntersectionObserver检测可见区域
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = entry.target.dataset.index;
          setVisible(prev => new Set([...prev, index]));
        }
      });
    }, { threshold: 0.1 });

    // 观察所有缩略图容器
    document.querySelectorAll('[data-thumbnail]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return <div>{/* 渲染可见缩略图 */}</div>;
};
```

**防抖处理**:
```typescript
import { debounce } from 'lodash';

// 滑块输入防抖
const handleSpeedChange = debounce((value: number) => {
  updateSpeed(value);
}, 300); // 300ms防抖
```

**WebWorker**:
```typescript
// 在Worker中执行耗时操作
const worker = new Worker('metadata-worker.js');

worker.postMessage({ type: 'extract_metadata', path: videoPath });

worker.onmessage = (event) => {
  const metadata = event.data;
  updateVideoInfo(metadata);
};
```

### 7.3 Rust优化

**异步运行时**:
```rust
#[tokio::main]
async fn main() {
    // 使用tokio处理并发任务
    let (compress_task, extract_task) = tokio::join!(
        compress_video(path1, params1),
        extract_frames(path2, params2)
    );
}
```

**零拷贝**:
```rust
// 避免不必要的字符串复制
fn parse_metadata(output: &str) -> VideoInfo {
    // 直接借用,不复制
    let lines: Vec<&str> = output.lines().collect();
    // ...
}
```

**FFmpeg进程池**(批量处理):
```rust
struct FFmpegPool {
    processes: Vec<Child>,
}

impl FFmpegPool {
    fn new(size: usize) -> Self {
        Self {
            processes: Vec::with_capacity(size),
        }
    }

    async fn execute(&mut self, cmd: Command) -> Result<(), String> {
        // 复用进程或创建新进程
        // ...
    }
}
```

---

## 8. 测试策略

### 8.1 单元测试

**Rust测试**:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_path() {
        assert!(validate_path("test.mp4").is_ok());
        assert!(validate_path("test.txt").is_err());
    }

    #[test]
    fn test_build_compress_command() {
        let cmd = build_compress_command(
            "input.mp4",
            "output.mp4",
            &CompressParams::default()
        );

        assert_eq!(cmd.get_program(), "ffmpeg");
        assert!(cmd.get_args().contains(&OsString::from("input.mp4")));
    }
}
```

**前端测试**:
```typescript
import { renderHook, act } from '@testing-library/react';
import { useVideoStore } from './videoStore';

test('setTimelineRegion updates timeline range', () => {
  const { result } = renderHook(() => useVideoStore());

  act(() => {
    result.current.setTimelineRegion(10, 50);
  });

  expect(result.current.timelineStart).toBe(10);
  expect(result.current.timelineEnd).toBe(50);
});
```

### 8.2 集成测试

```typescript
import { test, expect } from '@playwright/test';

test('完整工作流: 导入视频并压缩', async ({ page }) => {
  // 1. 打开应用
  await page.goto('/');

  // 2. 导入视频
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-assets/sample.mp4');

  // 3. 等待视频加载
  await expect(page.locator('[data-testid="video-info"]')).toBeVisible();

  // 4. 选择压缩功能
  await page.click('[data-testid="tab-compress"]');

  // 5. 选择预设
  await page.selectOption('[data-testid="compress-preset"]', 'mobile');

  // 6. 应用操作
  await page.click('[data-testid="apply-button"]');

  // 7. 等待完成
  await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('value', '100');

  // 8. 验证结果
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### 8.3 边界测试

```typescript
describe('边界情况测试', () => {
  test('超大文件(>4GB)', async () => {
    const result = await invoke('compress_video', {
      path: 'large-video.mp4'  // 5GB文件
    });
    expect(result).toBeDefined();
  });

  test('极短视频(<1秒)', async () => {
    const result = await invoke('compress_video', {
      path: 'tiny-video.mp4'  // 0.5秒
    });
    expect(result).toBeDefined();
  });

  test('特殊字符文件名', async () => {
    const result = await invoke('compress_video', {
      path: '视频(2024)-测试.mp4'
    });
    expect(result).toBeDefined();
  });
});
```

### 8.4 性能测试

```rust
#[bench]
fn bench_compress_1080p_1min(b: &mut Bencher) {
    b.iter(|| {
        compress_video("test-1080p-1min.mp4", &CompressParams::default())
    });
}
```

---

## 9. 安全考虑

### 9.1 文件操作安全

```rust
// 路径验证,防止路径穿越攻击
fn validate_safe_path(path: &str, base_dir: &Path) -> Result<PathBuf, String> {
    let path = Path::new(path);

    // 解析为绝对路径
    let absolute = path.canonicalize()
        .map_err(|_| "无效的路径".to_string())?;

    // 检查是否在基础目录内
    if !absolute.starts_with(base_dir) {
        return Err("路径不安全: 尝试访问基础目录外的文件".to_string());
    }

    Ok(absolute)
}

// 文件名规范化
fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' { c } else { '_' })
        .collect()
}
```

### 9.2 临时文件管理

```rust
// 统一临时文件目录
fn get_temp_dir() -> PathBuf {
    std::env::temp_dir().join("video-editor")
}

// 应用退出时清理
fn cleanup_temp_files() {
    let temp_dir = get_temp_dir();
    if temp_dir.exists() {
        fs::remove_dir_all(temp_dir).ok();
    }
}

// Tauri应用退出处理
#[tauri::command]
async fn cleanup_on_exit() {
    cleanup_temp_files();
}
```

### 9.3 FFmpeg安全

```rust
// 禁用网络协议,防止SSRF
fn build_safe_command() -> Command {
    let mut cmd = Command::new("ffmpeg");

    // 禁用所有协议
    cmd.arg("-protocol_whitelist")
        .arg("file,pipe");

    cmd
}

// 限制输入文件大小(可选)
const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024 * 1024; // 10GB

fn validate_file_size(path: &Path) -> Result<(), String> {
    let metadata = fs::metadata(path)
        .map_err(|_| "无法读取文件信息".to_string())?;

    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!("文件过大(最大{}GB)", MAX_FILE_SIZE / 1_000_000_000));
    }

    Ok(())
}
```

---

## 10. 部署与分发

### 10.1 打包策略

**构建配置**(tauri.conf.json):
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "dmg", "appimage"],
    "icon": ["icons/icon.ico", "icons/icon.png"],
    "identifier": "com.videoeditor.app",
    "publisher": "VideoEditor",
    "category": "Video Editing",
    "shortDescription": "视频编辑工具",
    "longDescription": "专业的视频编辑工具,支持变速、压缩、提取帧等功能"
  }
}
```

**FFmpeg二进制集成**:
```
src-tauri/
├── ffmpeg/
│   ├── windows/ffmpeg.exe
│   ├── macos/ffmpeg
│   └── linux/ffmpeg
```

```rust
// 根据平台加载FFmpeg
fn get_ffmpeg_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    let path = "ffmpeg/windows/ffmpeg.exe";

    #[cfg(target_os = "macos")]
    let path = "ffmpeg/macos/ffmpeg";

    #[cfg(target_os = "linux")]
    let path = "ffmpeg/linux/ffmpeg";

    let mut exe_path = std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();

    exe_path.push(path);
    exe_path
}
```

### 10.2 更新机制

**Tauri内置更新器**:
```rust
// main.rs
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // 检查更新
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Some(update) = handle.updater().check().await.ok().flatten() {
                    // 发现新版本
                    update.download_and_install().await.ok();
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**更新服务器配置**:
- 使用GitHub Releases托管更新包
- 配置tauri updater指向releases
- 增量更新支持

### 10.3 安装体验

**Windows (MSI)**:
- 约50MB安装包(含FFmpeg)
- 默认安装路径: `C:\Users\<用户>\AppData\Local\Programs\VideoEditor`
- 桌面快捷方式
- 关联文件类型(.mp4, .mov等)

**macOS (DMG)**:
- 拖拽安装到Applications
- 约50MB DMG文件
- 代码签名和公证(避免Gatekeeper警告)

**Linux (AppImage)**:
- 单文件可执行程序
- 约60MB AppImage
- 无需安装,直接运行

### 10.4 用户文档

**内置帮助**:
```markdown
# 使用指南

## 快速开始

1. 导入视频: 拖拽视频文件到窗口
2. 选择功能: 在右侧面板选择需要的功能
3. 调整参数: 根据需求调整参数
4. 应用操作: 点击"应用"按钮

## 功能说明

### 视频变速
- 速度范围: 0.25x - 4x
- 建议慢动作使用0.25x-0.5x
- 快进使用2x-4x

### 视频压缩
- 手机优化: 适合手机存储和播放
- 网络分享: 适合快速分享到社交平台
- 高质量: 保持原视频质量

### 提取帧
- 单帧: 提取当前时间点的一帧
- 间隔: 每N秒提取一帧
- 均匀: 提取N帧均匀分布

## 常见问题

**Q: 为什么处理速度很慢?**
A: 视频处理需要大量计算,建议:
- 使用"快速"预设
- 启用硬件加速(设置中开启)
- 降低输出分辨率

**Q: 如何保持原视频质量?**
A:
- 压缩时选择"高质量"预设
- CRF值设置为18-23
- 使用H.265编码器(相同质量更小)

**Q: 支持哪些视频格式?**
A: 主流格式均支持:
- MP4, MOV, AVI, WMV, MKV, FLV
- 编码器: H.264, H.265, VP9
```

**视频教程**:
- 录制5-10个功能演示视频
- 托管到B站/YouTube
- 应用内提供链接

---

## 11. 开发计划

### 阶段1: 基础框架搭建(1-2周)
- [ ] 初始化Tauri + React项目
- [ ] 配置开发环境和构建工具
- [ ] 集成FFmpeg到Rust后端
- [ ] 实现基本的视频加载功能
- [ ] 实现元数据提取

### 阶段2: 核心功能开发(3-4周)
- [ ] 实现时间轴组件
- [ ] 实现视频变速功能
- [ ] 实现视频压缩功能
- [ ] 实现提取帧功能
- [ ] 实现截断视频功能
- [ ] 实现转GIF功能

### 阶段3: UI优化和完善(1-2周)
- [ ] 完善用户界面设计
- [ ] 实现进度反馈
- [ ] 实现错误处理和提示
- [ ] 添加键盘快捷键
- [ ] 性能优化

### 阶段4: 测试和修复(1周)
- [ ] 单元测试覆盖
- [ ] 集成测试
- [ ] 边界情况测试
- [ ] 性能测试
- [ ] Bug修复

### 阶段5: 打包和发布(1周)
- [ ] 配置打包流程
- [ ] 准备各平台安装包
- [ ] 配置自动更新
- [ ] 编写用户文档
- [ ] 发布到GitHub

---

## 12. 总结

本设计方案描述了一个基于Tauri + Rust + FFmpeg的桌面视频编辑应用,具有以下核心优势:

**技术优势**:
- 轻量级(约50MB,相比Electron减少67%)
- 快速启动(冷启动<2秒)
- 高性能(Rust异步处理 + FFmpeg硬件加速)
- 跨平台(Windows/macOS/Linux)

**功能聚焦**:
- 核心功能: 变速、压缩、提取帧、截断、转GIF
- 简洁专业界面
- 智能预设 + 高级控制
- 支持主流视频格式

**用户体验**:
- 拖拽导入视频
- 可视化时间轴
- 实时进度反馈
- 友好的错误提示

**可扩展性**:
- 模块化架构
- 清晰的代码组织
- 完善的测试覆盖
- 易于添加新功能

该方案平衡了功能完整性、开发复杂度和用户体验,适合作为专业视频编辑工具的实现基础。
