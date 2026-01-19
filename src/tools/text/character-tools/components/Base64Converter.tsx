import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <Card className="border-2">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <FileText className="w-6 h-6" />
          Base64 转换器
        </CardTitle>
        <CardDescription className="text-base">
          {mode === 'encode' ? '将文本编码为 Base64' : '将 Base64 解码为文本'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="space-y-3">
          <Label htmlFor="base64-input" className="text-base font-medium">输入 ({mode === 'encode' ? '原文' : 'Base64'})</Label>
          <Textarea
            id="base64-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError('');
            }}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64 字符串...'}
            className="min-h-[180px] font-mono text-base p-4"
          />
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleConvert} 
            className="flex-1 h-11 text-base"
            disabled={!inputText.trim()}
          >
            {mode === 'encode' ? (
              <>
                <ArrowDown className="w-5 h-5 mr-2" />
                编码
              </>
            ) : (
              <>
                <ArrowUp className="w-5 h-5 mr-2" />
                解码
              </>
            )}
          </Button>
          <Button 
            onClick={swapMode} 
            variant="outline"
            title="切换编码/解码"
            className="h-11 w-12"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </Button>
          <Button 
            onClick={handleClear} 
            variant="outline"
            disabled={!inputText && !outputText}
            className="h-11 px-6 text-base"
          >
            清空
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        )}

        {outputText && !error && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">输出 ({mode === 'encode' ? 'Base64' : '原文'})</Label>
              <Button 
                onClick={handleCopy}
                variant="ghost" 
                size="sm"
                className="h-9 px-4 text-base"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={outputText}
              readOnly
              className="min-h-[180px] font-mono text-base p-4"
            />
            <p className="text-sm text-muted-foreground font-medium">
              长度: {outputText.length} 个字符
            </p>
          </div>
        )}

        {!outputText && !error && !inputText && (
          <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-base">输入文本后点击转换按钮</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
