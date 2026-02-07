import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, ArrowDown, ArrowUp, ArrowLeftRight, AlertCircle, FileText } from 'lucide-react';

export function Base64Converter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const utf8Encode = (str: string): string => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const utf8Decode = (str: string): string => {
    return decodeURIComponent(escape(window.atob(str)));
  };

  const handleConvert = () => {
    setError('');
    
    if (!inputText.trim()) {
      setError('请输入内容');
      setOutputText('');
      return;
    }

    try {
      if (mode === 'encode') {
        const encoded = utf8Encode(inputText);
        setOutputText(encoded);
      } else {
        const decoded = utf8Decode(inputText);
        setOutputText(decoded);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '转换失败';
      setError(mode === 'decode' ? '无效的 Base64 字符串' : errorMessage);
      setOutputText('');
    }
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
              输入 ({mode === 'encode' ? '原文' : 'Base64'})
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
            id="base64-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError('');
            }}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64 字符串...'}
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
              输出 ({mode === 'encode' ? 'Base64' : '原文'})
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
                长度: {outputText.length} 个字符
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="输入文本后点击转换按钮"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
