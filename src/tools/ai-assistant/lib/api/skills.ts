import { invoke } from "@tauri-apps/api/core";

// ========== 类型定义 ==========

export type AppType = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type SkillsShCategory = "all-time" | "trending" | "hot";

/** Skill 应用启用状态 */
export interface SkillApps {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  opencode: boolean;
  cursor: boolean;
}

/** 已安装的 Skill（v3.10.0+ 统一结构） */
export interface InstalledSkill {
  id: string;
  name: string;
  description?: string;
  directory: string;
  repoOwner?: string;
  repoName?: string;
  repoBranch?: string;
  readmeUrl?: string;
  treeCommitId?: string;
  apps: SkillApps;
  installedAt: number;
}

/** 可发现的 Skill（来自仓库） */
export interface DiscoverableSkill {
  key: string;
  name: string;
  description: string;
  directory: string;
  readmeUrl?: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

/** 未管理的 Skill（用于导入） */
export interface UnmanagedSkill {
  directory: string;
  name: string;
  description?: string;
  foundIn: string[];
}

/** 技能对象（兼容旧 API） */
export interface Skill {
  key: string;
  name: string;
  description: string;
  directory: string;
  readmeUrl?: string;
  installed: boolean;
  repoOwner?: string;
  repoName?: string;
  repoBranch?: string;
}

/** 仓库配置 */
export interface SkillRepo {
  owner: string;
  name: string;
  branch: string;
  enabled: boolean;
}

/** 技能更新检测结果 */
export interface SkillUpdateInfo {
  repoOwner: string;
  repoName: string;
  updatedSkills: string[];
  newSkills: string[];
  removedSkills: string[];
}

/** skills.sh 浏览项 */
export interface SkillsShSkill {
  id: string;
  name: string;
  repo: string;
  description?: string;
  url?: string;
  directory?: string;
  installs?: number;
}

/** skills.sh 浏览结果 */
export interface SkillsShBrowseResult {
  items: SkillsShSkill[];
  page: number;
  hasMore: boolean;
  totalPages?: number;
}

/** 已安装技能远程刷新结果 */
export interface SkillRemoteRefreshResult {
  checkedRepos: number;
  scannedSkills: number;
  updatedSkills: number;
}

/** 单个已安装技能远程刷新结果 */
export interface SkillSingleRemoteRefreshResult {
  skillId: string;
  updated: boolean;
  matchedRemote: boolean;
  treeCommitId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseRepoName(value: string): string {
  if (value.includes("github.com/")) {
    try {
      const url = new URL(value);
      const segments = url.pathname
        .split("/")
        .map((segment: string) => segment.trim())
        .filter((segment: string) => segment.length > 0);
      if (segments.length >= 2) {
        return `${segments[0]}/${segments[1]}`;
      }
    } catch {
      return value;
    }
  }

  if (value.startsWith("/")) {
    return value.slice(1);
  }

  return value;
}

function readSkillsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const listKeys: string[] = ["data", "items", "skills", "result", "results", "list"];
  for (const key of listKeys) {
    const candidate: unknown = payload[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function mapSkillsShItem(item: unknown, index: number): SkillsShSkill | null {
  if (!isRecord(item)) {
    return null;
  }

  const name: string | null =
    asString(item.name) ??
    asString(item.title) ??
    asString(item.skill_name) ??
    asString(item.slug);
  const rawRepo: string | null =
    asString(item.repo) ??
    asString(item.repository) ??
    asString(item.full_name) ??
    asString(item.github_repo) ??
    asString(item.source);

  if (!name || !rawRepo) {
    return null;
  }

  const repo: string = parseRepoName(rawRepo);
  const id: string =
    asString(item.id) ??
    asString(item.key) ??
    asString(item.uuid) ??
    asString(item.skillId) ??
    `${repo}:${name}:${index}`;

  const description: string | undefined =
    asString(item.description) ?? asString(item.desc) ?? undefined;
  const url: string | undefined =
    asString(item.url) ??
    asString(item.html_url) ??
    asString(item.repo_url) ??
    undefined;
  const directory: string | undefined =
    asString(item.directory) ??
    asString(item.path) ??
    asString(item.skill_path) ??
    asString(item.skillId) ??
    undefined;

  const installs: number | undefined =
    typeof item.installs === "number"
      ? item.installs
      : typeof item.install_count === "number"
        ? item.install_count
        : typeof item.downloads === "number"
          ? item.downloads
          : undefined;

  return {
    id,
    name,
    repo,
    description,
    url,
    directory,
    installs,
  };
}

function parseSkillsShPagination(
  payload: unknown,
  page: number,
  count: number,
): { hasMore: boolean; totalPages?: number } {
  if (!isRecord(payload)) {
    return { hasMore: count > 0 };
  }

  const rawTotalPages: unknown =
    payload.total_pages ??
    payload.totalPages ??
    payload.pages ??
    payload.last_page ??
    payload.totalPagesCount;
  const rawHasMore: unknown = payload.has_more ?? payload.hasMore ?? payload.next_page;
  const rawTotal: unknown = payload.total ?? payload.count;

  let totalPages: number | undefined =
    typeof rawTotalPages === "number" && rawTotalPages > 0 ? rawTotalPages : undefined;

  // 当 API 没有返回 totalPages 但返回了 total 时，从 total 和每页数量推算
  if (totalPages === undefined && typeof rawTotal === "number" && rawTotal > 0 && count > 0) {
    totalPages = Math.ceil(rawTotal / count);
  }

  if (typeof rawHasMore === "boolean") {
    return { hasMore: rawHasMore, totalPages };
  }

  if (typeof rawHasMore === "number") {
    return { hasMore: rawHasMore > page, totalPages };
  }

  if (totalPages) {
    return { hasMore: page < totalPages, totalPages };
  }

  if (typeof rawTotal === "number" && rawTotal >= 0 && count > 0) {
    return { hasMore: page * count < rawTotal };
  }

  return { hasMore: count > 0 };
}

// ========== API ==========

export const skillsApi = {
  // ========== 统一管理 API (v3.10.0+) ==========

  /** 获取所有已安装的 Skills */
  async getInstalled(): Promise<InstalledSkill[]> {
    return await invoke("get_installed_skills");
  },

  /** 重新解析远程仓库并刷新已安装技能元数据 */
  async refreshInstalledRemote(): Promise<SkillRemoteRefreshResult> {
    return await invoke("refresh_installed_skills_remote");
  },

  /** 重新解析远程仓库并刷新单个已安装技能元数据 */
  async refreshInstalledOneRemote(skillId: string): Promise<SkillSingleRemoteRefreshResult> {
    return await invoke("refresh_installed_skill_remote", { skillId });
  },

  /** 安装 Skill（统一安装） */
  async installUnified(
    skill: DiscoverableSkill,
    currentApp: AppType,
  ): Promise<InstalledSkill> {
    return await invoke("install_skill_unified", { skill, currentApp });
  },

  /** 卸载 Skill（统一卸载） */
  async uninstallUnified(id: string): Promise<boolean> {
    return await invoke("uninstall_skill_unified", { id });
  },

  /** 切换 Skill 的应用启用状态 */
  async toggleApp(
    id: string,
    app: AppType,
    enabled: boolean,
  ): Promise<boolean> {
    return await invoke("toggle_skill_app", { id, app, enabled });
  },

  /** 扫描未管理的 Skills */
  async scanUnmanaged(): Promise<UnmanagedSkill[]> {
    return await invoke("scan_unmanaged_skills");
  },

  /** 从应用目录导入 Skills */
  async importFromApps(directories: string[]): Promise<InstalledSkill[]> {
    return await invoke("import_skills_from_apps", { directories });
  },

  /** 发现可安装的 Skills（从仓库获取） */
  async discoverAvailable(): Promise<DiscoverableSkill[]> {
    return await invoke("discover_available_skills");
  },

  /** 从 skills.sh 浏览技能 */
  async browseSkills(
    category: SkillsShCategory,
    page: number,
  ): Promise<SkillsShBrowseResult> {
    const safePage: number = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
    const payload: unknown = await invoke("browse_skills_sh", {
      category,
      page: safePage,
    });
    const rawArray: unknown[] = readSkillsArray(payload);
    const items: SkillsShSkill[] = rawArray
      .map((item: unknown, index: number) => mapSkillsShItem(item, index))
      .filter((item: SkillsShSkill | null): item is SkillsShSkill => item !== null);

    const pagination = parseSkillsShPagination(payload, safePage, items.length);

    return {
      items,
      page: safePage,
      hasMore: pagination.hasMore,
      totalPages: pagination.totalPages,
    };
  },

  /** 从 skills.sh 搜索技能 */
  async searchSkills(query: string, limit: number = 50): Promise<SkillsShSkill[]> {
    const normalizedQuery: string = query.trim();
    if (normalizedQuery.length === 0) {
      return [];
    }

    const safeLimit: number = Number.isFinite(limit)
      ? Math.max(1, Math.min(100, Math.floor(limit)))
      : 50;

    const payload: unknown = await invoke("search_skills_sh", {
      query: normalizedQuery,
      limit: safeLimit,
    });

    const rawArray: unknown[] = readSkillsArray(payload);
    return rawArray
      .map((item: unknown, index: number) => mapSkillsShItem(item, index))
      .filter((item: SkillsShSkill | null): item is SkillsShSkill => item !== null);
  },

  // ========== 兼容旧 API ==========

  /** 获取技能列表（兼容旧 API） */
  async getAll(app: AppType = "claude"): Promise<Skill[]> {
    if (app === "claude") {
      return await invoke("get_skills");
    }
    return await invoke("get_skills_for_app", { app });
  },

  /** 安装技能（兼容旧 API） */
  async install(directory: string, app: AppType = "claude"): Promise<boolean> {
    if (app === "claude") {
      return await invoke("install_skill", { directory });
    }
    return await invoke("install_skill_for_app", { app, directory });
  },

  /** 卸载技能（兼容旧 API） */
  async uninstall(
    directory: string,
    app: AppType = "claude",
  ): Promise<boolean> {
    if (app === "claude") {
      return await invoke("uninstall_skill", { directory });
    }
    return await invoke("uninstall_skill_for_app", { app, directory });
  },

  // ========== 仓库管理 ==========

  /** 获取仓库列表 */
  async getRepos(): Promise<SkillRepo[]> {
    return await invoke("get_skill_repos");
  },

  /** 添加仓库 */
  async addRepo(repo: SkillRepo): Promise<boolean> {
    return await invoke("add_skill_repo", { repo });
  },

  /** 删除仓库 */
  async removeRepo(owner: string, name: string): Promise<boolean> {
    return await invoke("remove_skill_repo", { owner, name });
  },

  // ========== 缓存管理 ==========

  /** 检查技能更新（仅调用 Trees API，不克隆仓库） */
  async checkUpdates(): Promise<SkillUpdateInfo[]> {
    return await invoke("check_skill_updates");
  },

  /** 清空技能缓存 */
  async clearCache(): Promise<boolean> {
    return await invoke("clear_skill_cache");
  },
};
