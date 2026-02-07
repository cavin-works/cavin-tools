import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RandomStringGenerator } from './components/RandomStringGenerator';
import { Base64Converter } from './components/Base64Converter';
import { MD5Generator } from './components/MD5Generator';
import { JSONFormatter } from './components/JSONFormatter';

export function CharacterTools() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            字符处理工具
          </h1>
        </div>

        <Tabs defaultValue="random" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-10 mb-6">
            <TabsTrigger value="random" className="text-sm">
              随机字符
            </TabsTrigger>
            <TabsTrigger value="base64" className="text-sm">
              Base64
            </TabsTrigger>
            <TabsTrigger value="md5" className="text-sm">
              MD5
            </TabsTrigger>
            <TabsTrigger value="json" className="text-sm">
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="random" className="mt-6">
            <RandomStringGenerator />
          </TabsContent>

          <TabsContent value="base64" className="mt-6">
            <Base64Converter />
          </TabsContent>

          <TabsContent value="md5" className="mt-6">
            <MD5Generator />
          </TabsContent>

          <TabsContent value="json" className="mt-6">
            <JSONFormatter />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
