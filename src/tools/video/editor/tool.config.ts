import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { VideoEditor } from './index';
import { useVideoStore } from './store/videoStore';

/**
 * 视频编辑器工具配置
 *
 * 定义了视频编辑器的所有元数据和注册信息
 */
export const videoEditorToolConfig: ToolMetadata = {
  // 工具唯一标识
  id: 'video-editor',

  // 工具显示名称
  name: '视频编辑器',

  // 工具描述
  description: '专业的视频编辑工具，支持压缩、变速、截断、提取帧、GIF转换等功能',

  // 工具分类
  category: 'video',

  // 工具图标（lucide-react 图标名）
  icon: 'Video',

  // 工具组件
  component: VideoEditor,

  // 工具状态管理 Hook
  useToolStore: useVideoStore,

  // 键盘快捷键
  shortcut: 'CmdOrCtrl+Shift+V',

  // 工具标签（用于搜索）
  tags: [
    'video',
    'edit',
    'compress',
    'speed',
    'trim',
    'gif',
    'extract',
    'frames',
    'ffmpeg'
  ],

  // 工具状态
  status: 'stable',

  // 是否支持文件拖拽
  supportFileDrop: true,

  // 支持的文件类型
  supportedFileTypes: [
    'mp4',
    'mov',
    'avi',
    'wmv',
    'mkv',
    'flv',
    'webm'
  ]
};

// 默认导出，方便工具注册中心导入
export default videoEditorToolConfig;
