/**
 * 拼图工具主组件
 * 独立的拼图创建工具
 */

import { CollageWorkspace } from './components/CollageWorkspace';

export function ImageCollage() {
  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      <CollageWorkspace />
    </div>
  );
}
