import { useState, useMemo, useEffect } from 'react';
import { Plus, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import type { Provider } from '@ai-assistant/types';
import { PageLayout } from '@ai-assistant/components/shared/PageLayout';
import { ProviderList } from '@ai-assistant/components/providers/ProviderList';
import { AddProviderDialog } from '@ai-assistant/components/providers/AddProviderDialog';
import { EditProviderDialog } from '@ai-assistant/components/providers/EditProviderDialog';
import { ConfirmDialog } from '@ai-assistant/components/ConfirmDialog';
import { AppSwitcher } from '@ai-assistant/components/AppSwitcher';
import { ProxyToggle } from '@ai-assistant/components/proxy/ProxyToggle';
import { FailoverToggle } from '@ai-assistant/components/proxy/FailoverToggle';
import UsageScriptModal from '@ai-assistant/components/UsageScriptModal';
import { useAiAssistant } from '@ai-assistant/context/AiAssistantContext';
import { useProvidersQuery, useSettingsQuery } from '@ai-assistant/lib/query';
import { useProviderActions } from '@ai-assistant/hooks/useProviderActions';
import { useProxyStatus } from '@ai-assistant/hooks/useProxyStatus';
import { useLastValidValue } from '@ai-assistant/hooks/useLastValidValue';
import { providersApi } from '@ai-assistant/lib/api';
import { extractErrorMessage } from '@ai-assistant/utils/errorUtils';
import { settingsApi } from '@ai-assistant/lib/api';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/core/store/appStore';

/**
 * AI 供应商管理页面
 *
 * 独立的供应商管理工具页面
 */
export default function ProvidersPage() {
  const { activeApp, setActiveApp } = useAiAssistant();
  const { setShowSettings } = useAppStore();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [usageProvider, setUsageProvider] = useState<Provider | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    provider: Provider;
    action: 'remove' | 'delete';
  } | null>(null);

  // 使用 Hook 保存最后有效值，用于动画退出期间保持内容显示
  const effectiveEditingProvider = useLastValidValue(editingProvider);
  const effectiveUsageProvider = useLastValidValue(usageProvider);

  // 获取设置中的可见应用
  const { data: settingsData } = useSettingsQuery();
  const visibleApps = settingsData?.visibleApps ?? {
    claude: true,
    codex: true,
    gemini: true,
    opencode: true,
    cursor: true,
  };

  // 获取代理服务状态
  const {
    isRunning: isProxyRunning,
    takeoverStatus,
    status: proxyStatus,
  } = useProxyStatus();

  const isCurrentAppTakeoverActive = takeoverStatus?.[activeApp] || false;
  const activeProviderId = useMemo(() => {
    const target = proxyStatus?.active_targets?.find(
      (t) => t.app_type === activeApp,
    );
    return target?.provider_id;
  }, [proxyStatus?.active_targets, activeApp]);

  // 获取供应商列表
  const { data, isLoading, refetch } = useProvidersQuery(activeApp, {
    isProxyRunning,
  });
  const providers = useMemo(() => data?.providers ?? {}, [data]);
  const currentProviderId = data?.currentProviderId ?? '';

  // 使用 useProviderActions Hook 统一管理所有 Provider 操作
  const {
    addProvider,
    updateProvider,
    switchProvider,
    deleteProvider,
    saveUsageScript,
  } = useProviderActions(activeApp);

  // 监听来自托盘菜单的切换事件
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unsubscribe = await providersApi.onSwitched(async (event) => {
          if (event.appType === activeApp) {
            await refetch();
          }
        });
      } catch (error) {
        console.error('[ProvidersPage] Failed to subscribe provider switch event', error);
      }
    };

    setupListener();
    return () => {
      unsubscribe?.();
    };
  }, [activeApp, refetch]);

  // 监听统一供应商同步事件
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unsubscribe = await listen('universal-provider-synced', async () => {
          await queryClient.invalidateQueries({ queryKey: ['providers'] });
          try {
            await providersApi.updateTrayMenu();
          } catch (error) {
            console.error('[ProvidersPage] Failed to update tray menu', error);
          }
        });
      } catch (error) {
        console.error('[ProvidersPage] Failed to subscribe universal-provider-synced event', error);
      }
    };

    setupListener();
    return () => {
      unsubscribe?.();
    };
  }, [queryClient]);

  // 编辑供应商
  const handleEditProvider = async (provider: Provider) => {
    await updateProvider(provider);
    setEditingProvider(null);
  };

  // 确认删除/移除供应商
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { provider, action } = confirmAction;

    if (action === 'remove') {
      await providersApi.removeFromLiveConfig(provider.id, activeApp);
      await queryClient.invalidateQueries({
        queryKey: ['opencodeLiveProviderIds'],
      });
      toast.success('已从配置移除', { closeButton: true });
    } else {
      await deleteProvider(provider.id);
    }
    setConfirmAction(null);
  };

  // 复制供应商
  const handleDuplicateProvider = async (provider: Provider) => {
    const newSortIndex =
      provider.sortIndex !== undefined ? provider.sortIndex + 1 : undefined;

    const duplicatedProvider: Omit<Provider, 'id' | 'createdAt'> & {
      providerKey?: string;
    } = {
      name: `${provider.name} copy`,
      settingsConfig: JSON.parse(JSON.stringify(provider.settingsConfig)),
      websiteUrl: provider.websiteUrl,
      category: provider.category,
      sortIndex: newSortIndex,
      meta: provider.meta ? JSON.parse(JSON.stringify(provider.meta)) : undefined,
      icon: provider.icon,
      iconColor: provider.iconColor,
    };

    if (activeApp === 'opencode') {
      const existingKeys = Object.keys(providers);
      const baseKey = `${provider.id}-copy`;
      let counter = 2;
      let uniqueKey = baseKey;
      while (existingKeys.includes(uniqueKey)) {
        uniqueKey = `${baseKey}-${counter}`;
        counter++;
      }
      duplicatedProvider.providerKey = uniqueKey;
    }

    if (provider.sortIndex !== undefined) {
      const updates = Object.values(providers)
        .filter(
          (p) =>
            p.sortIndex !== undefined &&
            p.sortIndex >= newSortIndex! &&
            p.id !== provider.id,
        )
        .map((p) => ({
          id: p.id,
          sortIndex: p.sortIndex! + 1,
        }));

      if (updates.length > 0) {
        try {
          await providersApi.updateSortOrder(updates, activeApp);
        } catch (error) {
          console.error('[ProvidersPage] Failed to update sort order', error);
          toast.error('排序更新失败');
          return;
        }
      }
    }

    await addProvider(duplicatedProvider);
  };

  // 打开供应商终端
  const handleOpenTerminal = async (provider: Provider) => {
    try {
      await providersApi.openTerminal(provider.id, activeApp);
      toast.success('终端已打开');
    } catch (error) {
      console.error('[ProvidersPage] Failed to open terminal', error);
      const errorMessage = extractErrorMessage(error);
      toast.error('打开终端失败' + (errorMessage ? `: ${errorMessage}` : ''));
    }
  };

  // 打开网站链接
  const handleOpenWebsite = async (url: string) => {
    try {
      await settingsApi.openExternal(url);
    } catch (error) {
      const detail = extractErrorMessage(error) || '链接打开失败';
      toast.error(detail);
    }
  };

  return (
    <PageLayout
      actions={
        <>
          {activeApp !== 'opencode' && (
            <>
              <ProxyToggle activeApp={activeApp} />
              {isCurrentAppTakeoverActive && (
                <FailoverToggle activeApp={activeApp} />
              )}
            </>
          )}
          {isCurrentAppTakeoverActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="使用统计"
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
          )}
          <AppSwitcher
            activeApp={activeApp}
            onSwitch={setActiveApp}
            visibleApps={visibleApps}
            compact={
              isCurrentAppTakeoverActive &&
              Object.values(visibleApps).filter(Boolean).length >= 4
            }
          />
          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            添加供应商
          </Button>
        </>
      }
      className="!pt-4 pb-12"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeApp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ProviderList
            providers={providers}
            currentProviderId={currentProviderId}
            appId={activeApp}
            isLoading={isLoading}
            isProxyRunning={isProxyRunning}
            isProxyTakeover={isProxyRunning && isCurrentAppTakeoverActive}
            activeProviderId={activeProviderId}
            onSwitch={switchProvider}
            onEdit={setEditingProvider}
            onDelete={(provider) =>
              setConfirmAction({ provider, action: 'delete' })
            }
            onRemoveFromConfig={
              activeApp === 'opencode'
                ? (provider) => setConfirmAction({ provider, action: 'remove' })
                : undefined
            }
            onDuplicate={handleDuplicateProvider}
            onConfigureUsage={setUsageProvider}
            onOpenWebsite={handleOpenWebsite}
            onOpenTerminal={
              activeApp === 'claude' ? handleOpenTerminal : undefined
            }
            onCreate={() => setIsAddOpen(true)}
          />
        </motion.div>
      </AnimatePresence>

      <AddProviderDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        appId={activeApp}
        onSubmit={addProvider}
      />

      <EditProviderDialog
        open={Boolean(editingProvider)}
        provider={effectiveEditingProvider}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProvider(null);
          }
        }}
        onSubmit={handleEditProvider}
        appId={activeApp}
        isProxyTakeover={isProxyRunning && isCurrentAppTakeoverActive}
      />

      {effectiveUsageProvider && (
        <UsageScriptModal
          key={effectiveUsageProvider.id}
          provider={effectiveUsageProvider}
          appId={activeApp}
          isOpen={Boolean(usageProvider)}
          onClose={() => setUsageProvider(null)}
          onSave={(script) => {
            if (usageProvider) {
              void saveUsageScript(usageProvider, script);
            }
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction?.action === 'remove'
            ? '移除供应商'
            : '删除供应商'
        }
        message={
          confirmAction
            ? confirmAction.action === 'remove'
              ? `确定要从配置中移除 ${confirmAction.provider.name} 吗？`
              : `确定要删除 ${confirmAction.provider.name} 吗？`
            : ''
        }
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => setConfirmAction(null)}
      />
    </PageLayout>
  );
}
