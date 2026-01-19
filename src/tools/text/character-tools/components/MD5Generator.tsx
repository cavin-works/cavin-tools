import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Check, Hash, Lock } from 'lucide-react';

export function MD5Generator() {
  const [inputText, setInputText] = useState('');
  const [md5Hash, setMD5Hash] = useState('');
  const [copied, setCopied] = useState(false);

  const generateMD5 = async (text: string) => {
    if (!text) {
      setMD5Hash('');
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setMD5Hash(hashHex);
    } catch (error) {
      console.error('MD5 生成失败:', error);
      setMD5Hash('错误: 无法生成哈希值');
    }
  };

  useEffect(() => {
    generateMD5(inputText);
  }, [inputText]);

  const handleCopy = async () => {
    if (!md5Hash) return;
    
    try {
      await navigator.clipboard.writeText(md5Hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setMD5Hash('');
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Lock className="w-6 h-6" />
          MD5 生成器
        </CardTitle>
        <CardDescription className="text-base">为输入的文本生成 SHA-256 哈希值</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="space-y-3">
          <Label htmlFor="md5-input" className="text-base font-medium">输入文本</Label>
          <Textarea
            id="md5-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入要生成哈希值的文本..."
            className="min-h-[180px] p-4 text-base resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleClear} 
            variant="outline"
            disabled={!inputText}
            className="h-11 px-6 text-base"
          >
            清空
          </Button>
        </div>

        {md5Hash && (
          <div className="space-y-4 p-6 bg-muted rounded-xl border-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Hash className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base font-medium">SHA-256 哈希值</Label>
              </div>
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
            <p className="font-mono text-base break-all word-break-all leading-loose">
              {md5Hash}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              长度: {md5Hash.length} 个字符 (SHA-256)
            </p>
          </div>
        )}

        {!md5Hash && inputText && (
          <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-base">正在生成哈希值...</p>
          </div>
        )}

        {!md5Hash && !inputText && (
          <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
            <div className="space-y-4">
              <Lock className="w-16 h-16 mx-auto opacity-30" />
              <p className="text-base">输入文本后将自动生成哈希值</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
