import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshCw, Copy, Check, Wand2 } from 'lucide-react';

export function RandomStringGenerator() {
  const [length, setLength] = useState([16]);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [generatedString, setGeneratedString] = useState('');
  const [copied, setCopied] = useState(false);

  const generateString = () => {
    let chars = '';
    if (includeNumbers) chars += '0123456789';
    if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      setGeneratedString('');
      return;
    }

    let result = '';
    for (let i = 0; i < length[0]; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedString(result);
  };

  const handleCopy = async () => {
    if (!generatedString) return;
    
    try {
      await navigator.clipboard.writeText(generatedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const hasAnyCharType = includeNumbers || includeLowercase || includeUppercase || includeSpecial;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：设置面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">随机字符生成器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-sm font-medium">字符长度</Label>
              <span className="text-sm font-semibold text-primary">{length[0]}</span>
            </div>
            <Slider
              value={length}
              onValueChange={setLength}
              min={1}
              max={1000}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">包含字符类型</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="numbers"
                  checked={includeNumbers}
                  onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
                  className="w-5 h-5"
                />
                <Label htmlFor="numbers" className="cursor-pointer text-sm">数字 (0-9)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lowercase"
                  checked={includeLowercase}
                  onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
                  className="w-5 h-5"
                />
                <Label htmlFor="lowercase" className="cursor-pointer text-sm">小写字母 (a-z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uppercase"
                  checked={includeUppercase}
                  onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
                  className="w-5 h-5"
                />
                <Label htmlFor="uppercase" className="cursor-pointer text-sm">大写字母 (A-Z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="special"
                  checked={includeSpecial}
                  onCheckedChange={(checked) => setIncludeSpecial(checked as boolean)}
                  className="w-5 h-5"
                />
                <Label htmlFor="special" className="cursor-pointer text-sm">特殊符号</Label>
              </div>
            </div>
            {!hasAnyCharType && (
              <p className="text-sm text-destructive font-medium">请至少选择一种字符类型</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generateString}
              className="flex-1"
              disabled={!hasAnyCharType}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              生成
            </Button>
            <Button
              onClick={handleCopy}
              disabled={!generatedString}
              variant="outline"
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
        </CardContent>
      </Card>

      {/* 右侧：结果展示 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">生成结果</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedString ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">
                  长度: {generatedString.length}
                </span>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm break-all leading-relaxed">
                  {generatedString}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Wand2 className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="点击生成按钮创建随机字符串"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
