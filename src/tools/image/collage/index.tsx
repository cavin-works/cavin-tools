import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Image as ImageIcon } from 'lucide-react';
import { useImageCollageStore } from './store/collageStore';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { showError } from '@/tools/video/editor/utils/errorHandling';
import { CollageCanvas } from './components/CollageCanvas';
import { TemplatePicker } from './components/TemplatePicker';
import { ImageList } from './components/ImageList';
import { ExportSettings } from './components/ExportSettings';
import type { ImageInfo } from '@/tools/image/editor/types';
import type { CollageImage } from './types';

const MAX_IMAGES = 9;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'];

export function ImageCollage() {
  const images = useImageCollageStore((s) => s.images);
  const params = useImageCollageStore((s) => s.params);

  const [isDragging, setIsDragging] = useState(false);
  // 透明开关关闭时恢复到上一次选择的颜色
  const [lastColor, setLastColor] = useState('#ffffff');
  const isTransparent = params.background === 'transparent';

  // 监听文件拖拽（接收全部拖入路径）
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

  // 防抖预览：图片顺序或参数变化后 200ms 请求新预览。
  // 以序列化后的"路径顺序 + 参数"为依赖，拖拽排序同样触发更新。
  const previewKey = JSON.stringify({
    paths: useImageCollageStore.getState().images.map((img) => img.path),
    params: useImageCollageStore.getState().params,
  });

  useEffect(() => {
    const store = useImageCollageStore.getState();
    if (store.images.length === 0) {
      store.setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const current = useImageCollageStore.getState();
      current.setPreviewLoading(true);
      try {
        const url = await invoke<string>('collage_preview', {
          inputPaths: current.images.map((img) => img.path),
          params: current.params,
        });
        if (!cancelled) {
          useImageCollageStore.getState().setPreview(url);
        }
      } catch (error) {
        if (!cancelled) {
          showError('生成预览失败', error);
          useImageCollageStore.getState().setPreviewLoading(false);
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [previewKey]);

  const handleFilesSelected = useCallback(async (paths: string[]) => {
    const store = useImageCollageStore.getState();
    const remaining = MAX_IMAGES - store.images.length;
    if (remaining <= 0) {
      showError(`最多支持 ${MAX_IMAGES} 张图片`);
      return;
    }
    if (paths.length > remaining) {
      showError(`最多支持 ${MAX_IMAGES} 张图片，已忽略多余的 ${paths.length - remaining} 张`);
    }

    const accepted: Omit<CollageImage, 'id'>[] = [];
    for (const path of paths.slice(0, remaining)) {
      try {
        const info = await invoke<ImageInfo>('get_image_info', { path });
        accepted.push({
          path: info.path,
          filename: info.filename,
          width: info.width,
          height: info.height,
        });
      } catch (error) {
        showError(`无法加载图片: ${path}`, error);
      }
    }
    if (accepted.length > 0) {
      useImageCollageStore.getState().addImages(accepted);
    }
  }, []);

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }],
      });
      if (selected) {
        handleFilesSelected(Array.isArray(selected) ? selected : [selected]);
      }
    } catch (error) {
      console.log('文件选择被取消');
    }
  };

  const handleColorChange = (color: string) => {
    setLastColor(color);
    useImageCollageStore.getState().updateParams({ background: color });
  };

  const handleTransparentChange = (transparent: boolean) => {
    useImageCollageStore
      .getState()
      .updateParams({ background: transparent ? 'transparent' : lastColor });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">图片拼贴</h1>
            <p className="text-sm text-muted-foreground mt-1">
              支持横向、纵向、2×2 与九宫格模板，最多 {MAX_IMAGES} 张图片
            </p>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧: 预览画布 */}
            <div className="lg:col-span-2">
              <CollageCanvas />
            </div>

            {/* 右侧: 控制面板 */}
            <div className="space-y-6">
              {/* 模板 */}
              <Card>
                <CardHeader>
                  <CardTitle>拼贴模板</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplatePicker />
                </CardContent>
              </Card>

              {/* 间距与边距 */}
              <Card>
                <CardHeader>
                  <CardTitle>间距与边距</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="collage-gap">图片间距: {params.gap}px</Label>
                    <Slider
                      id="collage-gap"
                      min={0}
                      max={64}
                      step={1}
                      value={[params.gap]}
                      onValueChange={(value) =>
                        useImageCollageStore.getState().updateParams({ gap: value[0] })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="collage-margin">画布边距: {params.margin}px</Label>
                    <Slider
                      id="collage-margin"
                      min={0}
                      max={64}
                      step={1}
                      value={[params.margin]}
                      onValueChange={(value) =>
                        useImageCollageStore.getState().updateParams({ margin: value[0] })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 背景色 */}
              <Card>
                <CardHeader>
                  <CardTitle>背景</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="背景颜色"
                      value={isTransparent ? lastColor : params.background}
                      onChange={(e) => handleColorChange(e.target.value)}
                      disabled={isTransparent}
                      className="w-9 h-9 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span className="text-sm text-muted-foreground">
                      {isTransparent ? '透明背景' : params.background.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="transparent"
                      checked={isTransparent}
                      onCheckedChange={handleTransparentChange}
                    />
                    <Label htmlFor="transparent" className="cursor-pointer">透明背景</Label>
                  </div>
                </CardContent>
              </Card>

              {/* 图片列表 */}
              <Card>
                <CardHeader>
                  <CardTitle>图片列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageList onAdd={handleSelectFiles} />
                </CardContent>
              </Card>

              <ExportSettings />
            </div>
          </div>
        ) : (
          <div onClick={handleSelectFiles}>
            <FileUploadZone
              title="拖拽图片到此处"
              description="支持多选，或点击选择文件开始拼贴"
              formats="支持 PNG, JPG, WebP, GIF, BMP, TIFF 格式，最多 9 张"
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
