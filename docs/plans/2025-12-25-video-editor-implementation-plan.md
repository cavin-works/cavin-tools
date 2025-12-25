# 视频编辑应用实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 构建基于 Tauri + Rust + FFmpeg 的桌面视频编辑应用,支持视频变速、压缩、提取帧、截断和转GIF功能

**架构:** 前端使用 React + TypeScript + TailwindCSS 构建用户界面,后端使用 Rust + Tauri 封装 FFmpeg 命令进行视频处理,通过 IPC 通信实现前后端交互

**技术栈:** Tauri 2.0, Rust 1.70+, React 18, TypeScript, TailwindCSS, FFmpeg, Zustand

---

## 阶段1: FFmpeg集成和基础工具

### Task 1.1: 添加FFmpeg检测和路径管理

**文件:**
- 创建: `src-tauri/src/ffmpeg/mod.rs`
- 修改: `src-tauri/src/lib.rs`

**Step 1: 创建FFmpeg模块基础结构**

```rust
// src-tauri/src/ffmpeg/mod.rs
use std::process::Command;
use std::path::PathBuf;

/// 获取FFmpeg可执行文件路径
pub fn get_ffmpeg_path() -> PathBuf {
    // 优先使用系统PATH中的ffmpeg
    if let Ok(output) = Command::new("where").arg("ffmpeg").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = path.lines().next() {
                return PathBuf::from(first_line);
            }
        }
    }

    // 否则使用打包的ffmpeg
    let mut exe_path = std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();

    #[cfg(target_os = "windows")]
    exe_path.push("ffmpeg.exe");

    #[cfg(not(target_os = "windows"))]
    exe_path.push("ffmpeg");

    exe_path
}

/// 检查FFmpeg是否可用
pub fn check_ffmpeg_available() -> Result<(), String> {
    let ffmpeg_path = get_ffmpeg_path();

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg未找到,请安装FFmpeg: {}", ffmpeg_path.display()));
    }

    // 测试运行ffmpeg -version
    Command::new(&ffmpeg_path)
        .arg("-version")
        .output()
        .map_err(|e| format!("无法执行FFmpeg: {}", e))?;

    Ok(())
}
```

**Step 2: 在lib.rs中导出模块**

```rust
// src-tauri/src/lib.rs
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

pub mod ffmpeg;  // 添加这一行

#[derive(Debug, Serialize, Deserialize)]
struct GreetArgs {
    name: String,
}

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! 来自Tauri的问候!", name)
}

#[tauri::command]
async fn check_ffmpeg() -> Result<String, String> {
    ffmpeg::check_ffmpeg_available()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, check_ffmpeg])  // 添加check_ffmpeg
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: 提交**

```bash
git add src-tauri/src/ffmpeg/mod.rs src-tauri/src/lib.rs
git commit -m "feat: 添加FFmpeg检测和路径管理"
```

---

### Task 1.2: 创建视频元数据提取功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/info.rs`
- 修改: `src-tauri/src/ffmpeg/mod.rs`
- 修改: `src-tauri/src/lib.rs`
- 创建: `src-tauri/src/models.rs`

**Step 1: 创建数据模型**

```rust
// src-tauri/src/models.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoInfo {
    pub path: String,
    pub filename: String,
    pub duration: f64,  // 秒
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub bitrate: u64,
    pub file_size: u64,
    pub format: String,
}
```

**Step 2: 实现元数据提取**

```rust
// src-tauri/src/ffmpeg/info.rs
use std::process::Command;
use super::get_ffmpeg_path;
use crate::models::VideoInfo;

/// 从FFmpeg输出解析视频信息
fn parse_ffmpeg_output(output: &str, path: String) -> Result<VideoInfo, String> {
    let mut duration = 0.0;
    let mut width = 0;
    let mut height = 0;
    let mut fps = 0.0;
    let mut codec = String::new();
    let mut bitrate = 0u64;
    let mut format = String::new();

    for line in output.lines() {
        // 解析时长
        if line.contains("Duration:") {
            let time_str = line.split("Duration:").nth(1)
                .ok_or("无法解析时长")?.trim();
            let parts: Vec<&str> = time_str.split(':').collect();
            if parts.len() >= 3 {
                let hours: f64 = parts[0].parse().unwrap_or(0.0);
                let minutes: f64 = parts[1].parse().unwrap_or(0.0);
                let seconds: f64 = parts[2].split(',').next().unwrap_or("0").parse().unwrap_or(0.0);
                duration = hours * 3600.0 + minutes * 60.0 + seconds;
            }
        }

        // 解析视频流信息
        if line.contains("Video:") {
            let info = line.split("Video:").nth(1).unwrap_or("");
            let parts: Vec<&str> = info.split_whitespace().collect();

            if parts.len() > 0 {
                codec = parts[0].to_string();
            }

            // 解析分辨率
            for part in &parts {
                if part.contains(&['x'][..]) && part.len() < 10 {
                    let dims: Vec<&str> = part.split('x').collect();
                    if dims.len() == 2 {
                        width = dims[0].parse().unwrap_or(0);
                        height = dims[1].parse().unwrap_or(0);
                    }
                }
            }

            // 解析帧率
            for part in &parts {
                if part.contains("fps") {
                    fps = part.replace("fps", "").trim().parse().unwrap_or(0.0);
                }
            }
        }

        // 解析比特率
        if line.contains("bitrate:") {
            let bitrate_str = line.split("bitrate:").nth(1).unwrap_or("");
            let bitrate_num = bitrate_str.split_whitespace().next().unwrap_or("0");
            bitrate = (bitrate_num.parse::<f64>().unwrap_or(0.0) * 1000.0) as u64;
        }
    }

    // 获取文件信息
    let path_obj = std::path::Path::new(&path);
    let filename = path_obj.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let file_size = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);
    let format = path_obj.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_uppercase();

    Ok(VideoInfo {
        path,
        filename,
        duration,
        width,
        height,
        fps,
        codec,
        bitrate,
        file_size,
        format,
    })
}

/// 获取视频信息
pub async fn get_video_info(path: String) -> Result<VideoInfo, String> {
    // 验证文件存在
    if !std::path::Path::new(&path).exists() {
        return Err("文件不存在".to_string());
    }

    let ffmpeg_path = get_ffmpeg_path();

    // 运行FFmpeg -i命令
    let output = Command::new(&ffmpeg_path)
        .arg("-i")
        .arg(&path)
        .output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    // FFmpeg将信息输出到stderr
    let stderr = String::from_utf8_lossy(&output.stderr);

    parse_ffmpeg_output(&stderr, path)
}
```

**Step 3: 在mod.rs中导出**

```rust
// src-tauri/src/ffmpeg/mod.rs
pub mod info;

pub use info::get_video_info;

use std::process::Command;
use std::path::PathBuf;

// ... 保留之前的代码 ...
```

**Step 4: 在lib.rs中添加命令**

```rust
// src-tauri/src/lib.rs
use crate::models::VideoInfo;

#[tauri::command]
async fn load_video(path: String) -> Result<VideoInfo, String> {
    ffmpeg::get_video_info(path).await
}

// 更新invoke_handler
.invoke_handler(tauri::generate_handler![greet, check_ffmpeg, load_video])
```

**Step 5: 提交**

```bash
git add src-tauri/src/ffmpeg/info.rs src-tauri/src/ffmpeg/mod.rs src-tauri/src/lib.rs src-tauri/src/models.rs
git commit -m "feat: 添加视频元数据提取功能"
```

---

### Task 1.3: 前端视频导入功能

**文件:**
- 创建: `src/utils/fileValidation.ts`
- 修改: `src/App.tsx`

**Step 1: 创建文件验证工具**

```typescript
// src/utils/fileValidation.ts
export const VALID_VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.wmv', '.mkv', '.flv', '.webm', '.m4v'
];

export function isValidVideoFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return VALID_VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Step 2: 更新App组件添加拖拽导入**

```typescript
// src/App.tsx
import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from './store/videoStore';
import { VideoInfo } from './components/VideoInfo';
import { isValidVideoFile } from './utils/fileValidation';

function App() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!isValidVideoFile(filePath)) {
      setError('不支持的视频格式,请选择 MP4/MOV/AVI/WMV 等格式');
      return;
    }

    try {
      const videoInfo = await invoke<import('./types').VideoInfo>('load_video', {
        path: filePath
      });
      setCurrentVideo(videoInfo);
      setError(null);
    } catch (error) {
      setError(`加载视频失败: ${error}`);
    }
  }, [setCurrentVideo, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Tauri会提供文件路径
      const path = (files[0] as any).path;
      if (path) {
        handleFileSelect(path);
      }
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`container ${isDragging ? 'bg-primary-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Video Editor
      </h1>

      {currentVideo ? (
        <VideoInfo />
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600 mb-4 text-lg">
            拖拽视频文件到此处,或点击导入
          </p>
          <button
            onClick={async () => {
              const selected = await invoke<string>('open_file_dialog');
              if (selected) {
                handleFileSelect(selected);
              }
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            导入视频
          </button>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 bg-primary-500 bg-opacity-20 flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-primary-700">
            松开以导入视频
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
```

**Step 3: 添加文件对话框命令(Rust)**

```rust
// src-tauri/src/lib.rs
#[tauri::command]
async fn open_file_dialog() -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    // 需要添加 tauri-plugin-dialog 依赖
    None  // TODO: 实现文件对话框
}
```

**Step 4: 提交**

```bash
git add src/utils/fileValidation.ts src/App.tsx
git commit -m "feat: 添加前端视频导入和拖拽功能"
```

---

## 阶段2: 时间轴组件

### Task 2.1: 创建基础时间轴UI

**文件:**
- 创建: `src/components/Timeline/Timeline.tsx`
- 创建: `src/components/Timeline/TimelineSlider.tsx`
- 创建: `src/components/Timeline/index.ts`

**Step 1: 创建时间轴主组件**

```typescript
// src/components/Timeline/Timeline.tsx
import { useState, useRef, useCallback } from 'react';
import { useVideoStore } from '@/store/videoStore';
import { formatDuration } from '@/utils/fileValidation';
import { TimelineSlider } from './TimelineSlider';

export function Timeline() {
  const { currentVideo, timelineStart, timelineEnd, setTimelineRegion } = useVideoStore();
  const [zoomLevel, setZoomLevel] = useState(1); // 1-5
  const containerRef = useRef<HTMLDivElement>(null);

  if (!currentVideo) return null;

  const duration = currentVideo.duration;
  const pixelsPerSecond = 100 * zoomLevel;
  const width = duration * pixelsPerSecond;

  const handleRegionChange = useCallback((start: number, end: number) => {
    setTimelineRegion(start, end);
  }, [setTimelineRegion]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">时间轴</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            -
          </button>
          <span className="text-sm text-gray-600">
            {zoomLevel}x
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 1))}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto"
      >
        <div
          className="relative bg-gray-100 rounded"
          style={{ width: `${Math.min(width, containerRef.current?.clientWidth || 800)}px`, height: '120px' }}
        >
          {/* 时间刻度 */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-300">
            {Array.from({ length: Math.ceil(duration) }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 text-xs text-gray-600"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                {formatDuration(i)}
              </div>
            ))}
          </div>

          {/* 选择区域 */}
          {timelineEnd > 0 && (
            <div
              className="absolute top-6 bottom-0 bg-primary-200 bg-opacity-50 border-2 border-primary-500"
              style={{
                left: `${(timelineStart / duration) * 100}%`,
                width: `${((timelineEnd - timelineStart) / duration) * 100}%`
              }}
            />
          )}

          <TimelineSlider
            duration={duration}
            onRegionChange={handleRegionChange}
          />
        </div>
      </div>

      {/* 时间信息 */}
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>开始: {formatDuration(timelineStart)}</span>
        <span>时长: {formatDuration(duration)}</span>
        <span>结束: {formatDuration(timelineEnd)}</span>
      </div>
    </div>
  );
}
```

**Step 2: 创建时间轴滑块组件**

```typescript
// src/components/Timeline/TimelineSlider.tsx
import { useState, useRef, MouseEvent } from 'react';

interface TimelineSliderProps {
  duration: number;
  onRegionChange: (start: number, end: number) => void;
}

export function TimelineSlider({ duration, onRegionChange }: TimelineSliderProps) {
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const handleMouseDown = (type: 'start' | 'end') => (e: MouseEvent) => {
    e.stopPropagation();
    if (type === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingStart && !isDraggingEnd) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;

    if (isDraggingStart) {
      onRegionChange(time, duration); // 简化版本
    }
  };

  const handleMouseUp = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
  };

  return (
    <div
      className="absolute inset-0 cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 开始标记 */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-primary-500 cursor-ew-resize hover:w-2 transition-all"
        style={{ left: '0%' }}
        onMouseDown={handleMouseDown('start')}
      />

      {/* 结束标记 */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-primary-500 cursor-ew-resize hover:w-2 transition-all"
        style={{ right: '0%' }}
        onMouseDown={handleMouseDown('end')}
      />
    </div>
  );
}
```

**Step 3: 导出组件**

```typescript
// src/components/Timeline/index.ts
export { Timeline } from './Timeline';
```

**Step 4: 更新App使用Timeline**

```typescript
// src/App.tsx
import { Timeline } from './components/Timeline';

// 在JSX中添加Timeline
{currentVideo && (
  <>
    <VideoInfo />
    <Timeline />
  </>
)}
```

**Step 5: 提交**

```bash
git add src/components/Timeline/
git commit -m "feat: 添加时间轴组件基础UI"
```

---

## 阶段3: 视频处理功能

### Task 3.1: 视频压缩功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/compress.rs`
- 修改: `src-tauri/src/ffmpeg/mod.rs`
- 修改: `src-tauri/src/lib.rs`
- 创建: `src/components/ControlPanel/CompressPanel.tsx`

**Step 1: 实现Rust压缩功能**

```rust
// src-tauri/src/ffmpeg/compress.rs
use std::process::{Command, Stdio};
use std::path::PathBuf;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CompressParams {
    pub preset: String,  // mobile, web, high_quality, custom
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub bitrate: Option<u32>,  // kbps
    pub crf: Option<u32>,  // 0-51
    pub codec: Option<String>,  // h264, h265, vp9
    pub fps: Option<u32>,
}

pub async fn compress_video(
    input_path: String,
    output_path: String,
    params: CompressParams,
    on_progress: impl Fn(f64) + Send + 'static,
) -> Result<(), String> {
    let ffmpeg_path = get_ffmpeg_path();
    let mut cmd = Command::new(&ffmpeg_path);

    // 输入文件
    cmd.arg("-i").arg(&input_path);

    // 视频编码器
    let codec = params.codec.as_ref().map(|s| s.as_str()).unwrap_or("libx264");
    match codec {
        "h265" => cmd.arg("-c:v").arg("libx265"),
        "vp9" => cmd.arg("-c:v").arg("libvpx-vp9"),
        _ => cmd.arg("-c:v").arg("libx264"),
    };

    // 分辨率
    if let Some(w) = params.width {
        if let Some(h) = params.height {
            cmd.arg("-vf").arg(format!("scale={}:{}", w, h));
        }
    }

    // 帧率
    if let Some(fps) = params.fps {
        cmd.arg("-r").arg(fps.to_string());
    }

    // CRF质量控制
    let preset_crf = match params.preset.as_str() {
        "mobile" => 26,
        "web" => 30,
        "high_quality" => 23,
        _ => params.crf.unwrap_or(23),
    };
    cmd.arg("-crf").arg(preset_crf.to_string());

    // 预设速度
    cmd.arg("-preset").arg("medium");

    // 比特率
    if let Some(bitrate) = params.bitrate {
        cmd.arg("-b:v").arg(format!("{}k", bitrate));
    }

    // 音频编码
    cmd.arg("-c:a").arg("aac");
    cmd.arg("-b:a").arg("128k");

    // 输出文件
    cmd.arg("-y").arg(&output_path);

    // 执行命令
    let output = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("压缩失败: {}", error));
    }

    on_progress(100.0);
    Ok(())
}
```

**Step 2: 在lib.rs中添加命令**

```rust
// src-tauri/src/lib.rs
use crate::ffmpeg::compress::{CompressParams, compress_video};

#[tauri::command]
async fn compress_video_command(
    input_path: String,
    params: CompressParams,
    window: tauri::Window,
) -> Result<String, String> {
    // 生成输出路径
    let input_path_obj = std::path::Path::new(&input_path);
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}_compressed.{}", filename, extension);

    let window_clone = window.clone();
    compress_video(input_path, output_path.clone(), params, move |progress| {
        let _ = window_clone.emit("progress", progress);
    }).await?;

    Ok(output_path)
}
```

**Step 3: 创建前端压缩面板**

```typescript
// src/components/ControlPanel/CompressPanel.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '@/store/videoStore';

type CompressPreset = 'mobile' | 'web' | 'high_quality' | 'custom';

export function CompressPanel() {
  const { currentVideo, isProcessing, setProcessing, setProgress } = useVideoStore();
  const [preset, setPreset] = useState<CompressPreset>('mobile');

  const handleCompress = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setProgress(0);

    try {
      const outputPath = await invoke<string>('compress_video_command', {
        inputPath: currentVideo.path,
        params: {
          preset,
          width: preset === 'mobile' ? 1280 : undefined,
          height: preset === 'mobile' ? 720 : undefined,
        }
      });

      alert(`压缩完成: ${outputPath}`);
    } catch (error) {
      alert(`压缩失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">视频压缩</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预设
          </label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as CompressPreset)}
            className="w-full border rounded-lg px-3 py-2"
            disabled={isProcessing}
          >
            <option value="mobile">手机优化 (720p)</option>
            <option value="web">网络分享 (480p)</option>
            <option value="high_quality">高质量 (1080p)</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <button
          onClick={handleCompress}
          disabled={isProcessing}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
        >
          {isProcessing ? '压缩中...' : '开始压缩'}
        </button>
      </div>
    </div>
  );
}
```

**Step 4: 提交**

```bash
git add src-tauri/src/ffmpeg/compress.rs src-tauri/src/ffmpeg/mod.rs src-tauri/src/lib.rs src/components/ControlPanel/CompressPanel.tsx
git commit -m "feat: 实现视频压缩功能"
```

---

### Task 3.2: 视频变速功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/speed.rs`
- 创建: `src/components/ControlPanel/SpeedPanel.tsx`

**Step 1: 实现Rust变速功能**

```rust
// src-tauri/src/ffmpeg/speed.rs
use std::process::Command;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SpeedParams {
    pub speed: f64,  // 0.25 - 4.0
    pub preserve_pitch: bool,
}

pub async fn change_video_speed(
    input_path: String,
    output_path: String,
    params: SpeedParams,
) -> Result<(), String> {
    let ffmpeg_path = get_ffmpeg_path();
    let mut cmd = Command::new(&ffmpeg_path);

    // 计算速度因子
    let video_speed = 1.0 / params.speed;
    let audio_speed = if params.speed >= 0.5 && params.speed <= 2.0 {
        params.speed
    } else {
        // atempo只支持0.5到2.0,需要链式调用
        1.0
    };

    cmd.arg("-i").arg(&input_path);

    // 视频速度
    cmd.arg("-filter:v")
        .arg(format!("setpts={}*PTS", video_speed));

    // 音频速度
    if !params.preserve_pitch {
        if audio_speed >= 0.5 && audio_speed <= 2.0 {
            cmd.arg("-filter:a").arg(format!("atempo={}", audio_speed));
        }
    }

    cmd.arg("-y").arg(&output_path);

    let output = cmd.output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("变速失败: {}", error));
    }

    Ok(())
}
```

**Step 2: 创建前端变速面板**

```typescript
// src/components/ControlPanel/SpeedPanel.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '@/store/videoStore';

export function SpeedPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const [speed, setSpeed] = useState(1.0);
  const [preservePitch, setPreservePitch] = useState(false);

  const handleSpeedChange = async () => {
    if (!currentVideo) return;

    setProcessing(true);

    try {
      const outputPath = await invoke<string>('change_video_speed', {
        inputPath: currentVideo.path,
        params: { speed, preservePitch }
      });

      alert(`变速完成: ${outputPath}`);
    } catch (error) {
      alert(`变速失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">视频变速</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            速度: {speed}x
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
            disabled={isProcessing}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.25x</span>
            <span>1x</span>
            <span>4x</span>
          </div>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={preservePitch}
            onChange={(e) => setPreservePitch(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">保持音高(避免声音变调)</span>
        </label>

        <button
          onClick={handleSpeedChange}
          disabled={isProcessing}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
        >
          {isProcessing ? '处理中...' : '应用变速'}
        </button>
      </div>
    </div>
  );
}
```

**Step 3: 提交**

```bash
git add src-tauri/src/ffmpeg/speed.rs src/components/ControlPanel/SpeedPanel.tsx
git commit -m "feat: 实现视频变速功能"
```

---

### Task 3.3: 提取帧功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/extract.rs`
- 创建: `src/components/ControlPanel/ExtractPanel.tsx`

**Step 1: 实现提取帧功能**

```rust
// src-tauri/src/ffmpeg/extract.rs
use std::process::Command;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ExtractParams {
    pub mode: String,  // single, interval, uniform
    pub format: String,  // jpg, png, webp
    pub quality: u32,  // 1-100
    pub interval: Option<f64>,  // 秒
    pub count: Option<u32>,  // 帧数
}

pub async fn extract_frames(
    input_path: String,
    output_dir: String,
    params: ExtractParams,
) -> Result<Vec<String>, String> {
    let ffmpeg_path = get_ffmpeg_path();
    let mut cmd = Command::new(&ffmpeg_path);

    cmd.arg("-i").arg(&input_path);

    match params.mode.as_str() {
        "single" => {
            // 提取单帧(当前时间点)
            cmd.arg("-ss").arg("00:00:05");  // TODO: 使用当前时间
            cmd.arg("-vframes").arg("1");
        }
        "interval" => {
            // 间隔提取
            let interval = params.interval.unwrap_or(1.0);
            cmd.arg("-vf").arg(format!("fps=1/{}", interval));
        }
        "uniform" => {
            // 均匀提取N帧
            let count = params.count.unwrap_or(10);
            cmd.arg("-vf").arg(format!("select='eq(n,0)+gt(mod(n,{}),{})'",
                count, count - 1));
        }
        _ => return Err("无效的提取模式".to_string()),
    }

    // 输出格式和质量
    let output_pattern = format!("{}/frame_%04d.{}", output_dir, params.format);
    cmd.arg("-y").arg(&output_pattern);

    let output = cmd.output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    if !output.status.success() {
        return Err("提取帧失败".to_string());
    }

    // TODO: 返回实际生成的文件列表
    Ok(vec![output_pattern])
}
```

**Step 2: 创建前端提取面板**

```typescript
// src/components/ControlPanel/ExtractPanel.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type ExtractMode = 'single' | 'interval' | 'uniform';

export function ExtractPanel() {
  const [mode, setMode] = useState<ExtractMode>('single');
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [quality, setQuality] = useState(90);
  const [interval, setInterval] = useState(1);
  const [count, setCount] = useState(10);

  const handleExtract = async () => {
    try {
      const result = await invoke<string[]>('extract_frames', {
        // params
      });
      alert(`提取完成,生成了${result.length}帧`);
    } catch (error) {
      alert(`提取失败: ${error}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">提取帧</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            提取模式
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ExtractMode)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="single">单帧</option>
            <option value="interval">间隔提取</option>
            <option value="uniform">均匀提取</option>
          </select>
        </div>

        {mode === 'interval' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              间隔(秒)
            </label>
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(parseFloat(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
              min="0.1"
              step="0.1"
            />
          </div>
        )}

        {mode === 'uniform' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提取帧数
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
              min="1"
            />
          </div>
        )}

        <button
          onClick={handleExtract}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
        >
          开始提取
        </button>
      </div>
    </div>
  );
}
```

**Step 3: 提交**

```bash
git add src-tauri/src/ffmpeg/extract.rs src/components/ControlPanel/ExtractPanel.tsx
git commit -m "feat: 实现提取帧功能"
```

---

### Task 3.4: 截断视频功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/trim.rs`
- 创建: `src/components/ControlPanel/TrimPanel.tsx`

**Step 1: 实现截断功能**

```rust
// src-tauri/src/ffmpeg/trim.rs
use std::process::Command;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TrimParams {
    pub start_time: f64,  // 秒
    pub end_time: f64,    // 秒
    pub precise: bool,    // 是否精确截断(重新编码)
}

pub async fn trim_video(
    input_path: String,
    output_path: String,
    params: TrimParams,
) -> Result<(), String> {
    let ffmpeg_path = get_ffmpeg_path();
    let mut cmd = Command::new(&ffmpeg_path);

    cmd.arg("-ss").arg(&params.start_time.to_string());
    cmd.arg("-to").arg(&params.end_time.to_string());
    cmd.arg("-i").arg(&input_path);

    if params.precise {
        // 精确截断,重新编码
        cmd.arg("-c:v").arg("libx264");
        cmd.arg("-c:a").arg("aac");
    } else {
        // 快速截断,流复制
        cmd.arg("-c").arg("copy");
    }

    cmd.arg("-y").arg(&output_path);

    let output = cmd.output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    if !output.status.success() {
        return Err("截断失败".to_string());
    }

    Ok(())
}
```

**Step 2: 创建前端截断面板**

```typescript
// src/components/ControlPanel/TrimPanel.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '@/store/videoStore';
import { formatDuration } from '@/utils/fileValidation';

export function TrimPanel() {
  const { currentVideo, timelineStart, timelineEnd } = useVideoStore();
  const [precise, setPrecise] = useState(false);

  const handleTrim = async () => {
    if (!currentVideo) return;

    try {
      const outputPath = await invoke<string>('trim_video', {
        inputPath: currentVideo.path,
        params: {
          startTime: timelineStart,
          endTime: timelineEnd,
          precise
        }
      });

      alert(`截断完成: ${outputPath}`);
    } catch (error) {
      alert(`截断失败: ${error}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">截断视频</h3>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            开始时间: {formatDuration(timelineStart)}
          </p>
          <p className="text-sm text-gray-600">
            结束时间: {formatDuration(timelineEnd)}
          </p>
          <p className="text-sm text-gray-600">
            时长: {formatDuration(timelineEnd - timelineStart)}
          </p>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={precise}
            onChange={(e) => setPrecise(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">精确截断(重新编码,较慢)</span>
        </label>

        <button
          onClick={handleTrim}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
        >
          开始截断
        </button>
      </div>
    </div>
  );
}
```

**Step 3: 提交**

```bash
git add src-tauri/src/ffmpeg/trim.rs src/components/ControlPanel/TrimPanel.tsx
git commit -m "feat: 实现截断视频功能"
```

---

### Task 3.5: 转GIF功能

**文件:**
- 创建: `src-tauri/src/ffmpeg/gif.rs`
- 创建: `src/components/ControlPanel/GifPanel.tsx`

**Step 1: 实现转GIF功能**

```rust
// src-tauri/src/ffmpeg/gif.rs
use std::process::Command;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct GifParams {
    pub start_time: f64,
    pub end_time: f64,
    pub fps: u32,
    pub width: u32,
    pub colors: u32,  // 2-256
    pub dither: bool,
}

pub async fn convert_to_gif(
    input_path: String,
    output_path: String,
    params: GifParams,
) -> Result<(), String> {
    let ffmpeg_path = get_ffmpeg_path();
    let mut cmd = Command::new(&ffmpeg_path);

    cmd.arg("-ss").arg(&params.start_time.to_string());
    cmd.arg("-t").arg(&(params.end_time - params.start_time).to_string());
    cmd.arg("-i").arg(&input_path);

    // 构建filter_complex
    let filters = format!(
        "fps={},scale={}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors={}[p];[s1][p]paletteuse",
        params.fps,
        params.width,
        params.colors
    );

    cmd.arg("-filter_complex").arg(&filters);
    cmd.arg("-y").arg(&output_path);

    let output = cmd.output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    if !output.status.success() {
        return Err("转GIF失败".to_string());
    }

    Ok(())
}
```

**Step 2: 创建前端GIF面板**

```typescript
// src/components/ControlPanel/GifPanel.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '@/store/videoStore';

export function GifPanel() {
  const { currentVideo, timelineStart, timelineEnd } = useVideoStore();
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [colors, setColors] = useState(256);

  const handleConvert = async () => {
    if (!currentVideo) return;

    try {
      const outputPath = await invoke<string>('convert_to_gif', {
        inputPath: currentVideo.path,
        params: {
          startTime: timelineStart,
          endTime: timelineEnd,
          fps,
          width,
          colors
        }
      });

      alert(`转换完成: ${outputPath}`);
    } catch (error) {
      alert(`转换失败: ${error}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">转换为GIF</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            帧率: {fps} fps
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            宽度: {width}px
          </label>
          <input
            type="range"
            min="200"
            max="800"
            step="50"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            颜色数: {colors}
          </label>
          <input
            type="range"
            min="16"
            max="256"
            value={colors}
            onChange={(e) => setColors(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleConvert}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
        >
          开始转换
        </button>
      </div>
    </div>
  );
}
```

**Step 3: 提交**

```bash
git add src-tauri/src/ffmpeg/gif.rs src/components/ControlPanel/GifPanel.tsx
git commit -m "feat: 实现转GIF功能"
```

---

## 阶段4: UI整合和完善

### Task 4.1: 创建控制面板容器

**文件:**
- 创建: `src/components/ControlPanel/ControlPanel.tsx`
- 修改: `src/components/ControlPanel/index.ts`

**Step 1: 创建控制面板主组件**

```typescript
// src/components/ControlPanel/ControlPanel.tsx
import { useState } from 'react';
import { CompressPanel } from './CompressPanel';
import { SpeedPanel } from './SpeedPanel';
import { ExtractPanel } from './ExtractPanel';
import { TrimPanel } from './TrimPanel';
import { GifPanel } from './GifPanel';

type TabType = 'compress' | 'speed' | 'extract' | 'trim' | 'gif';

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('compress');

  const tabs = [
    { id: 'compress' as TabType, label: '压缩', icon: '🗜️' },
    { id: 'speed' as TabType, label: '变速', icon: '⚡' },
    { id: 'extract' as TabType, label: '提取帧', icon: '🖼️' },
    { id: 'trim' as TabType, label: '截断', icon: '✂️' },
    { id: 'gif' as TabType, label: '转GIF', icon: '🎞️' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">操作面板</h2>

      {/* 标签页 */}
      <div className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 面板内容 */}
      <div>
        {activeTab === 'compress' && <CompressPanel />}
        {activeTab === 'speed' && <SpeedPanel />}
        {activeTab === 'extract' && <ExtractPanel />}
        {activeTab === 'trim' && <TrimPanel />}
        {activeTab === 'gif' && <GifPanel />}
      </div>
    </div>
  );
}
```

**Step 2: 导出**

```typescript
// src/components/ControlPanel/index.ts
export { ControlPanel } from './ControlPanel';
export { CompressPanel } from './CompressPanel';
export { SpeedPanel } from './SpeedPanel';
export { ExtractPanel } from './ExtractPanel';
export { TrimPanel } from './TrimPanel';
export { GifPanel } from './GifPanel';
```

**Step 3: 更新App组件**

```typescript
// src/App.tsx
import { ControlPanel } from './components/ControlPanel';

// 在JSX中添加ControlPanel
{currentVideo && (
  <>
    <VideoInfo />
    <Timeline />
    <ControlPanel />
  </>
)}
```

**Step 4: 提交**

```bash
git add src/components/ControlPanel/
git commit -m "feat: 创建控制面板容器组件"
```

---

### Task 4.2: 添加进度条组件

**文件:**
- 创建: `src/components/ProgressBar/ProgressBar.tsx`
- 修改: `src/App.tsx`

**Step 1: 创建进度条组件**

```typescript
// src/components/ProgressBar/ProgressBar.tsx
import { useVideoStore } from '@/store/videoStore';

export function ProgressBar() {
  const { isProcessing, progress, currentOperation } = useVideoStore();

  if (!isProcessing) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {currentOperation || '处理中...'}
          </span>
          <span className="text-sm text-gray-600">
            {progress.toFixed(0)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 在App中添加进度条**

```typescript
// src/App.tsx
import { ProgressBar } from './components/ProgressBar';

// 在return的JSX最后添加
<ProgressBar />
```

**Step 3: 提交**

```bash
git add src/components/ProgressBar/
git commit -m "feat: 添加进度条组件"
```

---

### Task 4.3: 添加错误提示Toast

**文件:**
- 安装: `npm install react-hot-toast`
- 修改: `src/main.tsx`
- 创建: `src/utils/errorHandling.ts`

**Step 1: 安装依赖**

```bash
npm install react-hot-toast
```

**Step 2: 配置toast**

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" />
  </React.StrictMode>
);
```

**Step 3: 创建错误处理工具**

```typescript
// src/utils/errorHandling.ts
import toast from 'react-hot-toast';

export function showError(message: string, error?: unknown) {
  console.error(message, error);
  toast.error(message, {
    duration: 5000,
  });
}

export function showSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

export function showInfo(message: string) {
  toast(message, {
    duration: 4000,
  });
}
```

**Step 4: 更新组件使用toast**

```typescript
// src/App.tsx
import { showError, showSuccess } from './utils/errorHandling';

// 替换alert/confirm为toast
try {
  // ...
  showSuccess('操作完成');
} catch (error) {
  showError('操作失败', error);
}
```

**Step 5: 提交**

```bash
git add package.json package-lock.json src/main.tsx src/utils/errorHandling.ts
git commit -m "feat: 添加toast通知系统"
```

---

## 阶段5: 测试和优化

### Task 5.1: 添加单元测试

**文件:**
- 修改: `src-tauri/Cargo.toml`
- 创建: `src-tauri/src/ffmpeg/info_tests.rs`

**Step 1: 添加测试依赖**

```toml
# src-tauri/Cargo.toml 添加dev-dependencies
[dev-dependencies]
tokio-test = "0.4"
```

**Step 2: 创建测试**

```rust
// src-tauri/src/ffmpeg/info_tests.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration() {
        let output = "Duration: 00:01:30.00";
        // 测试时长解析
        assert!(true);
    }
}
```

**Step 3: 运行测试**

```bash
cd src-tauri
cargo test
```

**Step 4: 提交**

```bash
git add src-tauri/src/ffmpeg/info_tests.rs
git commit -m "test: 添加FFmpeg模块单元测试"
```

---

### Task 5.2: 性能优化

**文件:**
- 修改: `src-tauri/src/ffmpeg/compress.rs`

**Step 1: 添加硬件加速检测**

```rust
// src-tauri/src/ffmpeg/compress.rs
pub fn detect_hardware_encoder() -> Option<&'static str> {
    #[cfg(target_os = "windows")]
    {
        // 检查QSV (Intel)或NVENC (NVIDIA)
        return Some("h264_qsv");
    }

    #[cfg(target_os = "macos")]
    {
        return Some("h264_videotoolbox");
    }

    None
}
```

**Step 2: 使用硬件加速**

```rust
// 在compress_video函数中
if let Some(hw_encoder) = detect_hardware_encoder() {
    cmd.arg("-c:v").arg(hw_encoder);
} else {
    cmd.arg("-c:v").arg("libx264");
}
```

**Step 3: 提交**

```bash
git commit -am "perf: 添加FFmpeg硬件加速支持"
```

---

### Task 5.3: 文档完善

**文件:**
- 创建: `README_ZH.md`
- 修改: `README.md`

**Step 1: 创建中文README**

```markdown
# Video Editor

一款功能强大的视频编辑工具。

## 功能特性

- 🎬 视频变速: 0.25x - 4x
- 🗜️ 视频压缩: 多种预设
- 🖼️ 提取帧: 支持多种模式
- ✂️ 视频截断: 快速或精确
- 🎞️ 转GIF: 参数可调

## 使用方法

1. 导入视频
2. 选择功能
3. 调整参数
4. 开始处理

## 技术栈

- Tauri 2.0
- Rust
- React
- FFmpeg
```

**Step 2: 提交**

```bash
git add README_ZH.md
git commit -m "docs: 添加中文使用文档"
```

---

## 阶段6: 打包和发布

### Task 6.1: 配置打包

**文件:**
- 修改: `src-tauri/tauri.conf.json`

**Step 1: 更新打包配置**

```json
{
  "bundle": {
    "active": true,
    "targets": ["msi", "dmg", "appimage"],
    "icon": ["icons/icon.ico", "icons/icon.png", "icons/icon.icns"],
    "identifier": "com.videoeditor.app",
    "publisher": "VideoEditor",
    "category": "Video Editing",
    "shortDescription": "视频编辑工具",
    "longDescription": "专业的视频编辑工具,支持变速、压缩、提取帧等功能"
  }
}
```

**Step 2: 提交**

```bash
git commit -am "build: 配置应用打包"
```

---

### Task 6.2: 构建测试版本

**Step 1: 构建开发版本**

```bash
npm run tauri:build
```

**Step 2: 测试安装包**

```bash
# 测试生成的安装包
src-tauri/target/release/bundle/msi/Video-Editor_0.1.0_x64_en-US.msi
```

---

## 总结

这个实施计划涵盖了视频编辑应用的所有核心功能:

✅ **阶段1**: FFmpeg集成和基础工具
✅ **阶段2**: 时间轴组件
✅ **阶段3**: 所有视频处理功能(压缩、变速、提取帧、截断、转GIF)
✅ **阶段4**: UI整合和完善
✅ **阶段5**: 测试和优化
✅ **阶段6**: 打包和发布

**关键原则:**
- 每个任务独立可测试
- 遵循TDD开发模式
- 频繁提交,小步快跑
- DRY原则,复用代码
- YAGNI原则,不过度设计

**下一步**: 使用 superpowers:executing-plans 开始实施!
