import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Image as ImageIcon, RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';
import { useImageEditorStore } from './store/imageEditorStore';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showError } from '@/tools/video/editor/utils/errorHandling';
import { EditCanvas } from './components/EditCanvas';
import { FilterControls } from './components/FilterControls';
import { ExportSettings } from './components/ExportSettings';
import type { CropRatio, ImageInfo } from './types';

const RATIO_OPTIONS: { value: CropRatio; label: string }[] = [
  { value: 'free', label: '自由' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
];

export function ImageEditor() {
  const inputPath = useImageEditorStore((s) => s.inputPath);
  const imageInfo = useImageEditorStore((s) => s.imageInfo);
  const params = useImageEditorStore((s) => s.params);
  const updateParams = useImageEditorStore((s) => s.updateParams);
  const cropEnabled = useImageEditorStore((s) => s.cropEnabled);
  const cropRatio = useImageEditorStore((s) => s.cropRatio);
  const setCropEnabled = useImageEditorStore((s) => s.setCropEnabled);
  const setCropRatio = useImageEditorStore((s) => s.setCropRatio);

  const [isDragging, setIsDragging] = useState(false);

  // 监听文件拖拽
  useEffect(() => {
    let dragEnterUnlisten: (() => void) | undefined;
    let dragLeaveUnlisten: (() => void) | undefined;
    let dragDropUnlisten: (() => void) | undefined;

    async function setupDragListeners() {
      dragEnterUnlisten = await listen('tauri://drag-enter', () => {
        setIsDragging(true);
      });

      dragLeaveUnlisten = await listen('tauri://drag-leave', () => {
        setIsDragging(false);
      });

      dragDropUnlisten = await listen('tauri://drag-drop', (event: any) => {
        const payload = event.payload as { paths: string[] };
        setIsDragging(false);
        if (payload.paths && payload.paths.length > 0) {
          handleFilesSelected(payload.paths);
        }
      });
    }

    setupDragListeners();

    return () => {
      if (dragEnterUnlisten) dragEnterUnlisten();
      if (dragLeaveUnlisten) dragLeaveUnlisten();
      if (dragDropUnlisten) dragDropUnlisten();
    };
  }, []);

  // 防抖预览：编辑参数变化后 200ms 请求新预览。
  // 以序列化后的"生效参数"为依赖：裁剪模式下预览不含 crop，
  // 拖动裁剪框不会触发多余请求，也不会引起预览图闪烁。
  const previewParamsKey = JSON.stringify(
    useImageEditorStore.getState().getEditParams(!cropEnabled)
  );

  useEffect(() => {
    if (!inputPath) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const store = useImageEditorStore.getState();
      store.setPreviewLoading(true);
      try {
        const url = await invoke<string>('edit_image_preview', {
          inputPath,
          params: store.getEditParams(!store.cropEnabled),
        });
        if (!cancelled) {
          useImageEditorStore.getState().setPreview(url);
        }
      } catch (error) {
        if (!cancelled) {
          showError('生成预览失败', error);
          useImageEditorStore.getState().setPreviewLoading(false);
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputPath, previewParamsKey]);

  const handleFilesSelected = useCallback(async (paths: string[]) => {
    const path = paths[0];
    if (!path) return;
    try {
      const info = await invoke<ImageInfo>('get_image_info', { path });
      useImageEditorStore.getState().setInput(path, info);
    } catch (error) {
      showError(`无法加载图片: ${path}`, error);
    }
  }, []);

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'] }],
      });
      if (selected) {
        handleFilesSelected([selected]);
      }
    } catch (error) {
      console.log('文件选择被取消');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">图片编辑器</h1>
            {imageInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                {imageInfo.filename} · 原始尺寸 {imageInfo.width} × {imageInfo.height}
              </p>
            )}
          </div>
          {inputPath && (
            <Button variant="outline" onClick={handleSelectFile}>更换图片</Button>
          )}
        </div>

        {inputPath ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧: 预览画布 */}
            <div className="lg:col-span-2">
              <EditCanvas />
            </div>

            {/* 右侧: 控制面板 */}
            <div className="space-y-6">
              {/* 旋转与翻转 */}
              <Card>
                <CardHeader>
                  <CardTitle>旋转与翻转</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="向左旋转 90°"
                    onClick={() => updateParams({ rotation: (params.rotation + 270) % 360 })}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="向右旋转 90°"
                    onClick={() => updateParams({ rotation: (params.rotation + 90) % 360 })}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={params.flipH ? 'default' : 'outline'}
                    size="icon"
                    title="水平翻转"
                    onClick={() => updateParams({ flipH: !params.flipH })}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={params.flipV ? 'default' : 'outline'}
                    size="icon"
                    title="垂直翻转"
                    onClick={() => updateParams({ flipV: !params.flipV })}
                  >
                    <FlipVertical className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* 裁剪 */}
              <Card>
                <CardHeader>
                  <CardTitle>裁剪</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="crop"
                      checked={cropEnabled}
                      onCheckedChange={setCropEnabled}
                    />
                    <Label htmlFor="crop" className="cursor-pointer">启用裁剪</Label>
                  </div>
                  {cropEnabled && (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {RATIO_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            size="sm"
                            variant={cropRatio === option.value ? 'default' : 'outline'}
                            onClick={() => setCropRatio(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        在左侧预览图上拖动裁剪框或手柄调整区域，关闭裁剪开关后预览应用裁剪效果
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <FilterControls />
              <ExportSettings />
            </div>
          </div>
        ) : (
          <div onClick={handleSelectFile}>
            <FileUploadZone
              title="拖拽图片到此处"
              description="或点击选择文件开始编辑"
              formats="支持 PNG, JPG, WebP, GIF, BMP, TIFF 格式"
              icon={<ImageIcon className="w-6 h-6 text-primary" />}
              showButton={false}
            />
          </div>
        )}
      </div>

      {/* 拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-foreground">
            松开以导入图片
          </p>
        </div>
      )}
    </div>
  );
}
