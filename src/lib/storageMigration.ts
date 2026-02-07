/**
 * localStorage 键名迁移工具
 *
 * 将旧版 localStorage 键名迁移到新的 `mnemosyne:` 前缀格式。
 * 迁移为一次性操作：读取旧键值 → 写入新键 → 删除旧键。
 */

const MIGRATION_KEY = 'mnemosyne:storage-migrated';

/** 旧键名 → 新键名 映射表 */
const KEY_MIGRATION_MAP: Record<string, string> = {
  'cavin-tools-skipped-version': 'mnemosyne:skipped-version',
  'cc-switch-theme': 'mnemosyne:theme',
  'ai-assistant-theme': 'mnemosyne:ai-theme',
};

/**
 * 执行 localStorage 键名迁移
 *
 * 在应用启动时调用一次。如果已迁移过则跳过。
 */
export function runStorageMigration(): void {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) {
      return;
    }

    for (const [oldKey, newKey] of Object.entries(KEY_MIGRATION_MAP)) {
      const value = localStorage.getItem(oldKey);
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      }
    }

    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (error) {
    console.error('[StorageMigration] 迁移失败:', error);
  }
}
