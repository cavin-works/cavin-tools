/**
 * 批量处理工作区组件
 * 移植自原BatchProcessorPanel，适配独立工具结构
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { BatchOperation, BatchOperationType } from '../../editor/types';

interface OperationConfig {
  id: string;
  type: BatchOperationType;
  name: string;
  enabled: boolean;
  params: any;
}

const AVAILABLE_OPERATIONS = [
  { type: 'resize' as BatchOperationType, name: '调整尺寸', defaultParams: { percentage: 50, maintain_aspect: true, algorithm: 'lanczos3' } },
  { type: 'crop' as BatchOperationType, name: '裁剪', defaultParams: { x: 0, y: 0, width: 1920, height: 1080 } },
  { type: 'rotate' as BatchOperationType, name: '旋转', defaultParams: { angle: 90 } },
  { type: 'flip' as BatchOperationType, name: '翻转', defaultParams: { horizontal: true, vertical: false } },
  { type: 'convert' as BatchOperationType, name: '格式转换', defaultParams: { format: 'jpeg', quality: 85 } },
];

export function BatchWorkspace() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [operations, setOperations] = useState<OperationConfig[]>([]);
  const [outputDir, setOutputDir] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success_count: number;
    failed_count: number;
    errors: string[];
  } | null>(null);

  // 选择多张图片
  const handleSelectImages = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: '图片',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
          }
        ]
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        setSelectedImages(paths);
        setResult(null);
      }
    } catch (err) {
      console.error('选择图片失败:', err);
    }
  };

  // 选择输出目录
  const handleSelectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
      });

      if (selected) {
        setOutputDir(selected);
      }
    } catch (err) {
      console.error('选择目录失败:', err);
    }
  };

  // 添加操作到队列
  const handleAddOperation = (type: BatchOperationType) => {
    const op = AVAILABLE_OPERATIONS.find(o => o.type === type);
    if (!op) return;

    const newOp: OperationConfig = {
      id: `${type}-${Date.now()}`,
      type,
      name: op.name,
      enabled: true,
      params: { ...op.defaultParams },
    };

    setOperations([...operations, newOp]);
  };

  // 移除操作
  const handleRemoveOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  // 切换操作启用状态
  const handleToggleOperation = (id: string) => {
    setOperations(operations.map(op =>
      op.id === id ? { ...op, enabled: !op.enabled } : op
    ));
  };

  // 执行批量处理
  const handleProcessBatch = async () => {
    if (selectedImages.length === 0) {
      alert('请先选择图片');
      return;
    }

    const enabledOps = operations.filter(op => op.enabled);
    if (enabledOps.length === 0) {
      alert('请至少启用一个操作');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const batchOps: BatchOperation[] = enabledOps.map(op => ({
        operation_type: op.type,
        params: JSON.stringify(op.params),
      }));

      const response = await invoke<{
        success_count: number;
        failed_count: number;
        errors: string[];
      }>('batch_process_images_command', {
        params: {
          image_paths: selectedImages,
          operations: batchOps,
          output_dir: outputDir || null,
          overwrite: false,
        },
      });

      setResult(response);
      alert(`批量处理完成！\n成功: ${response.success_count} 张\n失败: ${response.failed_count} 张`);
    } catch (err) {
      alert(`批量处理失败: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-bold">批量处理</h1>
        <p className="text-sm text-neutral-400 mt-1">对多张图片执行批量操作</p>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* 选择图片 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">选择图片</label>
            <button
              onClick={handleSelectImages}
              className="w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm transition-colors"
            >
              选择多张图片
            </button>
            {selectedImages.length > 0 && (
              <p className="text-xs text-neutral-400 mt-2">
                已选择 {selectedImages.length} 张图片
              </p>
            )}
          </div>

          {/* 添加操作 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">添加操作</label>
            <div className="grid grid-cols-3 gap-3">
              {AVAILABLE_OPERATIONS.map((op) => (
                <button
                  key={op.type}
                  onClick={() => handleAddOperation(op.type)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm transition-colors"
                >
                  {op.name}
                </button>
              ))}
            </div>
          </div>

          {/* 操作列表 */}
          {operations.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-neutral-300 mb-2 block">
                操作队列（按顺序执行）
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {operations.map((op, index) => (
                  <div
                    key={op.id}
                    className={`p-3 rounded-lg border ${
                      op.enabled
                        ? 'bg-neutral-800 border-neutral-700'
                        : 'bg-neutral-900 border-neutral-800 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xs bg-blue-600 px-2 py-1 rounded font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm">{op.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleOperation(op.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                            op.enabled
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          {op.enabled ? '启用' : '禁用'}
                        </button>
                        <button
                          onClick={() => handleRemoveOperation(op.id)}
                          className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 输出目录 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">输出目录（可选）</label>
            <button
              onClick={handleSelectOutputDir}
              className="w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm transition-colors"
            >
              选择输出目录
            </button>
            {outputDir && (
              <p className="text-xs text-neutral-400 mt-2 truncate" title={outputDir}>
                {outputDir}
              </p>
            )}
          </div>

          {/* 处理按钮 */}
          <button
            onClick={handleProcessBatch}
            disabled={selectedImages.length === 0 || operations.length === 0 || isProcessing}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
          >
            {isProcessing ? '处理中...' : '开始批量处理'}
          </button>

          {/* 处理结果 */}
          {result && (
            <div className="mb-6 p-4 bg-neutral-800 rounded-lg">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">处理结果</h3>
              <div className="space-y-2 text-sm">
                <p className="text-green-400">✓ 成功: {result.success_count} 张</p>
                {result.failed_count > 0 && (
                  <p className="text-red-400">✗ 失败: {result.failed_count} 张</p>
                )}
                {result.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-red-400 hover:text-red-300 text-sm">
                      查看错误详情
                    </summary>
                    <div className="mt-2 pl-3 text-neutral-400 text-xs space-y-1">
                      {result.errors.map((err, i) => (
                        <p key={i} className="truncate">• {err}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="p-4 bg-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">使用说明</h3>
            <ul className="text-xs text-neutral-400 space-y-1">
              <li>• 选择需要处理的图片</li>
              <li>• 添加操作（按顺序执行）</li>
              <li>• 可以启用/禁用或删除操作</li>
              <li>• 选择输出目录（可选）</li>
              <li>• 点击开始批量处理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
