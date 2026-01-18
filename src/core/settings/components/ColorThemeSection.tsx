import { useAppStore } from '../../store/appStore';
import {
  getAllColorThemes,
  type ColorThemeId,
} from '../../theme/themeConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 配色主题选择区
 */
export function ColorThemeSection() {
  const { colorTheme, setColorTheme } = useAppStore();
  const themes = getAllColorThemes();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">配色主题</h2>
        <p className="text-sm text-muted-foreground">选择你喜欢的配色方案</p>
      </div>

      <RadioGroup value={colorTheme} onValueChange={(value) => setColorTheme(value as ColorThemeId)}>
        <div className="grid grid-cols-1 gap-4">
          {themes.map((theme) => (
            <Label
              key={theme.id}
              htmlFor={theme.id}
              className="cursor-pointer"
            >
              <Card
                className={cn(
                  "transition-all cursor-pointer hover:border-primary/50",
                  colorTheme === theme.id && "border-primary ring-2 ring-primary/20"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* 单选按钮 */}
                    <div className="flex items-center pt-0.5">
                      <RadioGroupItem value={theme.id} id={theme.id} />
                    </div>

                    {/* 预览色块 */}
                    <div className="flex gap-2 flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                        style={{ background: theme.previewColor.light }}
                      />
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                        style={{ background: theme.previewColor.dark }}
                      />
                    </div>

                    {/* 主题信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {theme.name}
                        </h3>
                        {colorTheme === theme.id && (
                          <Badge variant="default" className="h-5 px-2 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            使用中
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {theme.description}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {theme.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          ))}
        </div>
      </RadioGroup>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">提示</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• 配色主题独立于明暗模式,你可以自由组合</p>
          <p>• 左侧色块为浅色模式预览,右侧为深色模式预览</p>
          <p>• 主题会立即应用到整个应用</p>
        </CardContent>
      </Card>
    </div>
  );
}
