import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, Hash } from 'lucide-react';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

export function ShaGenerator() {
  const [inputText, setInputText] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256');
  const [hashHex, setHashHex] = useState('');
  const [copied, setCopied] = useState(false);

  const generateHash = async (text: string, algo: Algorithm) => {
    if (!text) {
      setHashHex('');
      return;
    }

    try {
      const data = new TextEncoder().encode(text);
      const buffer = await crypto.subtle.digest(algo, data);
      const hex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setHashHex(hex);
    } catch (error) {
      console.error('哈希生成失败:', error);
      setHashHex('错误: 无法生成哈希值');
    }
  };

  useEffect(() => {
    generateHash(inputText, algorithm);
  }, [inputText, algorithm]);

  const handleCopy = async () => {
    if (!hashHex) return;

    try {
      await navigator.clipboard.writeText(hashHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setHashHex('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：输入 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">输入文本</CardTitle>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
              <SelectTrigger id="sha-algorithm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALGORITHMS.map((algo) => (
                  <SelectItem key={algo} value={algo}>
                    {algo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="sha-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入要生成哈希值的文本..."
            className="min-h-[240px] text-sm resize-none"
          />

          <Button
            onClick={handleClear}
            variant="outline"
            disabled={!inputText}
          >
            清空
          </Button>
        </CardContent>
      </Card>

      {/* 右侧：结果 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{algorithm} 哈希值</CardTitle>
            {hashHex && (
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
          {hashHex ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm break-all leading-relaxed">
                  {hashHex}
                </p>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                长度: {hashHex.length} 个字符 ({algorithm})
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<Hash className="w-6 h-6 text-muted-foreground" />}
              title="暂无结果"
              description="输入文本后将自动生成哈希值"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
