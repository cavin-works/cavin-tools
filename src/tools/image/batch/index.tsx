/**
 * 批量处理工具主组件
 * 独立的图片批量处理工具
 */

import { BatchWorkspace } from './components/BatchWorkspace';

export function ImageBatch() {
  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      <BatchWorkspace />
    </div>
  );
}
