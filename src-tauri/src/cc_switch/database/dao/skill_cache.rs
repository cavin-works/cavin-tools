//! Skill 缓存数据访问对象
//!
//! 提供 skill_cache 和 repo_tree_cache 表的 CRUD 操作。
//! 基于 GitHub Tree SHA 实现增量更新检测（对齐 vercel-labs/skills）。

use crate::cc_switch::database::{lock_conn, Database};
use crate::cc_switch::error::AppError;
use rusqlite::params;

/// 仓库 Tree 缓存条目
#[derive(Debug, Clone)]
pub struct RepoTreeCacheRow {
    pub repo_key: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub repo_branch: String,
    pub root_tree_sha: String,
    pub tree_data: String,
    pub cached_at: i64,
}

/// Skill 缓存条目
#[derive(Debug, Clone)]
pub struct SkillCacheRow {
    pub cache_key: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub repo_branch: String,
    pub skill_directory: String,
    pub tree_sha: String,
    pub cached_data: String,
    pub cached_at: i64,
    pub last_checked_at: i64,
}

impl Database {
    // ========== repo_tree_cache CRUD ==========

    /// 获取仓库 tree 缓存
    pub fn get_repo_tree_cache(
        &self,
        owner: &str,
        name: &str,
    ) -> Result<Option<RepoTreeCacheRow>, AppError> {
        let conn = lock_conn!(self.conn);
        let repo_key = format!("{owner}/{name}");
        let result = conn.query_row(
            "SELECT repo_key, repo_owner, repo_name, repo_branch,
                    root_tree_sha, tree_data, cached_at
             FROM repo_tree_cache WHERE repo_key = ?1",
            params![repo_key],
            |row| {
                Ok(RepoTreeCacheRow {
                    repo_key: row.get(0)?,
                    repo_owner: row.get(1)?,
                    repo_name: row.get(2)?,
                    repo_branch: row.get(3)?,
                    root_tree_sha: row.get(4)?,
                    tree_data: row.get(5)?,
                    cached_at: row.get(6)?,
                })
            },
        );

        match result {
            Ok(row) => Ok(Some(row)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(e.to_string())),
        }
    }

    /// 保存仓库 tree 缓存
    pub fn save_repo_tree_cache(&self, row: &RepoTreeCacheRow) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO repo_tree_cache
             (repo_key, repo_owner, repo_name, repo_branch,
              root_tree_sha, tree_data, cached_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                row.repo_key,
                row.repo_owner,
                row.repo_name,
                row.repo_branch,
                row.root_tree_sha,
                row.tree_data,
                row.cached_at,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    // ========== skill_cache CRUD ==========

    /// 获取单个技能缓存
    pub fn get_skill_cache(&self, cache_key: &str) -> Result<Option<SkillCacheRow>, AppError> {
        let conn = lock_conn!(self.conn);
        let result = conn.query_row(
            "SELECT cache_key, repo_owner, repo_name, repo_branch,
                    skill_directory, tree_sha, cached_data, cached_at, last_checked_at
             FROM skill_cache WHERE cache_key = ?1",
            params![cache_key],
            |row| {
                Ok(SkillCacheRow {
                    cache_key: row.get(0)?,
                    repo_owner: row.get(1)?,
                    repo_name: row.get(2)?,
                    repo_branch: row.get(3)?,
                    skill_directory: row.get(4)?,
                    tree_sha: row.get(5)?,
                    cached_data: row.get(6)?,
                    cached_at: row.get(7)?,
                    last_checked_at: row.get(8)?,
                })
            },
        );

        match result {
            Ok(row) => Ok(Some(row)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(e.to_string())),
        }
    }

    /// 获取仓库下所有技能缓存
    pub fn get_skill_caches_by_repo(
        &self,
        owner: &str,
        name: &str,
    ) -> Result<Vec<SkillCacheRow>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare(
                "SELECT cache_key, repo_owner, repo_name, repo_branch,
                        skill_directory, tree_sha, cached_data, cached_at, last_checked_at
                 FROM skill_cache WHERE repo_owner = ?1 AND repo_name = ?2",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map(params![owner, name], |row| {
                Ok(SkillCacheRow {
                    cache_key: row.get(0)?,
                    repo_owner: row.get(1)?,
                    repo_name: row.get(2)?,
                    repo_branch: row.get(3)?,
                    skill_directory: row.get(4)?,
                    tree_sha: row.get(5)?,
                    cached_data: row.get(6)?,
                    cached_at: row.get(7)?,
                    last_checked_at: row.get(8)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(result)
    }

    /// 保存技能缓存
    pub fn save_skill_cache(&self, row: &SkillCacheRow) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO skill_cache
             (cache_key, repo_owner, repo_name, repo_branch,
              skill_directory, tree_sha, cached_data, cached_at, last_checked_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                row.cache_key,
                row.repo_owner,
                row.repo_name,
                row.repo_branch,
                row.skill_directory,
                row.tree_sha,
                row.cached_data,
                row.cached_at,
                row.last_checked_at,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 删除仓库下所有技能缓存
    pub fn delete_skill_caches_by_repo(&self, owner: &str, name: &str) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "DELETE FROM skill_cache WHERE repo_owner = ?1 AND repo_name = ?2",
            params![owner, name],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 清空所有技能缓存（skill_cache + repo_tree_cache）
    pub fn clear_all_skill_cache(&self) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute("DELETE FROM skill_cache", [])
            .map_err(|e| AppError::Database(e.to_string()))?;
        conn.execute("DELETE FROM repo_tree_cache", [])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
