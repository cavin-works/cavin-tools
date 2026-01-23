import { useEffect, useState } from 'react';
import { useCaptureStore } from './store/captureStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, Square, Trash2, Shield, Copy, Search, X, Monitor, RefreshCw, Download, Check, AlertTriangle } from 'lucide-react';
import type { CapturedRequest, ApplicationInfo, WinDivertInfo } from './types';

export function PacketCapture() {
  const {
    requests,
    selectedRequest,
    filter,
    proxyStatus,
    caInfo,
    isLoading,
    error,
    applications,
    selectedApps,
    appSearchQuery,
    windivertInfo,
    isDownloadingWinDivert,
    winDivertDownloadProgress,
    init,
    startCapture,
    stopCapture,
    clearRequests,
    setSelectedRequest,
    setFilter,
    getFilteredRequests,
    loadApplications,
    searchApplications,
    selectApp,
    unselectApp,
    clearSelectedApps,
    getWinDivertInfo,
    downloadWinDivert,
  } = useCaptureStore();

  const [showCertInfo, setShowCertInfo] = useState(false);
  const [showAppSelector, setShowAppSelector] = useState(false);

  useEffect(() => {
    init();
    loadApplications();
    getWinDivertInfo();
  }, [init, loadApplications, getWinDivertInfo]);

  const filteredRequests = getFilteredRequests();

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/20 text-green-400',
      POST: 'bg-blue-500/20 text-blue-400',
      PUT: 'bg-yellow-500/20 text-yellow-400',
      DELETE: 'bg-red-500/20 text-red-400',
      PATCH: 'bg-purple-500/20 text-purple-400',
    };
    return colors[method] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-400';
    if (code >= 300 && code < 400) return 'text-yellow-400';
    if (code >= 400 && code < 500) return 'text-orange-400';
    if (code >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        {proxyStatus.running ? (
          <Button variant="destructive" size="sm" onClick={stopCapture} disabled={isLoading}>
            <Square className="w-4 h-4 mr-1" />
            停止
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={() => startCapture()} disabled={isLoading}>
            <Play className="w-4 h-4 mr-1" />
            开始抓包
          </Button>
        )}

        <Button 
          variant={showAppSelector ? 'secondary' : 'outline'} 
          size="sm" 
          onClick={() => setShowAppSelector(!showAppSelector)}
        >
          <Monitor className="w-4 h-4 mr-1" />
          选择应用
          {selectedApps.length > 0 && (
            <Badge variant="default" className="ml-1 text-xs">{selectedApps.length}</Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={clearRequests} disabled={requests.length === 0}>
          <Trash2 className="w-4 h-4 mr-1" />
          清空
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowCertInfo(!showCertInfo)}>
          <Shield className="w-4 h-4 mr-1" />
          证书
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索 URL..."
            className="pl-8 w-64 h-8"
            value={filter.url_pattern || ''}
            onChange={(e) => setFilter({ ...filter, url_pattern: e.target.value })}
          />
        </div>

        <Badge variant={proxyStatus.running ? 'default' : 'secondary'}>
          {proxyStatus.running ? `运行中 :${proxyStatus.port}` : '已停止'}
        </Badge>

        <Badge variant="outline">{requests.length} 请求</Badge>
      </div>

      {showAppSelector && (
        <div className="p-3 bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索应用..."
                className="pl-8 h-8"
                value={appSearchQuery}
                onChange={(e) => searchApplications(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={loadApplications}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {selectedApps.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelectedApps}>
                清除选择
              </Button>
            )}
          </div>
          
          {selectedApps.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedApps.map((app) => (
                <Badge key={app.exe_path} variant="default" className="flex items-center gap-1">
                  {app.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => unselectApp(app)} />
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="h-32">
            <div className="grid grid-cols-3 gap-1">
              {applications.map((app) => (
                <AppItem 
                  key={app.exe_path} 
                  app={app} 
                  isSelected={selectedApps.some(a => a.exe_path === app.exe_path)}
                  onSelect={() => selectApp(app)}
                  onUnselect={() => unselectApp(app)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showCertInfo && caInfo && (
        <div className="p-3 bg-muted/50 border-b border-border/50 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">HTTPS 证书配置</span>
          </div>
          <p className="text-muted-foreground mb-2">
            要抓取 HTTPS 请求，需要安装 CA 证书到系统信任存储。
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background px-2 py-1 rounded">{caInfo.path}</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(caInfo.path)}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm border-b border-border/50">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-border/50">
          <ScrollArea className="h-full">
            <div className="divide-y divide-border/30">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-2 cursor-pointer hover:bg-muted/50 ${
                    selectedRequest?.id === req.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={`${getMethodColor(req.method)} font-mono text-xs`}>
                      {req.method}
                    </Badge>
                    {req.response && (
                      <span className={`text-xs font-mono ${getStatusColor(req.response.status_code)}`}>
                        {req.response.status_code}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {req.duration_ms ? `${req.duration_ms}ms` : '...'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {req.scheme}
                    </Badge>
                  </div>
                  <div className="text-sm truncate mt-1">{req.host}{req.path}</div>
                </div>
              ))}
              {filteredRequests.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {proxyStatus.running
                    ? '等待请求...'
                    : '点击"开始抓包"开始捕获网络请求'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="w-1/2">
          {selectedRequest ? (
            <RequestDetail request={selectedRequest} />
          ) : windivertInfo ? (
            <WinDivertSettings 
              windivertInfo={windivertInfo} 
              isDownloading={isDownloadingWinDivert}
              downloadProgress={winDivertDownloadProgress}
              onDownload={downloadWinDivert}
              onRefresh={getWinDivertInfo}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              选择一个请求查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppItem({ 
  app, 
  isSelected, 
  onSelect, 
  onUnselect 
}: { 
  app: ApplicationInfo; 
  isSelected: boolean;
  onSelect: () => void;
  onUnselect: () => void;
}) {
  return (
    <div 
      className={`p-2 rounded cursor-pointer text-xs truncate ${
        isSelected ? 'bg-primary/20 border border-primary/50' : 'bg-muted/50 hover:bg-muted'
      }`}
      onClick={isSelected ? onUnselect : onSelect}
      title={app.exe_path}
    >
      <div className="font-medium truncate">{app.name}</div>
      <div className="text-muted-foreground truncate">{app.pids.length} 进程</div>
    </div>
  );
}

function RequestDetail({ request }: { request: CapturedRequest }) {
  const [tab, setTab] = useState<'request' | 'response'>('request');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-border/50">
        <Button
          variant={tab === 'request' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('request')}
        >
          请求
        </Button>
        <Button
          variant={tab === 'response' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('response')}
        >
          响应
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {tab === 'request' ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">URL</div>
              <code className="text-sm break-all">{request.url}</code>
            </div>

            <Separator />

            <div>
              <div className="text-xs text-muted-foreground mb-2">请求头</div>
              <div className="space-y-1">
                {Object.entries(request.request_headers).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-blue-400">{key}:</span>{' '}
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {request.request_body_text && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-2">请求体</div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                    {formatBody(request.request_body_text)}
                  </pre>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {request.response ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <span className="font-mono">
                    {request.response.status_code} {request.response.status_text}
                  </span>
                </div>

                <Separator />

                <div>
                  <div className="text-xs text-muted-foreground mb-2">响应头</div>
                  <div className="space-y-1">
                    {Object.entries(request.response.headers).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-green-400">{key}:</span>{' '}
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {request.response.body_text && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">响应体</div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                        {formatBody(request.response.body_text)}
                      </pre>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">等待响应...</div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function WinDivertSettings({ 
  windivertInfo, 
  isDownloading, 
  downloadProgress,
  onDownload,
  onRefresh 
}: { 
  windivertInfo: WinDivertInfo | null;
  isDownloading: boolean;
  downloadProgress: { current: number; total: number; percentage: number } | null;
  onDownload: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">WinDivert 驱动配置</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {windivertInfo?.installed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-medium">已安装</div>
                  <div className="text-muted-foreground">版本 {windivertInfo.version}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                位置: {windivertInfo.path}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="font-medium">未安装</div>
                  <div className="text-muted-foreground">需要下载 WinDivert 驱动才能抓包</div>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={onDownload} 
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? '下载中...' : '下载 WinDivert 驱动'}
              </Button>
            </div>
          )}

          {isDownloading && downloadProgress && (
            <div className="space-y-2">
              <div className="text-sm font-medium">下载进度</div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all" 
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {downloadProgress.percentage}%
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="font-medium">说明</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>WinDivert 是 Windows 内核驱动，用于拦截网络流量</li>
              <li>需要管理员权限才能正常工作</li>
              <li>驱动文件将下载到应用数据目录</li>
              <li>macOS 当前不支持此功能</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function formatBody(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export default PacketCapture;
