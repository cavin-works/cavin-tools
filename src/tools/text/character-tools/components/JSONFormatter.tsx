import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileJson, AlertCircle, Sparkles, Minimize2, Copy, Check } from 'lucide-react';
import { JSONTreeView } from './JSONTreeView';

type IndentType = '2' | '4' | 'tab';

export function JSONFormatter() {
  const [inputJSON, setInputJSON] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [indent, setIndent] = useState<IndentType>('2');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCompressed, setIsCompressed] = useState(false);

  const getIndentValue = (indentType: IndentType): string => {
    switch (indentType) {
      case '2':
        return '  ';
      case '4':
        return '    ';
      case 'tab':
        return '\t';
      default:
        return '  ';
    }
  };

  const handleFormat = (compress = false) => {
    setError('');
    
    if (!inputJSON.trim()) {
      setError('请输入 JSON 内容');
      setParsedData(null);
      return;
    }

    try {
      const parsed = JSON.parse(inputJSON);
      setParsedData(parsed);
      setIsCompressed(compress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '无效的 JSON 格式';
      setError(errorMessage);
      setParsedData(null);
    }
  };

  const handleMinify = () => {
    handleFormat(true);
  };

  const handleCopy = async () => {
    if (!parsedData) return;
    
    try {
      const formatted = JSON.stringify(parsedData, null, isCompressed ? 0 : getIndentValue(indent));
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClear = () => {
    setInputJSON('');
    setParsedData(null);
    setError('');
    setIsCompressed(false);
  };

  const handleLoadExample = () => {
    const example = {
      name: "Mnemosyne",
      version: "1.0.0",
      features: ["视频编辑", "图片处理", "文本工具"],
      settings: {
        theme: "dark",
        language: "zh-CN"
      },
      active: true
    };
    setInputJSON(JSON.stringify(example));
    setError('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 左侧：输入 */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">输入 JSON</CardTitle>
            <Button
              onClick={handleLoadExample}
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              加载示例
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <Textarea
            id="json-input"
            value={inputJSON}
            onChange={(e) => {
              setInputJSON(e.target.value);
              setError('');
            }}
            placeholder='{"key": "value"}'
            className="flex-1 min-h-[200px] font-mono text-sm resize-none"
          />

          <div className="space-y-3">
            <Label className="text-sm">缩进选项 (美化)</Label>
            <RadioGroup value={indent} onValueChange={(value) => setIndent(value as IndentType)}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="indent-2" />
                  <Label htmlFor="indent-2" className="font-normal cursor-pointer text-sm">2 空格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="indent-4" />
                  <Label htmlFor="indent-4" className="font-normal cursor-pointer text-sm">4 空格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tab" id="indent-tab" />
                  <Label htmlFor="indent-tab" className="font-normal cursor-pointer text-sm">Tab</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleFormat(false)}
              className="flex-1"
              disabled={!inputJSON.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              美化
            </Button>
            <Button
              onClick={handleMinify}
              variant="outline"
              className="flex-1"
              disabled={!inputJSON.trim()}
            >
              <Minimize2 className="w-4 h-4 mr-2" />
              压缩
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              disabled={!inputJSON && !parsedData}
            >
              清空
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">JSON 解析错误：</span>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 右侧：结果 */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">格式化结果</CardTitle>
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              disabled={!parsedData}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {parsedData && !error ? (
            <div className="border rounded-lg p-4 overflow-auto bg-muted/30 min-h-[200px]">
              <JSONTreeView data={parsedData} />
            </div>
          ) : (
            <EmptyState
              icon={<FileJson className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="输入 JSON 数据或加载示例"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
