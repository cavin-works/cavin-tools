import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ThemeSection } from './components/ThemeSection';
import { ColorThemeSection } from './components/ColorThemeSection';
import { GeneralSection } from './components/GeneralSection';
import { StorageSection } from './components/StorageSection';
import { AboutSection } from './components/AboutSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

/**
 * 设置页面 - 使用 Tabs 组织
 */
export function SettingsPage() {
  const { setShowSettings } = useAppStore();

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(false)}
            className="-ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">设置</h1>
        </div>

        {/* Tabs 布局 */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="storage">存储</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <ThemeSection />
            <ColorThemeSection />
          </TabsContent>

          <TabsContent value="general">
            <GeneralSection />
          </TabsContent>

          <TabsContent value="storage">
            <StorageSection />
          </TabsContent>

          <TabsContent value="about">
            <AboutSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
