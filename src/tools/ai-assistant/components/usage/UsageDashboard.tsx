import { useState } from "react";
import { useTranslation } from "react-i18next";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UsageSummaryCards } from "./UsageSummaryCards";
import { UsageTrendChart } from "./UsageTrendChart";
import { RequestLogTable } from "./RequestLogTable";
import { ProviderStatsTable } from "./ProviderStatsTable";
import { ModelStatsTable } from "./ModelStatsTable";
import type { TimeRange } from "@ai-assistant/types/usage";
import { usageApi } from "@ai-assistant/lib/api/usage";
import { extractErrorMessage } from "@ai-assistant/utils/errorUtils";
import { motion } from "framer-motion";
import { BarChart3, ListFilter, Activity, Download, Loader2 } from "lucide-react";

export function UsageDashboard() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>("1d");
  const [exporting, setExporting] = useState(false);

  const days = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30;

  const handleExportCsv = async () => {
    const path = await save({
      defaultPath: `mnemosyne-usage-${timeRange}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!path) return;

    setExporting(true);
    try {
      const count = await usageApi.exportCsv(days, path);
      toast.success(t("usage.exportSuccess", { count }));
    } catch (e) {
      toast.error(extractErrorMessage(e) || t("usage.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">{t("usage.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("usage.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tabs
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRange)}
            className="w-full sm:w-auto"
          >
            <TabsList className="flex w-full sm:w-auto bg-card/60 border border-border/50 backdrop-blur-sm shadow-sm h-10 p-1">
              <TabsTrigger
                value="1d"
                className="flex-1 sm:flex-none sm:px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-primary transition-colors"
              >
                {t("usage.today")}
              </TabsTrigger>
              <TabsTrigger
                value="7d"
                className="flex-1 sm:flex-none sm:px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-primary transition-colors"
              >
                {t("usage.last7days")}
              </TabsTrigger>
              <TabsTrigger
                value="30d"
                className="flex-1 sm:flex-none sm:px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-primary transition-colors"
              >
                {t("usage.last30days")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-2"
            disabled={exporting}
            onClick={handleExportCsv}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("usage.exportCsv")}
          </Button>
        </div>
      </div>

      <UsageSummaryCards days={days} />

      <UsageTrendChart days={days} />

      <div className="space-y-4">
        <Tabs defaultValue="logs" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="logs" className="gap-2">
                <ListFilter className="h-4 w-4" />
                {t("usage.requestLogs")}
              </TabsTrigger>
              <TabsTrigger value="providers" className="gap-2">
                <Activity className="h-4 w-4" />
                {t("usage.providerStats")}
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("usage.modelStats")}
              </TabsTrigger>
            </TabsList>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TabsContent value="logs" className="mt-0">
              <RequestLogTable />
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              <ProviderStatsTable />
            </TabsContent>

            <TabsContent value="models" className="mt-0">
              <ModelStatsTable />
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </motion.div>
  );
}
