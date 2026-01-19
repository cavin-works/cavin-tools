import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      name: "Cavin Tools",
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
    <div className="h-full flex flex-col p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
          <FileJson className="w-7 h-7 text-foreground" />
          JSON 格式化器
        </h2>
        <p className="text-muted-foreground">格式化、美化或压缩 JSON 数据</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        <div className="flex flex-col min-h-0 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-medium text-foreground">输入 JSON</Label>
            <Button 
              onClick={handleLoadExample}
              variant="ghost" 
              size="sm"
              className="h-8 text-xs"
            >
              加载示例
            </Button>
          </div>
          <Textarea
            id="json-input"
            value={inputJSON}
            onChange={(e) => {
              setInputJSON(e.target.value);
              setError('');
            }}
            placeholder='{"key": "value"}'
            className="flex-1 min-h-0 font-mono text-sm text-foreground resize-none placeholder:text-muted-foreground"
          />

          <div className="mt-6 space-y-3">
            <Label className="text-foreground">缩进选项 (美化)</Label>
            <RadioGroup value={indent} onValueChange={(value) => setIndent(value as IndentType)}>
              <div className="flex gap-4 pt-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="indent-2" />
                  <Label htmlFor="indent-2" className="font-normal cursor-pointer text-sm text-foreground">2 空格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="indent-4" />
                  <Label htmlFor="indent-4" className="font-normal cursor-pointer text-sm text-foreground">4 空格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tab" id="indent-tab" />
                  <Label htmlFor="indent-tab" className="font-normal cursor-pointer text-sm text-foreground">Tab</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="mt-6 flex gap-2">
            <Button 
              onClick={() => handleFormat(false)}
              className="flex-1 h-11 text-base text-foreground"
              disabled={!inputJSON.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2 text-foreground" />
              美化
            </Button>
            <Button 
              onClick={handleMinify}
              variant="outline"
              className="flex-1 h-11 text-base text-foreground"
              disabled={!inputJSON.trim()}
            >
              <Minimize2 className="w-4 h-4 mr-2 text-foreground" />
              压缩
            </Button>
            <Button 
              onClick={handleClear} 
              variant="outline"
              className="h-11 px-6 text-base text-foreground"
              disabled={!inputJSON && !parsedData}
            >
              清空
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">JSON 解析错误：</span>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-col min-h-0 lg:col-span-3">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-base font-medium text-foreground">格式化结果</Label>
            <Button 
              onClick={handleCopy}
              variant="ghost" 
              size="sm"
              className="h-8"
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
          
          {parsedData && !error ? (
            <div className="flex-1 border-2 rounded-lg p-4 overflow-auto bg-muted/30 min-h-0">
              <JSONTreeView data={parsedData} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg min-h-0">
              <div className="space-y-2">
                <FileJson className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm">输入 JSON 数据或加载示例</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
