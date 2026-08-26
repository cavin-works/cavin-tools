import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';

/** 预览防抖间隔（毫秒） */
const DEBOUNCE_MS = 300;

export function QrCodeTool() {
  const [text, setText] = useState('');
  const [size, setSize] = useState(512);
  const [dark, setDark] = useState('#000000');
  const [light, setLight] = useState('#ffffff');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 输入变化后防抖 300ms 再生成预览，取消过期请求
  useEffect(() => {
    if (!text.trim()) {
      setPreview('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = await invoke<string>('generate_qr_png', { text, size, dark, light });
        if (!cancelled) setPreview(url);
      } catch (error) {
        if (!cancelled) {
          setPreview('');
          showError('生成二维码失败', error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, size, dark, light]);

  const handleSave = async () => {
    const path = await save({
      defaultPath: 'qrcode.png',
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (!path) return;

    setSaving(true);
    try {
      await invoke('save_qr', { text, size, dark, light, path });
      showSuccess('二维码已保存');
    } catch (error) {
      showError('保存二维码失败', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,2fr)_minmax(280px,1fr)]">
      {/* 参数设置 */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>二维码内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入文本或链接，例如 https://example.com"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              支持文本、链接等任意内容，内容越短二维码越简洁
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>尺寸</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="qr-size">图片尺寸</Label>
              <span className="text-sm text-muted-foreground">{size} px</span>
            </div>
            <Slider
              id="qr-size"
              min={256}
              max={1024}
              step={64}
              value={[size]}
              onValueChange={(v) => setSize(v[0] ?? size)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>颜色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="前景色"
                value={dark}
                onChange={(e) => setDark(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer"
              />
              <Label className="cursor-default">前景色（码点）</Label>
              <span className="text-sm text-muted-foreground">{dark.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="背景色"
                value={light}
                onChange={(e) => setLight(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer"
              />
              <Label className="cursor-default">背景色</Label>
              <span className="text-sm text-muted-foreground">{light.toUpperCase()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              建议前景色深、背景色浅，保证二维码可扫描
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 预览与保存 */}
      <Card className="self-start">
        <CardHeader>
          <CardTitle>预览</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-center rounded-lg border border-dashed border-border p-4 min-h-[200px]">
            {preview ? (
              <img
                src={preview}
                alt="二维码预览"
                className="max-w-full max-h-[360px] rounded"
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {loading ? '正在生成…' : '输入内容后自动生成预览'}
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!preview || saving}
            className="w-full"
          >
            {saving ? '保存中…' : '保存为 PNG'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default QrCodeTool;
