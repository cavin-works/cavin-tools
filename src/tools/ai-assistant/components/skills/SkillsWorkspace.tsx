import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  CircleDashed,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Globe,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Upload,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddSkillRepo,
  useImportSkillsFromApps,
  useInstallSkill,
  useInstalledSkills,
  useScanUnmanagedSkills,
  useToggleSkillApp,
  useUninstallSkill,
  type AppType,
  type DiscoverableSkill,
  type InstalledSkill,
} from "@ai-assistant/hooks/useSkills";
import { settingsApi } from "@ai-assistant/lib/api";
import {
  skillsApi,
  type SkillsShCategory,
  type SkillsShSkill,
} from "@ai-assistant/lib/api/skills";

type SkillsSection = "manage" | "local" | "install" | "settings";
type InstallTab = "browse" | "local" | "git";

interface RepoTarget {
  owner: string;
  name: string;
  branch: string;
  directoryHint?: string;
}

interface ToolStatusView {
  id: string;
  name: string;
  code: string;
  installed: boolean;
  version?: string;
}

interface TauriConfigStatus {
  exists: boolean;
  path: string;
}

interface LocalFileWithPath extends File {
  path?: string;
}

const SKILL_APP_TOGGLES: Array<{ label: string; app: AppType }> = [
  { label: "Cursor", app: "cursor" },
  { label: "Claude Code", app: "claude" },
  { label: "Codex", app: "codex" },
  { label: "OpenCode", app: "opencode" },
  { label: "Gemini CLI", app: "gemini" },
];

const EXTERNAL_SYNC_APPS: string[] = ["Antigravity", "TRAE IDE"];

const BROWSE_CATEGORY_META: Record<
  SkillsShCategory,
  { label: string; icon: typeof Flame }
> = {
  hot: { label: "热门", icon: Flame },
  trending: { label: "趋势", icon: TrendingUp },
  "all-time": { label: "总榜", icon: Clock3 },
};

const TOOL_STATUS_ORDER: Array<{ id: string; name: string; code: string }> = [
  { id: "cursor", name: "Cursor", code: "cursor" },
  { id: "claude", name: "Claude Code", code: "claude_code" },
  { id: "codex", name: "Codex", code: "codex" },
  { id: "opencode", name: "OpenCode", code: "opencode" },
  { id: "antigravity", name: "Antigravity", code: "antigravity" },
  { id: "amp", name: "Amp", code: "amp" },
  { id: "kilo_code", name: "Kilo Code", code: "kilo_code" },
  { id: "roo_code", name: "Roo Code", code: "roo_code" },
  { id: "goose", name: "Goose", code: "goose" },
  { id: "gemini", name: "Gemini CLI", code: "gemini_cli" },
  { id: "github_copilot", name: "GitHub Copilot", code: "github_copilot" },
  { id: "clawdbot", name: "Clawdbot", code: "clawdbot" },
  { id: "droid", name: "Droid", code: "droid" },
  { id: "windsurf", name: "Windsurf", code: "windsurf" },
  { id: "trae", name: "TRAE IDE", code: "trae" },
];

function parseRepoTarget(rawInput: string): RepoTarget | null {
  const input: string = rawInput.trim().replace(/\.git$/i, "");
  if (input.length === 0) {
    return null;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return null;
    }

    const host: string = url.hostname.toLowerCase();
    if (!host.endsWith("github.com")) {
      return null;
    }

    const segments: string[] = url.pathname
      .split("/")
      .map((segment: string) => segment.trim())
      .filter((segment: string) => segment.length > 0);

    if (segments.length < 2) {
      return null;
    }

    const owner: string = segments[0];
    const name: string = segments[1];
    let branch: string = "main";
    let directoryHint: string | undefined;

    if (segments[2] === "tree" && segments[3]) {
      branch = segments[3];
      if (segments.length > 4) {
        directoryHint = segments.slice(4).join("/");
      }
    }

    return { owner, name, branch, directoryHint };
  }

  const shortSegments: string[] = input
    .split("/")
    .map((segment: string) => segment.trim())
    .filter((segment: string) => segment.length > 0);

  if (shortSegments.length < 2) {
    return null;
  }

  return {
    owner: shortSegments[0],
    name: shortSegments[1],
    branch: "main",
  };
}

function formatTimestamp(value: number): string {
  const millis: number = value < 1_000_000_000_000 ? value * 1000 : value;
  const date: Date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function resolveSkillSource(skill: InstalledSkill): string {
  if (skill.repoOwner && skill.repoName) {
    return `https://github.com/${skill.repoOwner}/${skill.repoName}`;
  }
  return "本地导入";
}

function ensureRepoUrl(item: SkillsShSkill): string | null {
  if (item.url && item.url.startsWith("http")) {
    return item.url;
  }
  if (item.repo.length > 0) {
    return `https://github.com/${item.repo}`;
  }
  return null;
}

function pickDiscoverableSkill(
  candidates: DiscoverableSkill[],
  skillNameHint?: string,
  directoryHint?: string,
): DiscoverableSkill | null {
  if (candidates.length === 0) {
    return null;
  }

  if (directoryHint && directoryHint.trim().length > 0) {
    const normalizedDirectoryHint: string = directoryHint.trim().toLowerCase();
    const byDirectory: DiscoverableSkill | undefined = candidates.find(
      (skill: DiscoverableSkill) =>
        skill.directory.toLowerCase() === normalizedDirectoryHint ||
        skill.directory.toLowerCase().endsWith(`/${normalizedDirectoryHint}`),
    );
    if (byDirectory) {
      return byDirectory;
    }
  }

  if (skillNameHint && skillNameHint.trim().length > 0) {
    const normalizedNameHint: string = skillNameHint.trim().toLowerCase();
    const exactName: DiscoverableSkill | undefined = candidates.find(
      (skill: DiscoverableSkill) => skill.name.toLowerCase() === normalizedNameHint,
    );
    if (exactName) {
      return exactName;
    }

    const fuzzyName: DiscoverableSkill | undefined = candidates.find(
      (skill: DiscoverableSkill) =>
        skill.name.toLowerCase().includes(normalizedNameHint) ||
        skill.directory.toLowerCase().includes(normalizedNameHint),
    );
    if (fuzzyName) {
      return fuzzyName;
    }
  }

  return candidates[0];
}

async function loadToolStatuses(): Promise<ToolStatusView[]> {
  const [toolVersions, configStatuses] = await Promise.all([
    settingsApi.getToolVersions(),
    Promise.all([
      settingsApi.getConfigStatus("claude"),
      settingsApi.getConfigStatus("codex"),
      settingsApi.getConfigStatus("gemini"),
      settingsApi.getConfigStatus("opencode"),
      settingsApi.getConfigStatus("cursor"),
    ]),
  ]);

  const versionByName: Map<string, string> = new Map(
    toolVersions
      .filter(
        (item: {
          name: string;
          version: string | null;
          latest_version: string | null;
          error: string | null;
        }) => item.version !== null,
      )
      .map(
        (item: {
          name: string;
          version: string | null;
          latest_version: string | null;
          error: string | null;
        }): [string, string] => [item.name, item.version ?? ""],
      ),
  );

  const [claudeStatus, codexStatus, geminiStatus, opencodeStatus, cursorStatus]:
    TauriConfigStatus[] = configStatuses as TauriConfigStatus[];

  const configInstalledById: Record<string, boolean> = {
    claude: claudeStatus.exists,
    codex: codexStatus.exists,
    gemini: geminiStatus.exists,
    opencode: opencodeStatus.exists,
    cursor: cursorStatus.exists,
  };

  return TOOL_STATUS_ORDER.map(
    (item: { id: string; name: string; code: string }): ToolStatusView => {
      const fromVersion: string | undefined =
        item.id === "claude"
          ? versionByName.get("claude")
          : item.id === "codex"
            ? versionByName.get("codex")
            : item.id === "gemini"
              ? versionByName.get("gemini")
              : undefined;

      const installedFromConfig: boolean = configInstalledById[item.id] ?? false;
      const installed: boolean = installedFromConfig || Boolean(fromVersion);

      return {
        ...item,
        installed,
        version: fromVersion,
      };
    },
  );
}

export function SkillsWorkspace() {
  const [section, setSection] = useState<SkillsSection>("manage");
  const [installTab, setInstallTab] = useState<InstallTab>("browse");
  const [browseCategory, setBrowseCategory] = useState<SkillsShCategory>("hot");
  const [browsePage, setBrowsePage] = useState<number>(1);
  const [manageQuery, setManageQuery] = useState<string>("");
  const [expandedSkillIds, setExpandedSkillIds] = useState<Set<string>>(new Set());
  const [localPathInput, setLocalPathInput] = useState<string>("");
  const [localSkillNameInput, setLocalSkillNameInput] = useState<string>("");
  const [gitRepoInput, setGitRepoInput] = useState<string>("");
  const [gitSkillNameInput, setGitSkillNameInput] = useState<string>("");

  const installedQuery = useInstalledSkills();
  const uninstallMutation = useUninstallSkill();
  const toggleMutation = useToggleSkillApp();
  const scanUnmanagedQuery = useScanUnmanagedSkills();
  const importMutation = useImportSkillsFromApps();
  const addRepoMutation = useAddSkillRepo();
  const installMutation = useInstallSkill();

  const browseQuery = useQuery({
    queryKey: ["skills", "skills-sh", browseCategory, browsePage],
    queryFn: () => skillsApi.browseSkills(browseCategory, browsePage),
    enabled: section === "install" && installTab === "browse",
  });

  const toolStatusesQuery = useQuery({
    queryKey: ["skills", "tool-status-view"],
    queryFn: loadToolStatuses,
    enabled: section === "settings",
  });

  const managedSkills: InstalledSkill[] = useMemo(() => {
    const source: InstalledSkill[] = installedQuery.data ?? [];
    const keyword: string = manageQuery.trim().toLowerCase();
    if (keyword.length === 0) {
      return source;
    }

    return source.filter((skill: InstalledSkill) => {
      const sourceText: string = resolveSkillSource(skill).toLowerCase();
      return (
        skill.name.toLowerCase().includes(keyword) ||
        skill.directory.toLowerCase().includes(keyword) ||
        (skill.description ?? "").toLowerCase().includes(keyword) ||
        sourceText.includes(keyword)
      );
    });
  }, [installedQuery.data, manageQuery]);

  const unmanagedSkills = scanUnmanagedQuery.data ?? [];
  const browseItems: SkillsShSkill[] = browseQuery.data?.items ?? [];
  const browseHasMore: boolean = browseQuery.data?.hasMore ?? false;

  useEffect(() => {
    if (section === "local") {
      void scanUnmanagedQuery.refetch();
    }
    // 仅在切换到本地技能页时触发一次扫描，避免渲染时重复 refetch。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const toggleExpanded = (skillId: string): void => {
    setExpandedSkillIds((previous: Set<string>) => {
      const next: Set<string> = new Set(previous);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const refreshCurrentSection = async (): Promise<void> => {
    if (section === "manage") {
      await installedQuery.refetch();
      return;
    }

    if (section === "local") {
      await scanUnmanagedQuery.refetch();
      return;
    }

    if (section === "install" && installTab === "browse") {
      await browseQuery.refetch();
      return;
    }

    if (section === "settings") {
      await toolStatusesQuery.refetch();
      return;
    }
  };

  const installByRepoTarget = async (
    target: RepoTarget,
    skillNameHint?: string,
    directoryHint?: string,
  ): Promise<void> => {
    await addRepoMutation.mutateAsync({
      owner: target.owner,
      name: target.name,
      branch: target.branch,
      enabled: true,
    });

    const discoverableSkills: DiscoverableSkill[] = await skillsApi.discoverAvailable();
    const repoSkills: DiscoverableSkill[] = discoverableSkills.filter(
      (skill: DiscoverableSkill) =>
        skill.repoOwner.toLowerCase() === target.owner.toLowerCase() &&
        skill.repoName.toLowerCase() === target.name.toLowerCase(),
    );

    const pickedSkill: DiscoverableSkill | null = pickDiscoverableSkill(
      repoSkills,
      skillNameHint,
      directoryHint ?? target.directoryHint,
    );

    if (!pickedSkill) {
      throw new Error("仓库中未发现可安装的技能");
    }

    await installMutation.mutateAsync({
      skill: pickedSkill,
      currentApp: "claude",
    });
  };

  const handleInstallFromBrowse = async (item: SkillsShSkill): Promise<void> => {
    const parsedTarget: RepoTarget | null = parseRepoTarget(item.repo);
    if (!parsedTarget) {
      toast.error("仓库信息格式无效，无法安装");
      return;
    }

    try {
      await installByRepoTarget(parsedTarget, item.name, item.directory);
      await installedQuery.refetch();
      toast.success(`已安装技能: ${item.name}`);
    } catch (error) {
      toast.error("安装失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleOpenBrowseItem = async (item: SkillsShSkill): Promise<void> => {
    const url: string | null = ensureRepoUrl(item);
    if (!url) {
      toast.error("未找到可打开的仓库地址");
      return;
    }

    try {
      await settingsApi.openExternal(url);
    } catch {
      toast.error("打开链接失败");
    }
  };

  const handleGitInstall = async (): Promise<void> => {
    const target: RepoTarget | null = parseRepoTarget(gitRepoInput);
    if (!target) {
      toast.error("请输入有效的 Git 仓库地址");
      return;
    }

    try {
      await installByRepoTarget(target, gitSkillNameInput);
      await installedQuery.refetch();
      toast.success("Git 安装成功");
      setGitRepoInput("");
      setGitSkillNameInput("");
    } catch (error) {
      toast.error("Git 安装失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleUninstall = async (skill: InstalledSkill): Promise<void> => {
    try {
      await uninstallMutation.mutateAsync(skill.id);
      toast.success(`已卸载技能: ${skill.name}`);
    } catch (error) {
      toast.error("卸载失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleToggleApp = async (
    skillId: string,
    app: AppType,
    enabled: boolean,
  ): Promise<void> => {
    try {
      await toggleMutation.mutateAsync({ id: skillId, app, enabled });
    } catch (error) {
      toast.error("同步状态更新失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleImportDirectories = async (directories: string[]): Promise<void> => {
    if (directories.length === 0) {
      toast.info("没有可导入的技能");
      return;
    }

    try {
      const imported: InstalledSkill[] = await importMutation.mutateAsync(directories);
      await Promise.all([installedQuery.refetch(), scanUnmanagedQuery.refetch()]);
      toast.success(`成功导入 ${imported.length} 个技能`);
    } catch (error) {
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleLocalPickDirectory = async (): Promise<void> => {
    const selected: string | null = await settingsApi.selectConfigDirectory(
      localPathInput || undefined,
    );
    if (selected) {
      setLocalPathInput(selected);
    }
  };

  const handleLocalPickFile = async (): Promise<void> => {
    const selected: string | null = await settingsApi.openFileDialog();
    if (selected) {
      setLocalPathInput(selected);
    }
  };

  const handleDropLocalFile = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropped: LocalFileWithPath | undefined = event.dataTransfer.files[0] as
      | LocalFileWithPath
      | undefined;
    if (!dropped) {
      return;
    }

    if (dropped.path && dropped.path.length > 0) {
      setLocalPathInput(dropped.path);
      return;
    }

    setLocalPathInput(dropped.name);
  };

  const handleLocalInstall = async (): Promise<void> => {
    const normalizedPath: string = localPathInput.trim();
    if (normalizedPath.length === 0) {
      toast.error("请先选择本地路径");
      return;
    }

    if (normalizedPath.endsWith(".zip") || normalizedPath.endsWith(".skill")) {
      toast.info("当前版本仅支持导入已在工具目录中的技能文件夹");
      return;
    }

    const guessedDirectory: string = normalizedPath
      .replace(/\\/g, "/")
      .split("/")
      .filter((segment: string) => segment.length > 0)
      .pop() ?? "";

    if (guessedDirectory.length === 0) {
      toast.error("无法识别技能目录名");
      return;
    }

    const scanned = await scanUnmanagedQuery.refetch();
    const hit = (scanned.data ?? []).find(
      (item: { directory: string; name: string; description?: string; foundIn: string[] }) =>
        item.directory.toLowerCase() === guessedDirectory.toLowerCase(),
    );

    if (!hit) {
      toast.info("未在已支持的工具技能目录中发现该技能");
      return;
    }

    await handleImportDirectories([hit.directory]);
    setLocalPathInput("");
    setLocalSkillNameInput("");
  };

  const navItems: Array<{
    key: SkillsSection;
    label: string;
    icon: typeof CircleDashed;
  }> = [
    { key: "manage", label: "技能管理", icon: CircleDashed },
    { key: "local", label: "本地技能", icon: Search },
    { key: "install", label: "安装技能", icon: Plus },
    { key: "settings", label: "设置", icon: Settings },
  ];

  return (
    <div className="h-full w-full overflow-hidden bg-[#090a0d] text-[#f8fafc]">
      <div className="flex h-full min-h-0">
        <aside className="w-[210px] shrink-0 border-r border-white/10 bg-[#0b0d11] px-6 py-6">
          <div className="mb-7 flex items-center gap-3 border-b border-white/10 pb-6">
            <div className="grid size-8 place-items-center rounded-lg border border-[#45f06f]/40 bg-[#0f1f13]">
              <Box className="size-4 text-[#45f06f]" />
            </div>
            <span className="text-[34px] font-semibold leading-none tracking-tight">
              SkillsLM
            </span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active: boolean = section === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSection(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[22px] font-semibold transition-all",
                    active
                      ? "bg-[#1a1d22] text-[#45f06f]"
                      : "text-[#98a2b3] hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 overflow-auto px-8 pb-8 pt-7">
          {section === "manage" && (
            <div className="mx-auto max-w-[1400px] space-y-6">
              <header className="space-y-2">
                <h2 className="text-[52px] font-bold leading-tight">技能管理</h2>
                <p className="text-[26px] text-[#8f98a8]">
                  管理已安装的 {installedQuery.data?.length ?? 0} 个技能
                </p>
              </header>

              <Input
                value={manageQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setManageQuery(event.target.value)
                }
                placeholder="搜索技能名称、来源..."
                className="h-14 border-white/10 bg-[#111318] text-[20px] text-white placeholder:text-[#667085]"
              />

              {installedQuery.isLoading ? (
                <div className="grid h-[360px] place-items-center rounded-2xl border border-white/10 bg-[#111318] text-[#98a2b3]">
                  <Loader2 className="mb-2 size-8 animate-spin" />
                  <span className="text-[18px]">加载中...</span>
                </div>
              ) : managedSkills.length === 0 ? (
                <div className="grid min-h-[360px] place-items-center rounded-2xl border border-white/10 bg-[#0e1014] p-8 text-center">
                  <div>
                    <Box className="mx-auto mb-3 size-12 text-[#4b5565]" />
                    <p className="text-[36px] font-semibold text-[#8891a3]">暂无技能</p>
                    <p className="mt-2 text-[22px] text-[#677184]">
                      前往“安装技能”页面添加新技能
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {managedSkills.map((skill: InstalledSkill) => {
                    const expanded: boolean = expandedSkillIds.has(skill.id);
                    const sourceText: string = resolveSkillSource(skill);
                    const sourceTypeText: string = sourceText.startsWith("http")
                      ? "git"
                      : "local";

                    return (
                      <article
                        key={skill.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-[#121419]"
                      >
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 text-[34px] font-semibold">
                              <LinkIcon className="size-5 text-[#6b7280]" />
                              <span className="truncate">{skill.name}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[18px] text-[#667085]">
                              <span className="truncate">{sourceText}</span>
                              <span>创建于 {formatTimestamp(skill.installedAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (skill.readmeUrl) {
                                  void settingsApi.openExternal(skill.readmeUrl);
                                }
                              }}
                              disabled={!skill.readmeUrl}
                              className="size-9 text-[#45f06f] hover:bg-[#1c2028] hover:text-[#45f06f]"
                            >
                              <FileText className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void installedQuery.refetch()}
                              className="size-9 text-[#98a2b3] hover:bg-[#1c2028] hover:text-white"
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleUninstall(skill)}
                              className="size-9 text-[#98a2b3] hover:bg-[#27161a] hover:text-[#f43f5e]"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpanded(skill.id)}
                              className="size-9 text-[#98a2b3] hover:bg-[#1c2028] hover:text-white"
                            >
                              {expanded ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="space-y-5 px-5 py-4">
                            <div className="space-y-2 text-[20px]">
                              <p>
                                <span className="mr-2 text-[#7f8899]">仓库路径</span>
                                <span className="text-[#d0d7e4]">{skill.directory}</span>
                              </p>
                              <p>
                                <span className="mr-2 text-[#7f8899]">简介</span>
                                <span className="text-[#d0d7e4]">
                                  {skill.description || "未提供"}
                                </span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="mr-2 text-[#7f8899]">来源</span>
                                <span className="text-[#d0d7e4]">{sourceText}</span>
                                <span className="rounded-md bg-[#25303f] px-2 py-[2px] text-xs uppercase tracking-wide text-[#aab4c6]">
                                  {sourceTypeText}
                                </span>
                              </p>
                            </div>

                            <div>
                              <p className="mb-2 text-[18px] text-[#8f98a8]">同步到工具</p>
                              <div className="flex flex-wrap gap-2">
                                {SKILL_APP_TOGGLES.map(
                                  (item: { label: string; app: AppType }) => {
                                    const enabled: boolean = skill.apps[item.app];
                                    return (
                                      <div
                                        key={`${skill.id}-${item.app}`}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a1d23] px-3 py-2"
                                      >
                                        <span className="text-[18px] text-[#d7dce6]">
                                          {item.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleToggleApp(skill.id, item.app, !enabled)
                                          }
                                          className={cn(
                                            "rounded-md px-3 py-1 text-sm font-semibold",
                                            enabled
                                              ? "bg-[#45f06f] text-[#0b160f]"
                                              : "bg-[#2a2f38] text-[#98a2b3]",
                                          )}
                                        >
                                          同步
                                        </button>
                                      </div>
                                    );
                                  },
                                )}
                                {EXTERNAL_SYNC_APPS.map((name: string) => (
                                  <div
                                    key={`${skill.id}-${name}`}
                                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a1d23] px-3 py-2"
                                  >
                                    <span className="text-[18px] text-[#d7dce6]">{name}</span>
                                    <span className="rounded-md bg-[#45f06f] px-3 py-1 text-sm font-semibold text-[#0b160f]">
                                      同步
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshCurrentSection()}
                className="h-12 border-white/15 bg-[#272b32] px-6 text-[22px] text-white hover:bg-[#313742]"
              >
                <RefreshCw className="size-4" />
                刷新列表
              </Button>
            </div>
          )}

          {section === "local" && (
            <div className="mx-auto max-w-[1400px] space-y-6">
              <header className="space-y-2">
                <h2 className="text-[52px] font-bold leading-tight">扫描现有技能</h2>
                <p className="text-[26px] text-[#8f98a8]">
                  扫描了 7 个工具，发现 {unmanagedSkills.length} 个未管理的技能
                </p>
              </header>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#121419] p-4">
                {scanUnmanagedQuery.isFetching ? (
                  <div className="grid h-24 place-items-center text-[18px] text-[#98a2b3]">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : unmanagedSkills.length === 0 ? (
                  <div className="grid h-24 place-items-center text-[20px] text-[#98a2b3]">
                    未发现可导入技能
                  </div>
                ) : (
                  unmanagedSkills.map(
                    (item: {
                      directory: string;
                      name: string;
                      description?: string;
                      foundIn: string[];
                    }) => (
                      <div
                        key={item.directory}
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1d23]"
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div>
                            <p className="text-[30px] font-semibold">{item.name}</p>
                            <p className="text-[18px] text-[#8f98a8]">
                              {item.foundIn.length} 个位置
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleImportDirectories([item.directory])}
                            className="h-10 rounded-xl bg-[#45f06f] px-5 text-[#0c1a10] hover:bg-[#3ade64]"
                          >
                            导入
                          </Button>
                        </div>
                        <div className="space-y-2 border-t border-white/10 px-4 py-3">
                          {item.foundIn.map((app: string) => (
                            <div
                              key={`${item.directory}-${app}`}
                              className="flex items-center gap-3 text-[18px] text-[#95a0b4]"
                            >
                              <LinkIcon className="size-4" />
                              <span>{app}</span>
                              <span className="truncate text-[#6f7a8f]">
                                {item.directory}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshCurrentSection()}
                  className="h-12 border-white/15 bg-[#272b32] px-6 text-[22px] text-white hover:bg-[#313742]"
                >
                  <RefreshCw className="size-4" />
                  重新扫描
                </Button>
                <Button
                  type="button"
                  disabled={unmanagedSkills.length === 0 || importMutation.isPending}
                  onClick={() =>
                    void handleImportDirectories(
                      unmanagedSkills.map(
                        (item: {
                          directory: string;
                          name: string;
                          description?: string;
                          foundIn: string[];
                        }) => item.directory,
                      ),
                    )
                  }
                  className="h-12 rounded-xl bg-[#45f06f] px-6 text-[22px] text-[#0c1a10] hover:bg-[#3ade64]"
                >
                  <Download className="size-4" />
                  一键导入
                </Button>
              </div>
            </div>
          )}

          {section === "install" && (
            <div className="mx-auto max-w-[1400px] space-y-6">
              <header className="space-y-2">
                <h2 className="text-[52px] font-bold leading-tight">安装技能</h2>
                <p className="text-[26px] text-[#8f98a8]">从本地文件夹或 Git 仓库安装技能</p>
              </header>

              <div className="flex flex-wrap gap-2">
                <InstallModeButton
                  active={installTab === "browse"}
                  icon={Globe}
                  label="浏览技能"
                  onClick={() => setInstallTab("browse")}
                />
                <InstallModeButton
                  active={installTab === "local"}
                  icon={Folder}
                  label="本地安装"
                  onClick={() => setInstallTab("local")}
                />
                <InstallModeButton
                  active={installTab === "git"}
                  icon={LinkIcon}
                  label="Git 安装"
                  onClick={() => setInstallTab("git")}
                />
              </div>

              {installTab === "browse" && (
                <div className="rounded-2xl border border-white/10 bg-[#121419] p-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(Object.keys(BROWSE_CATEGORY_META) as SkillsShCategory[]).map(
                      (category: SkillsShCategory) => {
                        const categoryMeta = BROWSE_CATEGORY_META[category];
                        const Icon = categoryMeta.icon;
                        const active: boolean = browseCategory === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setBrowseCategory(category);
                              setBrowsePage(1);
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-[18px] font-semibold",
                              active
                                ? "border-white/20 bg-[#1f2430] text-white"
                                : "border-white/10 bg-[#151820] text-[#8f98a8] hover:text-white",
                            )}
                          >
                            <Icon className="size-4" />
                            {categoryMeta.label}
                          </button>
                        );
                      },
                    )}
                  </div>

                  <div className="max-h-[560px] overflow-auto pr-1">
                    {browseQuery.isLoading || browseQuery.isFetching ? (
                      <div className="grid h-40 place-items-center text-[#98a2b3]">
                        <Loader2 className="size-7 animate-spin" />
                      </div>
                    ) : browseQuery.isError ? (
                      <div className="grid h-40 place-items-center text-center">
                        <p className="text-[20px] text-[#f87171]">加载失败</p>
                        <p className="mt-1 text-[16px] text-[#98a2b3]">
                          {browseQuery.error instanceof Error
                            ? browseQuery.error.message
                            : "请稍后重试"}
                        </p>
                      </div>
                    ) : browseItems.length === 0 ? (
                      <div className="grid h-40 place-items-center text-[20px] text-[#98a2b3]">
                        暂无可展示技能
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {browseItems.map((item: SkillsShSkill) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-[#1a1d23] px-4 py-3"
                          >
                            <p className="truncate text-[28px] font-semibold">{item.name}</p>
                            <p className="truncate text-[18px] text-[#8f98a8]">{item.repo}</p>
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleOpenBrowseItem(item)}
                                className="size-8 rounded-md bg-[#2a2f38] text-[#9aa4b7] hover:bg-[#363d48] hover:text-white"
                              >
                                <ExternalLink className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => void handleInstallFromBrowse(item)}
                                className="size-8 rounded-md bg-[#45f06f] p-0 text-[#0c1a10] hover:bg-[#3ade64]"
                              >
                                <Download className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={browsePage <= 1}
                      onClick={() => setBrowsePage((page: number) => Math.max(1, page - 1))}
                      className="h-9 border-white/15 bg-[#272b32] text-white hover:bg-[#313742]"
                    >
                      上一页
                    </Button>
                    <span className="text-[18px] text-[#98a2b3]">第 {browsePage} 页</span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!browseHasMore}
                      onClick={() => setBrowsePage((page: number) => page + 1)}
                      className="h-9 border-white/15 bg-[#272b32] text-white hover:bg-[#313742]"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}

              {installTab === "local" && (
                <div className="max-w-[860px] space-y-4 rounded-2xl border border-white/10 bg-[#121419] p-6">
                  <div
                    onDrop={handleDropLocalFile}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                    className="grid h-40 place-items-center rounded-xl border border-dashed border-white/20 bg-[#0f1117] text-center"
                  >
                    <div>
                      <Upload className="mx-auto mb-3 size-7 text-[#5f6b81]" />
                      <p className="text-[22px] text-[#9aa4b7]">拖拽文件夹或压缩包到此处</p>
                      <p className="text-[16px] text-[#667085]">支持 .zip / .skill 压缩包或技能文件夹</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[24px] font-semibold">或手动选择</p>
                    <div className="flex gap-2">
                      <Input
                        value={localPathInput}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setLocalPathInput(event.target.value)
                        }
                        placeholder="选择文件夹或 .zip/.skill 文件"
                        className="h-11 border-white/10 bg-[#0f1117] text-[18px] text-white placeholder:text-[#667085]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => void handleLocalPickDirectory()}
                        className="h-11 w-11 border-white/15 bg-[#272b32] text-white hover:bg-[#313742]"
                      >
                        <Folder className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => void handleLocalPickFile()}
                        className="h-11 w-11 border-white/15 bg-[#272b32] text-white hover:bg-[#313742]"
                      >
                        <FileText className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[24px] font-semibold">技能名称（可选）</p>
                    <Input
                      value={localSkillNameInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setLocalSkillNameInput(event.target.value)
                      }
                      placeholder="留空则自动从 SKILL.md 或文件名推断"
                      className="h-11 border-white/10 bg-[#0f1117] text-[18px] text-white placeholder:text-[#667085]"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleLocalInstall()}
                    disabled={importMutation.isPending}
                    className="h-11 rounded-xl bg-[#3b3f47] px-6 text-[20px] text-[#d6dae3] hover:bg-[#4a5060]"
                  >
                    安装技能
                  </Button>
                </div>
              )}

              {installTab === "git" && (
                <div className="max-w-[860px] space-y-4 rounded-2xl border border-white/10 bg-[#121419] p-6">
                  <div className="space-y-2">
                    <p className="text-[24px] font-semibold">Git 仓库地址</p>
                    <Input
                      value={gitRepoInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setGitRepoInput(event.target.value)
                      }
                      placeholder="https://github.com/user/repo 或 user/repo"
                      className="h-11 border-white/10 bg-[#0f1117] text-[18px] text-white placeholder:text-[#667085]"
                    />
                    <p className="text-[16px] leading-7 text-[#667085]">
                      支持格式：
                      <br />
                      • https://github.com/user/repo
                      <br />
                      • user/repo（GitHub 简写）
                      <br />• https://github.com/user/repo/tree/main/skills/my-skill（指定子路径）
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[24px] font-semibold">技能名称（可选）</p>
                    <Input
                      value={gitSkillNameInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setGitSkillNameInput(event.target.value)
                      }
                      placeholder="留空则自动推断"
                      className="h-11 border-white/10 bg-[#0f1117] text-[18px] text-white placeholder:text-[#667085]"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleGitInstall()}
                    disabled={addRepoMutation.isPending || installMutation.isPending}
                    className="h-11 rounded-xl bg-[#3b3f47] px-6 text-[20px] text-[#d6dae3] hover:bg-[#4a5060]"
                  >
                    安装技能
                  </Button>
                </div>
              )}
            </div>
          )}

          {section === "settings" && (
            <div className="mx-auto max-w-[1400px] space-y-6">
              <header className="space-y-2">
                <h2 className="text-[52px] font-bold leading-tight">设置</h2>
                <p className="text-[26px] text-[#8f98a8]">配置 SkillsLM 的全局设置</p>
              </header>

              <div className="rounded-2xl border border-white/10 bg-[#121419] p-6">
                <h3 className="text-[36px] font-semibold">工具状态</h3>
                <p className="mt-1 text-[20px] text-[#8f98a8]">检测已安装的 AI 编码工具</p>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {toolStatusesQuery.isLoading ? (
                    <div className="col-span-full grid h-28 place-items-center text-[#98a2b3]">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  ) : (
                    (toolStatusesQuery.data ?? []).map((item: ToolStatusView) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border px-4 py-3",
                          item.installed
                            ? "border-[#1f6c33] bg-[#10301a]"
                            : "border-white/10 bg-[#1b1e25]",
                        )}
                      >
                        <p
                          className={cn(
                            "text-[16px] font-semibold",
                            item.installed ? "text-[#45f06f]" : "text-[#6f7a8f]",
                          )}
                        >
                          {item.installed ? "√ 已安装" : "未安装"}
                        </p>
                        <p className="mt-1 text-[30px] font-semibold">{item.name}</p>
                        <p className="text-[18px] text-[#6f7a8f]">
                          {item.version || item.code}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshCurrentSection()}
                  className="mt-6 h-12 border-white/15 bg-[#272b32] px-6 text-[22px] text-white hover:bg-[#313742]"
                >
                  <RefreshCw className="size-4" />
                  刷新状态
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface InstallModeButtonProps {
  active: boolean;
  icon: typeof Globe;
  label: string;
  onClick: () => void;
}

function InstallModeButton({ active, icon: Icon, label, onClick }: InstallModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-5 py-3 text-[22px] font-semibold transition-colors",
        active
          ? "border-white/20 bg-[#2c313b] text-white"
          : "border-white/10 bg-[#171a20] text-[#8f98a8] hover:text-white",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
