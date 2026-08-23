import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, Fingerprint } from 'lucide-react';

export function UuidGenerator() {
  const [count, setCount] = useState('1');
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleGenerate = () => {
    const n = Number(count);
    const result: string[] = [];
    for (let i = 0; i < n; i++) {
      result.push(crypto.randomUUID());
    }
    setUuids(result);
  };

  const handleCopy = async (text: string, index: number | 'all') => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      if (index === 'all') {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } else {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const copyButton = (copied: boolean) => (
    <>
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
    </>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">UUID 生成器 (v4)</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger id="uuid-count" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 个</SelectItem>
                <SelectItem value="5">5 个</SelectItem>
                <SelectItem value="10">10 个</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate}>生成</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {uuids.length > 0 ? (
          <div className="space-y-3">
            {uuids.map((uuid, i) => (
              <div
                key={`${uuid}-${i}`}
                className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg"
              >
                <p className="font-mono text-sm break-all">{uuid}</p>
                <Button
                  onClick={() => handleCopy(uuid, i)}
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  {copyButton(copiedIndex === i)}
                </Button>
              </div>
            ))}
            {uuids.length > 1 && (
              <Button
                onClick={() => handleCopy(uuids.join('\n'), 'all')}
                variant="outline"
                size="sm"
              >
                {copyButton(copiedAll)}
                全部
              </Button>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Fingerprint className="w-6 h-6 text-muted-foreground" />}
            title="暂无结果"
            description="选择数量后点击生成按钮"
          />
        )}
      </CardContent>
    </Card>
  );
}
