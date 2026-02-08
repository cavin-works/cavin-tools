import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingUp,
  Upload,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock3,
  Check,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProviderIcon } from "../ProviderIcon";
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

const APP_ICON_MAP: Record<string, string> = {
  claude: "claude",
  codex: "openai",
  gemini: "gemini",
  opencode: "opencode",
  cursor: "cursor",
};

const BROWSE_CATEGORY_META: Record<
  SkillsShCategory,
  { label: string; icon: typeof Flame }
> = {
  "all-time": { label: "All Time (45,882)", icon: Clock3 },
  trending: { label: "Trending (24h)", icon: TrendingUp },
  hot: { label: "Hot", icon: Flame },
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

function formatTreeCommitShort(value?: string): string {
  if (!value || value.trim().length === 0) {
    return "-";
  }
  const normalized: string = value.trim();
  return normalized.length > 12 ? normalized.slice(0, 12) : normalized;
}

function normalizePathFragment(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function extractInstallName(value?: string): string | null {
  if (!value) {
    return null;
  }
  const normalized: string = normalizePathFragment(value);
  if (normalized.length === 0) {
    return null;
  }
  const segments: string[] = normalized.split("/").filter((segment: string) => segment.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function extractRemoteDirectoryFromInstalledId(skillId: string): string | null {
  const separatorIndex: number = skillId.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }
  const prefix: string = skillId.slice(0, separatorIndex).toLowerCase();
  if (prefix === "local") {
    return null;
  }
  const rawDirectory: string = skillId.slice(separatorIndex + 1);
  const normalized: string = normalizePathFragment(rawDirectory);
  return normalized.length > 0 ? normalized : null;
}

function resolveSkillSource(skill: InstalledSkill, localLabel: string): string {
  if (skill.repoOwner && skill.repoName) {
    return `https://github.com/${skill.repoOwner}/${skill.repoName}`;
  }
  return localLabel;
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
  const { t } = useTranslation();
  const [section, setSection] = useState<SkillsSection>("manage");
  const [installTab, setInstallTab] = useState<InstallTab>("browse");
  const [browseCategory, setBrowseCategory] = useState<SkillsShCategory>("all-time");
  const [browsePage, setBrowsePage] = useState<number>(0);
  const [browseSearchInput, setBrowseSearchInput] = useState<string>("");
  const [browseSearchQuery, setBrowseSearchQuery] = useState<string>("");
  const [manageQuery, setManageQuery] = useState<string>("");
  const [expandedSkillIds, setExpandedSkillIds] = useState<Set<string>>(new Set());
  const [localPathInput, setLocalPathInput] = useState<string>("");
  const [localSkillNameInput, setLocalSkillNameInput] = useState<string>("");
  const [gitRepoInput, setGitRepoInput] = useState<string>("");
  const [gitSkillNameInput, setGitSkillNameInput] = useState<string>("");
  const [refreshingSection, setRefreshingSection] = useState<SkillsSection | null>(null);
  const [refreshingSkillIds, setRefreshingSkillIds] = useState<Set<string>>(new Set());
  const [installingBrowseSkillIds, setInstallingBrowseSkillIds] = useState<Set<string>>(new Set());
  const [recentlyInstalledBrowseSkillIds, setRecentlyInstalledBrowseSkillIds] = useState<Set<string>>(new Set());

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
  const browseSearchResultQuery = useQuery({
    queryKey: ["skills", "skills-sh", "search", browseSearchQuery],
    queryFn: () => skillsApi.searchSkills(browseSearchQuery, 50),
    enabled:
      section === "install" &&
      installTab === "browse" &&
      browseSearchQuery.trim().length > 0,
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
      const sourceText: string = resolveSkillSource(skill, t("skills.workspace.manage.localImport")).toLowerCase();
      return (
        skill.name.toLowerCase().includes(keyword) ||
        skill.directory.toLowerCase().includes(keyword) ||
        (skill.description ?? "").toLowerCase().includes(keyword) ||
        sourceText.includes(keyword)
      );
    });
  }, [installedQuery.data, manageQuery]);

  const unmanagedSkills = scanUnmanagedQuery.data ?? [];
  const isBrowseSearching: boolean = browseSearchQuery.trim().length > 0;
  const browseItems: SkillsShSkill[] = isBrowseSearching
    ? browseSearchResultQuery.data ?? []
    : browseQuery.data?.items ?? [];
  const browseHasMore: boolean = isBrowseSearching ? false : browseQuery.data?.hasMore ?? false;
  const browseTotalPages: number | undefined = isBrowseSearching
    ? undefined
    : browseQuery.data?.totalPages;
  const browseLoading: boolean = isBrowseSearching
    ? browseSearchResultQuery.isLoading || browseSearchResultQuery.isFetching
    : browseQuery.isLoading || browseQuery.isFetching;
  const browseIsError: boolean = isBrowseSearching
    ? browseSearchResultQuery.isError
    : browseQuery.isError;
  const browseError: unknown = isBrowseSearching ? browseSearchResultQuery.error : browseQuery.error;
  const installedSkills: InstalledSkill[] = installedQuery.data ?? [];

  useEffect(() => {
    if (section === "local") {
      void scanUnmanagedQuery.refetch();
    }
    // 仅在切换到本地技能页时触发一次扫描，避免渲染时重复 refetch。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBrowseSearchQuery(browseSearchInput.trim());
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [browseSearchInput]);

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

  const handleRefreshSection = async (targetSection: SkillsSection): Promise<void> => {
    setRefreshingSection(targetSection);
    try {
      if (targetSection === "manage") {
        const refreshResult = await skillsApi.refreshInstalledRemote();
        await installedQuery.refetch();
        toast.success(
          t("skills.workspace.manage.remoteRefreshDone", { defaultValue: "远程刷新完成" }),
          {
            description: t("skills.workspace.manage.remoteRefreshResult", {
              defaultValue:
                "检查仓库 {{checked}} 个，扫描已安装技能 {{scanned}} 个，更新 {{updated}} 个。",
              checked: refreshResult.checkedRepos,
              scanned: refreshResult.scannedSkills,
              updated: refreshResult.updatedSkills,
            }),
          },
        );
        return;
      }

      if (targetSection === "local") {
        await scanUnmanagedQuery.refetch();
        return;
      }

      if (targetSection === "install" && installTab === "browse") {
        if (browseSearchQuery.trim().length > 0) {
          await browseSearchResultQuery.refetch();
        } else {
          await browseQuery.refetch();
        }
        return;
      }

      if (targetSection === "settings") {
        await toolStatusesQuery.refetch();
        return;
      }
    } catch (error) {
      toast.error(t("skills.workspace.toast.refreshFailed", { defaultValue: "刷新失败" }), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRefreshingSection((current: SkillsSection | null) =>
        current === targetSection ? null : current,
      );
    }
  };

  const handleRefreshSingleSkill = async (skill: InstalledSkill): Promise<void> => {
    if (refreshingSkillIds.has(skill.id)) {
      return;
    }

    setRefreshingSkillIds((previous: Set<string>) => {
      const next = new Set(previous);
      next.add(skill.id);
      return next;
    });

    try {
      const result = await skillsApi.refreshInstalledOneRemote(skill.id);
      await installedQuery.refetch();

      if (result.updated) {
        toast.success(
          t("skills.workspace.manage.singleRefreshUpdated", { defaultValue: "技能已刷新并更新" }),
          {
            description: t("skills.workspace.manage.singleRefreshUpdatedDesc", {
              defaultValue: "{{name}} 已更新远程元数据。",
              name: skill.name,
            }),
          },
        );
      } else {
        toast.info(
          t("skills.workspace.manage.singleRefreshNoChange", { defaultValue: "已刷新，无变化" }),
          {
            description: t("skills.workspace.manage.singleRefreshNoChangeDesc", {
              defaultValue: "{{name}} 当前已是最新状态。",
              name: skill.name,
            }),
          },
        );
      }
    } catch (error) {
      toast.error(t("skills.workspace.toast.refreshFailed", { defaultValue: "刷新失败" }), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRefreshingSkillIds((previous: Set<string>) => {
        const next = new Set(previous);
        next.delete(skill.id);
        return next;
      });
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
      throw new Error(t("skills.workspace.toast.noSkillInRepo"));
    }

    await installMutation.mutateAsync({
      skill: pickedSkill,
      currentApp: "claude",
    });
  };

  const handleInstallFromBrowse = async (item: SkillsShSkill): Promise<void> => {
    if (recentlyInstalledBrowseSkillIds.has(item.id)) {
      toast.info(t("skills.workspace.install.alreadyInstalled", { defaultValue: "该技能已安装" }));
      return;
    }

    const parsedTarget: RepoTarget | null = parseRepoTarget(item.repo);
    if (!parsedTarget) {
      toast.error(t("skills.workspace.toast.invalidRepo"));
      return;
    }

    setInstallingBrowseSkillIds((previous: Set<string>) => {
      const next: Set<string> = new Set(previous);
      next.add(item.id);
      return next;
    });

    try {
      await installByRepoTarget(parsedTarget, item.name, item.directory);
      await installedQuery.refetch();
      await browseQuery.refetch();
      setRecentlyInstalledBrowseSkillIds((previous: Set<string>) => {
        const next: Set<string> = new Set(previous);
        next.add(item.id);
        return next;
      });
      toast.success(t("skills.workspace.toast.installSuccess", { name: item.name }));
    } catch (error) {
      toast.error(t("skills.workspace.toast.installFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setInstallingBrowseSkillIds((previous: Set<string>) => {
        const next: Set<string> = new Set(previous);
        next.delete(item.id);
        return next;
      });
    }
  };

  const isBrowseSkillInstalled = (item: SkillsShSkill): boolean => {
    if (recentlyInstalledBrowseSkillIds.has(item.id)) {
      return true;
    }

    const parsedTarget: RepoTarget | null = parseRepoTarget(item.repo);
    if (!parsedTarget) {
      return false;
    }

    const repoOwner: string = parsedTarget.owner.toLowerCase();
    const repoName: string = parsedTarget.name.toLowerCase();
    const itemDirectory: string = normalizePathFragment(item.directory ?? "");
    const itemInstallName: string =
      extractInstallName(item.directory) ?? item.name.trim().toLowerCase();

    const sameRepoInstalledSkills: InstalledSkill[] = installedSkills.filter(
      (skill: InstalledSkill) =>
        (skill.repoOwner ?? "").trim().toLowerCase() === repoOwner &&
        (skill.repoName ?? "").trim().toLowerCase() === repoName,
    );

    if (sameRepoInstalledSkills.length === 0) {
      return false;
    }

    for (const installed of sameRepoInstalledSkills) {
      const installedRemoteDirectory: string | null = extractRemoteDirectoryFromInstalledId(
        installed.id,
      );
      if (itemDirectory.length > 0 && installedRemoteDirectory) {
        if (
          installedRemoteDirectory === itemDirectory ||
          installedRemoteDirectory.endsWith(`/${itemDirectory}`) ||
          itemDirectory.endsWith(`/${installedRemoteDirectory}`)
        ) {
          return true;
        }
      }

      const installedDirectory: string = installed.directory.trim().toLowerCase();
      if (itemInstallName.length > 0 && installedDirectory === itemInstallName) {
        return true;
      }
    }

    return false;
  };

  const handleOpenBrowseItem = async (item: SkillsShSkill): Promise<void> => {
    const url: string | null = ensureRepoUrl(item);
    if (!url) {
      toast.error(t("skills.workspace.toast.noRepoUrl"));
      return;
    }

    try {
      await settingsApi.openExternal(url);
    } catch {
      toast.error(t("skills.workspace.toast.openLinkFailed"));
    }
  };

  const handleGitInstall = async (): Promise<void> => {
    const target: RepoTarget | null = parseRepoTarget(gitRepoInput);
    if (!target) {
      toast.error(t("skills.workspace.toast.invalidGitRepo"));
      return;
    }

    try {
      await installByRepoTarget(target, gitSkillNameInput);
      await installedQuery.refetch();
      toast.success(t("skills.workspace.toast.gitInstallSuccess"));
      setGitRepoInput("");
      setGitSkillNameInput("");
    } catch (error) {
      toast.error(t("skills.workspace.toast.gitInstallFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleUninstall = async (skill: InstalledSkill): Promise<void> => {
    try {
      await uninstallMutation.mutateAsync(skill.id);
      toast.success(t("skills.workspace.toast.uninstallSuccess", { name: skill.name }));
    } catch (error) {
      toast.error(t("skills.workspace.toast.uninstallFailed"), {
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
      toast.error(t("skills.workspace.toast.syncFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleImportDirectories = async (directories: string[]): Promise<void> => {
    if (directories.length === 0) {
      toast.info(t("skills.workspace.toast.noImportable"));
      return;
    }

    try {
      const imported: InstalledSkill[] = await importMutation.mutateAsync(directories);
      await Promise.all([installedQuery.refetch(), scanUnmanagedQuery.refetch()]);
      toast.success(t("skills.workspace.toast.importSuccess", { count: imported.length }));
    } catch (error) {
      toast.error(t("skills.workspace.toast.importFailed"), {
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
      toast.error(t("skills.workspace.toast.selectPathFirst"));
      return;
    }

    if (normalizedPath.endsWith(".zip") || normalizedPath.endsWith(".skill")) {
      toast.info(t("skills.workspace.toast.zipNotSupported"));
      return;
    }

    const guessedDirectory: string = normalizedPath
      .replace(/\\/g, "/")
      .split("/")
      .filter((segment: string) => segment.length > 0)
      .pop() ?? "";

    if (guessedDirectory.length === 0) {
      toast.error(t("skills.workspace.toast.cannotIdentifyDir"));
      return;
    }

    const scanned = await scanUnmanagedQuery.refetch();
    const hit = (scanned.data ?? []).find(
      (item: { directory: string; name: string; description?: string; foundIn: string[] }) =>
        item.directory.toLowerCase() === guessedDirectory.toLowerCase(),
    );

    if (!hit) {
      toast.info(t("skills.workspace.toast.skillNotFoundInTools"));
      return;
    }

    await handleImportDirectories([hit.directory]);
    setLocalPathInput("");
    setLocalSkillNameInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pb-4 pt-4">
      {/* Tab navigation */}
      <Tabs value={section} onValueChange={(v) => setSection(v as SkillsSection)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 mb-4">
          <TabsTrigger value="manage">
            {t("skills.workspace.nav.manage")}
            {installedQuery.data && installedQuery.data.length > 0 && (
              <span className="ml-1 text-muted-foreground">({installedQuery.data.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="local">{t("skills.workspace.nav.local")}</TabsTrigger>
          <TabsTrigger value="install">{t("skills.workspace.nav.install")}</TabsTrigger>
          <TabsTrigger value="settings">{t("skills.workspace.nav.settings")}</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent value="manage" className="mt-0 h-full min-h-0">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col gap-6">
              <Input
                value={manageQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setManageQuery(event.target.value)
                }
                placeholder={t("skills.workspace.manage.searchPlaceholder")}
                className="h-10"
              />

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {installedQuery.isLoading ? (
                  <div className="grid min-h-[200px] place-items-center rounded-2xl border border-border bg-muted text-muted-foreground">
                    <Loader2 className="mb-2 size-8 animate-spin" />
                    <span className="text-xs">{t("skills.loading")}</span>
                  </div>
                ) : managedSkills.length === 0 ? (
                  <EmptyState
                    icon={<Box className="size-6 text-muted-foreground" />}
                    title={t("skills.workspace.manage.noSkills")}
                    description={t("skills.workspace.manage.noSkillsHint")}
                    className="min-h-[200px] rounded-2xl border border-border bg-muted/50"
                  />
                ) : (
                  <div className="space-y-4">
                    {managedSkills.map((skill: InstalledSkill) => {
                      const expanded: boolean = expandedSkillIds.has(skill.id);
                      const sourceText: string = resolveSkillSource(skill, t("skills.workspace.manage.localImport"));
                      const sourceTypeText: string = sourceText.startsWith("http")
                        ? "git"
                        : "local";
                      const treeCommitShort: string = formatTreeCommitShort(skill.treeCommitId);
                      const refreshingSingleSkill: boolean = refreshingSkillIds.has(skill.id);

                      return (
                        <article
                          key={skill.id}
                          className="overflow-hidden rounded-2xl border border-border bg-card"
                        >
                          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 text-base font-semibold text-foreground">
                                <LinkIcon className="size-4 text-muted-foreground" />
                                <span className="truncate">{skill.name}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="truncate">{sourceText}</span>
                                <span>{t("skills.workspace.manage.createdAt", { time: formatTimestamp(skill.installedAt) })}</span>
                                <span className="font-mono" title={skill.treeCommitId ?? "-"}>
                                  {t("skills.workspace.manage.treeCommit", { defaultValue: "Tree 提交" })}: {treeCommitShort}
                                </span>
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
                                className="size-9 text-primary hover:bg-accent hover:text-primary"
                              >
                                <FileText className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleRefreshSingleSkill(skill)}
                                disabled={refreshingSingleSkill}
                                className="size-9 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <RefreshCw
                                  className={cn(
                                    "size-4",
                                    refreshingSingleSkill && "animate-spin",
                                  )}
                                />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleUninstall(skill)}
                                className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleExpanded(skill.id)}
                                className="size-9 text-muted-foreground hover:bg-accent hover:text-foreground"
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
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="mr-2 text-muted-foreground">{t("skills.workspace.manage.repoPath")}</span>
                                  <span className="text-foreground">{skill.directory}</span>
                                </p>
                                <p>
                                  <span className="mr-2 text-muted-foreground">{t("skills.workspace.manage.description")}</span>
                                  <span className="text-foreground">
                                    {skill.description || t("skills.workspace.manage.noDescription")}
                                  </span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="mr-2 text-muted-foreground">{t("skills.workspace.manage.source")}</span>
                                  <span className="text-foreground">{sourceText}</span>
                                  <Badge variant="secondary" className="uppercase text-xs">
                                    {sourceTypeText}
                                  </Badge>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="mr-2 text-muted-foreground">
                                    {t("skills.workspace.manage.treeCommitId", { defaultValue: "Tree 提交 ID" })}
                                  </span>
                                  <span className="font-mono text-foreground" title={skill.treeCommitId ?? "-"}>
                                    {skill.treeCommitId ?? "-"}
                                  </span>
                                </p>
                              </div>

                              <div>
                                <p className="mb-2 text-xs text-muted-foreground">{t("skills.workspace.manage.syncToTools")}</p>
                                <div className="flex flex-wrap gap-2">
                                  {SKILL_APP_TOGGLES.map(
                                    (item: { label: string; app: AppType }) => {
                                      const enabled: boolean = skill.apps[item.app];
                                      return (
                                        <div
                                          key={`${skill.id}-${item.app}`}
                                          className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2"
                                        >
                                          <span className="text-xs text-foreground">
                                            {item.label}
                                          </span>
                                          <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) =>
                                              void handleToggleApp(skill.id, item.app, checked)
                                            }
                                          />
                                        </div>
                                      );
                                    },
                                  )}
                                  {EXTERNAL_SYNC_APPS.map((name: string) => (
                                    <div
                                      key={`${skill.id}-${name}`}
                                      className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2"
                                    >
                                      <span className="text-xs text-foreground">{name}</span>
                                      <Switch checked disabled />
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
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleRefreshSection("manage")}
                disabled={refreshingSection === "manage"}
                className="h-10 px-4 text-sm"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    refreshingSection === "manage" && "animate-spin",
                  )}
                />
                {refreshingSection === "manage"
                  ? t("skills.workspace.manage.refreshing", { defaultValue: "刷新中..." })
                  : t("skills.workspace.manage.refreshList")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="local" className="mt-0 h-full min-h-0">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col gap-6">
              <p className="text-sm text-muted-foreground">
                {t("skills.workspace.local.subtitle", { toolCount: SKILL_APP_TOGGLES.length, count: unmanagedSkills.length })}
              </p>

              <div className="min-h-0 flex-1 overflow-y-auto space-y-3 rounded-2xl border border-border bg-card p-4">
                {scanUnmanagedQuery.isFetching ? (
                  <div className="grid h-24 place-items-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : unmanagedSkills.length === 0 ? (
                  <div className="grid h-24 place-items-center text-sm text-muted-foreground">
                    {t("skills.workspace.local.noSkills")}
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
                        className="overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {t("skills.workspace.local.locations", { count: item.foundIn.length })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleImportDirectories([item.directory])}
                            className="h-9 rounded-xl px-5"
                          >
                            {t("skills.workspace.local.import")}
                          </Button>
                        </div>
                        <div className="space-y-2 border-t border-border px-4 py-3">
                          {item.foundIn.map((app: string) => (
                            <div
                              key={`${item.directory}-${app}`}
                              className="flex items-center gap-3 text-xs text-muted-foreground"
                            >
                              <ProviderIcon
                                icon={APP_ICON_MAP[app] ?? app}
                                name={app}
                                size={16}
                              />
                              <span>{app}</span>
                              <span className="truncate text-muted-foreground/70">
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
                  variant="secondary"
                  onClick={() => void handleRefreshSection("local")}
                  disabled={refreshingSection === "local"}
                  className="h-10 px-4 text-sm"
                >
                  <RefreshCw
                    className={cn(
                      "size-4",
                      refreshingSection === "local" && "animate-spin",
                    )}
                  />
                  {t("skills.workspace.local.rescan")}
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
                  className="h-10 px-4 text-sm"
                >
                  <Download className="size-4" />
                  {t("skills.workspace.local.importAll")}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="install" className="mt-0 h-full min-h-0">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col gap-6">
              <p className="text-sm text-muted-foreground">{t("skills.workspace.install.subtitle")}</p>

              <Tabs value={installTab} onValueChange={(v) => setInstallTab(v as InstallTab)} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="flex-shrink-0">
                  <TabsTrigger value="browse">{t("skills.workspace.install.browse")}</TabsTrigger>
                  <TabsTrigger value="local">{t("skills.workspace.install.localInstall")}</TabsTrigger>
                  <TabsTrigger value="git">{t("skills.workspace.install.gitInstall")}</TabsTrigger>
                </TabsList>

              <TabsContent value="browse" className="mt-4 min-h-0 flex-1">
                <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card p-4">
                  <div className="mb-3 flex flex-shrink-0 items-center gap-2">
                    <div className="relative w-full max-w-[560px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={browseSearchInput}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setBrowseSearchInput(event.target.value)
                        }
                        placeholder={t("skills.workspace.install.searchPlaceholder", {
                          defaultValue: "搜索 skills.sh 技能（关键词）",
                        })}
                        className="h-9 border-border bg-muted pl-9 pr-9 text-sm"
                      />
                      {browseSearchInput.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBrowseSearchInput("");
                            setBrowseSearchQuery("");
                          }}
                          className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={t("common.clear", { defaultValue: "清空" })}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isBrowseSearching && (
                    <div className="mb-4 flex flex-shrink-0 flex-wrap gap-2">
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
                                setBrowsePage(0);
                                if (browseSearchInput.trim().length > 0) {
                                  setBrowseSearchInput("");
                                  setBrowseSearchQuery("");
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200",
                                active
                                  ? "border-border bg-accent text-foreground"
                                  : "border-border bg-muted text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                              {categoryMeta.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-auto pr-1">
                    {browseLoading ? (
                      <div className="grid min-h-[120px] place-items-center text-muted-foreground">
                        <Loader2 className="size-7 animate-spin" />
                      </div>
                    ) : browseIsError ? (
                      <div className="grid min-h-[120px] place-items-center text-center">
                        <p className="text-sm text-destructive">{t("skills.workspace.install.loadFailed")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {browseError instanceof Error
                            ? browseError.message
                            : t("skills.workspace.install.retryLater")}
                        </p>
                      </div>
                    ) : browseItems.length === 0 ? (
                      <div className="grid min-h-[120px] place-items-center text-sm text-muted-foreground">
                        {isBrowseSearching
                          ? t("skills.workspace.install.noSearchResults", { defaultValue: "未找到匹配技能" })
                          : t("skills.workspace.install.noSkills")}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {browseItems.map((item: SkillsShSkill) => {
                          const installed: boolean = isBrowseSkillInstalled(item);
                          const installing: boolean = installingBrowseSkillIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-border bg-muted px-4 py-3 transition-all duration-200 hover:bg-accent"
                            >
                              <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{item.repo}</p>
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs">
                                  {item.installs != null && (
                                    <span className="text-muted-foreground">
                                      {t("skills.workspace.install.installCount", { count: item.installs })}
                                    </span>
                                  )}
                                  {installing && (
                                    <span className="text-primary">
                                      {t("skills.workspace.install.installing", { defaultValue: "安装中..." })}
                                    </span>
                                  )}
                                  {installed && !installing && (
                                    <span className="text-primary">
                                      {t("skills.workspace.install.installed", { defaultValue: "已安装" })}
                                    </span>
                                  )}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => void handleOpenBrowseItem(item)}
                                    className="size-8"
                                  >
                                    <ExternalLink className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    onClick={() => void handleInstallFromBrowse(item)}
                                    disabled={installing || installed}
                                    className="size-8"
                                  >
                                    {installing ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : installed ? (
                                      <Check className="size-4" />
                                    ) : (
                                      <Download className="size-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!isBrowseSearching && (
                    <div className="mt-4 flex flex-shrink-0 items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={browsePage <= 0}
                        onClick={() => setBrowsePage((page: number) => Math.max(0, page - 1))}
                        className="h-9 text-sm"
                        aria-label={t("skills.workspace.install.prevPage")}
                      >
                        {t("skills.workspace.install.prevPage")}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {browseTotalPages
                          ? t("skills.workspace.install.pageNumTotal", { page: browsePage, total: browseTotalPages })
                          : t("skills.workspace.install.pageNum", { page: browsePage })}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!browseHasMore}
                        onClick={() => setBrowsePage((page: number) => page + 1)}
                        className="h-9 text-sm"
                        aria-label={t("skills.workspace.install.nextPage")}
                      >
                        {t("skills.workspace.install.nextPage")}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="local" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="h-full max-w-[860px] space-y-4 rounded-2xl border border-border bg-card p-6">
                  <div
                    onDrop={handleDropLocalFile}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                    className="grid h-40 place-items-center rounded-xl border border-dashed border-border bg-input text-center"
                    role="region"
                    aria-label="drop zone"
                  >
                    <div>
                      <Upload className="mx-auto mb-3 size-7 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("skills.workspace.install.dropzone.title")}</p>
                      <p className="text-xs text-muted-foreground">{t("skills.workspace.install.dropzone.formats")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t("skills.workspace.install.manualSelect")}</p>
                    <div className="flex gap-2">
                      <Input
                        value={localPathInput}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setLocalPathInput(event.target.value)
                        }
                        placeholder={t("skills.workspace.install.pathPlaceholder")}
                        className="h-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => void handleLocalPickDirectory()}
                        className="h-10 w-10 border-border bg-muted text-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Folder className="size-4 text-foreground" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => void handleLocalPickFile()}
                        className="h-10 w-10 border-border bg-muted text-foreground hover:bg-accent hover:text-foreground"
                      >
                        <FileText className="size-4 text-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t("skills.workspace.install.skillName")}</p>
                    <Input
                      value={localSkillNameInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setLocalSkillNameInput(event.target.value)
                      }
                      placeholder={t("skills.workspace.install.skillNameHint")}
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleLocalInstall()}
                    disabled={importMutation.isPending}
                    className="h-10 px-4 text-sm"
                  >
                    {t("skills.workspace.install.installSkill")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="git" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="h-full max-w-[860px] space-y-4 rounded-2xl border border-border bg-card p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t("skills.workspace.install.gitRepo")}</p>
                    <Input
                      value={gitRepoInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setGitRepoInput(event.target.value)
                      }
                      placeholder={t("skills.workspace.install.gitPlaceholder")}
                      className="h-10"
                    />
                    <p className="text-xs leading-6 text-muted-foreground">
                      {t("skills.workspace.install.gitFormats")}:
                      <br />
                      • https://github.com/user/repo
                      <br />
                      • user/repo (GitHub)
                      <br />• https://github.com/user/repo/tree/main/skills/my-skill
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t("skills.workspace.install.skillName")}</p>
                    <Input
                      value={gitSkillNameInput}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setGitSkillNameInput(event.target.value)
                      }
                      placeholder={t("skills.workspace.install.gitNameHint")}
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleGitInstall()}
                    disabled={addRepoMutation.isPending || installMutation.isPending}
                    className="h-10 px-4 text-sm"
                  >
                    {t("skills.workspace.install.installSkill")}
                  </Button>
                </div>
              </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 h-full min-h-0">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col gap-6">
              <p className="text-sm text-muted-foreground">{t("skills.workspace.settings.subtitle")}</p>

              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{t("skills.workspace.settings.toolStatus")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("skills.workspace.settings.toolStatusDesc")}</p>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {toolStatusesQuery.isLoading ? (
                    <div className="col-span-full grid h-28 place-items-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  ) : (
                    (toolStatusesQuery.data ?? []).map((item: ToolStatusView) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border px-4 py-3",
                          item.installed
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-muted",
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            item.installed ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {item.installed ? `✓ ${t("skills.workspace.settings.installed")}` : t("skills.workspace.settings.notInstalled")}
                        </p>
                        <p className="mt-1 text-base font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.version || item.code}
                        </p>
                      </div>
                    ))
                  )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRefreshSection("settings")}
                  disabled={refreshingSection === "settings"}
                  className="mt-6"
                >
                  <RefreshCw
                    className={cn(
                      "size-4",
                      refreshingSection === "settings" && "animate-spin",
                    )}
                  />
                  {t("skills.workspace.settings.refreshStatus")}
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
