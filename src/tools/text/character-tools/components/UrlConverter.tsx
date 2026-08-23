import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, ArrowDown, ArrowUp, ArrowLeftRight, AlertCircle, Link2 } from 'lucide-react';

export function UrlConverter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleConvert = () => {
    setError('');

    if (!inputText.trim()) {
      setError('请输入内容');
      setOutputText('');
      return;
    }

    // 换行分隔逐行处理，输出区逐行对应
    const lines = inputText.split('\n');
    const results: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        results.push(mode === 'encode' ? encodeURIComponent(lines[i]) : decodeURIComponent(lines[i]));
      } catch {
        setError(`第 ${i + 1} 行解码失败：不是有效的 URL 编码字符串`);
        setOutputText('');
        return;
      }
    }
    setOutputText(results.join('\n'));
  };

  const handleCopy = async () => {
    if (!outputText) return;

    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
  };

  const swapMode = () => {
    setError('');
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setInputText(outputText);
    setOutputText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：输入 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              输入 ({mode === 'encode' ? '原文' : 'URL 编码'})
            </CardTitle>
            <Button
              onClick={swapMode}
              variant="outline"
              size="sm"
              title="切换编码/解码"
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              {mode === 'encode' ? '解码模式' : '编码模式'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="url-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError('');
            }}
            placeholder={mode === 'encode' ? '输入要编码的文本，多行内容将逐行处理...' : '输入要解码的 URL 编码字符串，多行内容将逐行处理...'}
            className="min-h-[240px] font-mono text-sm"
          />

          <div className="flex gap-3">
            <Button
              onClick={handleConvert}
              className="flex-1"
              disabled={!inputText.trim()}
            >
              {mode === 'encode' ? (
                <>
                  <ArrowDown className="w-4 h-4 mr-2" />
                  编码
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4 mr-2" />
                  解码
                </>
              )}
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              disabled={!inputText && !outputText}
            >
              清空
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 右侧：输出 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              输出 ({mode === 'encode' ? 'URL 编码' : '原文'})
            </CardTitle>
            {outputText && !error && (
              <Button
                onClick={handleCopy}
                variant="ghost"
                size="sm"
              >
                {copied ? (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {outputText && !error ? (
            <div className="space-y-3">
              <Textarea
                value={outputText}
                readOnly
                className="min-h-[240px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground font-medium">
                共 {outputText.split('\n').length} 行，长度 {outputText.length} 个字符
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<Link2 className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="输入文本后点击转换按钮"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
