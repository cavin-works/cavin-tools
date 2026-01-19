import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RandomStringGenerator } from './components/RandomStringGenerator';
import { Base64Converter } from './components/Base64Converter';
import { MD5Generator } from './components/MD5Generator';
import { JSONFormatter } from './components/JSONFormatter';

export function CharacterTools() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            字符处理工具
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            快速处理文本、编码、格式化等常见任务
          </p>
        </div>

        <Tabs defaultValue="random" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
            <TabsTrigger value="random" className="py-3 text-sm sm:text-base">
              随机字符
            </TabsTrigger>
            <TabsTrigger value="base64" className="py-3 text-sm sm:text-base">
              Base64
            </TabsTrigger>
            <TabsTrigger value="md5" className="py-3 text-sm sm:text-base">
              MD5
            </TabsTrigger>
            <TabsTrigger value="json" className="py-3 text-sm sm:text-base">
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="random" className="mt-8">
            <div className="max-w-2xl mx-auto">
              <RandomStringGenerator />
            </div>
          </TabsContent>

          <TabsContent value="base64" className="mt-8">
            <div className="max-w-2xl mx-auto">
              <Base64Converter />
            </div>
          </TabsContent>

          <TabsContent value="md5" className="mt-8">
            <div className="max-w-2xl mx-auto">
              <MD5Generator />
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4 flex-1">
            <div className="h-full">
              <JSONFormatter />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
