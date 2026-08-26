import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, Hash } from 'lucide-react';

export function MD5Generator() {
  const [inputText, setInputText] = useState('');
  const [md5Hash, setMD5Hash] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inputText) {
      setMD5Hash('');
      return;
    }

    // invoke 是异步的：组件卸载（切换 Tab）后不再 setState
    let cancelled = false;
    invoke<string>('hash_md5', { text: inputText })
      .then((hash) => {
        if (!cancelled) setMD5Hash(hash);
      })
      .catch((error) => {
        console.error('MD5 生成失败:', error);
        if (!cancelled) setMD5Hash('错误: 无法生成哈希值');
      });
    return () => {
      cancelled = true;
    };
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：输入 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">输入文本</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="md5-input"
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
            <CardTitle className="text-lg">MD5 哈希值</CardTitle>
            {md5Hash && (
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
          {md5Hash ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm break-all leading-relaxed">
                  {md5Hash}
                </p>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                长度: {md5Hash.length} 个字符 (MD5)
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
