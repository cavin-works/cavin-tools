import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Copy, Check, AlertCircle, Clock, ArrowLeftRight } from 'lucide-react';

interface TimeResult {
  local: string;
  utc: string;
}

function format(date: Date): TimeResult {
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const utc = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  return { local: `${local} (本地)`, utc: `${utc} (UTC)` };
}

export function TimestampConverter() {
  const [inputText, setInputText] = useState('');
  const [timeResult, setTimeResult] = useState<TimeResult | null>(null);
  const [tsResult, setTsResult] = useState<{ seconds: string; millis: string } | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [copiedField, setCopiedField] = useState('');

  // 顶部当前时间戳实时刷新（每秒）
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isTimestamp = (text: string) => /^\d{10}$|^\d{13}$/.test(text.trim());

  const handleConvert = (raw?: string) => {
    const text = (raw ?? inputText).trim();
    setError('');
    setTimeResult(null);
    setTsResult(null);

    if (!text) {
      setError('请输入时间戳或时间');
      return;
    }

    if (isTimestamp(text)) {
      // 13 位按毫秒，10 位按秒
      const date = new Date(text.length === 13 ? Number(text) : Number(text) * 1000);
      if (Number.isNaN(date.getTime())) {
        setError('无效的时间戳');
        return;
      }
      setTimeResult(format(date));
    } else {
      const date = new Date(text.replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) {
        setError('无效的时间格式，请使用 YYYY-MM-DD HH:mm:ss');
        return;
      }
      const ms = date.getTime();
      setTsResult({ seconds: String(Math.floor(ms / 1000)), millis: String(ms) });
    }
  };

  const swapDirection = () => {
    setError('');
    const next = timeResult ? timeResult.local.replace(' (本地)', '') : tsResult ? tsResult.seconds : '';
    setInputText(next);
    setTimeResult(null);
    setTsResult(null);
    if (next) handleConvert(next);
  };

  const handleCopy = async (text: string, field: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setTimeResult(null);
    setTsResult(null);
    setError('');
  };

  const copyButton = (text: string, field: string) => (
    <Button onClick={() => handleCopy(text, field)} variant="ghost" size="sm">
      {copiedField === field ? (
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
  );

  return (
    <div className="space-y-6">
      {/* 当前时间戳 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">当前时间戳</CardTitle>
            {copyButton(String(Math.floor(now / 1000)), 'now-s')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm">
            <span>
              秒: <span className="text-primary font-semibold">{Math.floor(now / 1000)}</span>
            </span>
            <span>
              毫秒: <span className="text-primary font-semibold">{now}</span>
            </span>
            <span className="text-muted-foreground">{format(new Date(now)).local}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：输入 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">输入（时间戳或时间）</CardTitle>
              <Button
                onClick={swapDirection}
                variant="outline"
                size="sm"
                title="结果回填为输入"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                反向转换
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="timestamp-input"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
              placeholder="输入 Unix 时间戳（10 位秒 / 13 位毫秒）或时间（YYYY-MM-DD HH:mm:ss）"
              className="font-mono text-sm"
            />

            <div className="flex gap-3">
              <Button
                onClick={() => handleConvert()}
                className="flex-1"
                disabled={!inputText.trim()}
              >
                <Clock className="w-4 h-4 mr-2" />
                转换
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={!inputText}
              >
                清空
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              自动识别：10 位数字按秒、13 位数字按毫秒解析；其他内容按 YYYY-MM-DD HH:mm:ss 解析
            </p>

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
            <CardTitle className="text-lg">输出</CardTitle>
          </CardHeader>
          <CardContent>
            {timeResult ? (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm">{timeResult.local}</p>
                    {copyButton(timeResult.local.replace(' (本地)', ''), 'local')}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm">{timeResult.utc}</p>
                    {copyButton(timeResult.utc.replace(' (UTC)', ''), 'utc')}
                  </div>
                </div>
              </div>
            ) : tsResult ? (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    秒: <span className="text-primary font-semibold">{tsResult.seconds}</span>
                  </p>
                  {copyButton(tsResult.seconds, 'seconds')}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    毫秒: <span className="text-primary font-semibold">{tsResult.millis}</span>
                  </p>
                  {copyButton(tsResult.millis, 'millis')}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Clock className="w-6 h-6 text-muted-foreground" />}
                title="暂无结果"
                description="输入时间戳或时间后点击转换按钮"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
