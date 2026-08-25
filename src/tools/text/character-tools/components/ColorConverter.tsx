import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, AlertCircle, Dices, Paintbrush } from 'lucide-react';
import {
  parseColor,
  toHex,
  toRgbString,
  toHslString,
  lighten,
  darken,
  randomColor,
  type ParsedColor,
} from '../utils/color';

// 明暗变体条：亮 5 档 → 原色 → 暗 5 档，步进 10%
const SHADE_STEPS = [50, 40, 30, 20, 10, 0, -10, -20, -30, -40, -50];

function shadeOf(c: ParsedColor, step: number): ParsedColor {
  if (step > 0) return lighten(c, step);
  if (step < 0) return darken(c, -step);
  return c;
}

export function ColorConverter() {
  const [input, setInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const trimmed = input.trim();
  const parsed = trimmed ? parseColor(input) : null;
  const invalid = trimmed.length > 0 && !parsed;

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const copyButton = (key: string, value: string) => (
    <Button
      onClick={() => handleCopy(key, value)}
      variant="ghost"
      size="sm"
      className="shrink-0"
    >
      {copiedKey === key ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-1" />
          复制
        </>
      )}
    </Button>
  );

  const formats = parsed
    ? [
        { key: 'hex', label: 'HEX', value: toHex(parsed) },
        { key: 'rgb', label: 'RGB', value: toRgbString(parsed) },
        { key: 'hsl', label: 'HSL', value: toHslString(parsed) },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：输入与预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">输入颜色</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="支持 #RRGGBB(A)、rgb(r,g,b[,a])、hsl(h,s%,l%[,a])"
              className="font-mono"
            />
            <Button
              onClick={() => setInput(randomColor())}
              variant="outline"
              className="shrink-0"
              title="随机生成一个颜色"
            >
              <Dices className="w-4 h-4 mr-2" />
              随机
            </Button>
          </div>

          {invalid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                无法识别的颜色格式，请输入 HEX、RGB 或 HSL
              </AlertDescription>
            </Alert>
          )}

          {parsed ? (
            <div
              className="h-32 rounded-md border"
              style={{ backgroundColor: toRgbString(parsed) }}
            />
          ) : (
            !invalid && (
              <EmptyState
                icon={<Paintbrush className="w-6 h-6 text-muted-foreground" />}
                title="暂无颜色"
                description="输入任意格式颜色或点击随机按钮"
              />
            )
          )}
        </CardContent>
      </Card>

      {/* 右侧：输出格式与明暗变体 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">转换结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {parsed ? (
            <>
              <div className="space-y-2">
                {formats.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                      {f.label}
                    </span>
                    <span className="flex-1 truncate font-mono text-sm">
                      {f.value}
                    </span>
                    {copyButton(f.key, f.value)}
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground font-medium">
                  明暗变体（每档 10%，点击复制 HEX）
                </p>
                <div className="flex gap-1">
                  {SHADE_STEPS.map((step) => {
                    const shade = shadeOf(parsed, step);
                    const hex = toHex(shade);
                    return (
                      <button
                        key={step}
                        type="button"
                        title={hex}
                        onClick={() => handleCopy(hex, hex)}
                        className={`h-12 flex-1 rounded-md border cursor-pointer transition-transform hover:scale-105 ${
                          step === 0 ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: toRgbString(shade) }}
                      >
                        {copiedKey === hex && (
                          <Check className="w-4 h-4 mx-auto text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Paintbrush className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="输入颜色后自动识别并转换"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
