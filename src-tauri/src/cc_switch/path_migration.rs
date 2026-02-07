//! 存储路径迁移模块
//!
//! 将应用数据从旧路径 `~/.cc-switch/` 迁移到新路径 `~/.config/mnemosyne/`。
//! 迁移采用复制策略（非移动），旧目录保留作为备份。
//! 迁移失败不阻塞启动，回退到旧路径。

use std::fs;
use std::path::PathBuf;

/// 获取旧版配置目录路径
fn get_legacy_config_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".cc-switch"))
}

/// 获取旧版模型目录路径
fn get_legacy_model_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("cavin-tools").join("models"))
}

/// 获取新版配置目录路径
fn get_new_config_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".config").join("mnemosyne"))
}

/// 迁移标记文件名
const MIGRATION_MARKER: &str = ".migrated_from_cc_switch";

/// 主迁移入口
///
/// 迁移逻辑：
/// 1. 如果用户设置了 `app_config_dir_override`，跳过迁移
/// 2. 如果新路径已有数据库文件，跳过（已迁移）
/// 3. 如果旧路径不存在，跳过（全新安装）
/// 4. 复制文件到新路径，旧目录保留
/// 5. 迁移模型文件
/// 6. 写入迁移标记
pub fn run_path_migration() -> Result<(), String> {
    // 1. 如果用户设置了自定义路径，跳过迁移
    if crate::cc_switch::app_store::get_app_config_dir_override().is_some() {
        eprintln!("[PathMigration] 检测到自定义配置路径，跳过迁移");
        return Ok(());
    }

    let new_dir = get_new_config_dir().ok_or("无法获取新配置目录路径")?;
    let new_db = new_dir.join("mnemosyne.db");

    // 2. 如果新路径已有数据库，跳过
    if new_db.exists() {
        eprintln!("[PathMigration] 新路径已存在数据库，跳过迁移");
        return Ok(());
    }

    let legacy_dir = get_legacy_config_dir().ok_or("无法获取旧配置目录路径")?;

    // 3. 如果旧路径不存在，跳过（全新安装）
    if !legacy_dir.exists() {
        eprintln!("[PathMigration] 旧路径不存在，视为全新安装，跳过迁移");
        return Ok(());
    }

    eprintln!(
        "[PathMigration] 开始迁移: {} -> {}",
        legacy_dir.display(),
        new_dir.display()
    );

    // 确保新目录存在
    fs::create_dir_all(&new_dir).map_err(|e| format!("创建新配置目录失败: {e}"))?;

    // 4. 复制配置文件
    migrate_config_files(&legacy_dir, &new_dir)?;

    // 5. 复制子目录
    migrate_subdirectories(&legacy_dir, &new_dir)?;

    // 6. 迁移模型文件
    migrate_model_files(&new_dir)?;

    // 7. 写入迁移标记
    let marker_path = new_dir.join(MIGRATION_MARKER);
    let marker_content = format!(
        "Migrated from {} at {}",
        legacy_dir.display(),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    );
    let _ = fs::write(&marker_path, marker_content);

    eprintln!("[PathMigration] 迁移完成");
    Ok(())
}

/// 迁移单个配置文件（数据库文件需要重命名）
fn migrate_config_files(legacy_dir: &PathBuf, new_dir: &PathBuf) -> Result<(), String> {
    // 数据库文件：cc-switch.db -> mnemosyne.db（含 -shm、-wal）
    for suffix in ["", "-shm", "-wal"] {
        let old_name = format!("cc-switch.db{suffix}");
        let new_name = format!("mnemosyne.db{suffix}");
        copy_if_exists(&legacy_dir.join(&old_name), &new_dir.join(&new_name));
    }

    // 同名复制的文件
    let direct_files = [
        "config.json",
        "settings.json",
        "crash.log",
        "config.json.bak",
    ];
    for name in direct_files {
        copy_if_exists(&legacy_dir.join(name), &new_dir.join(name));
    }

    Ok(())
}

/// 迁移子目录（递归复制）
fn migrate_subdirectories(legacy_dir: &PathBuf, new_dir: &PathBuf) -> Result<(), String> {
    let dirs_to_copy = ["logs", "skills", "backups"];
    for dir_name in dirs_to_copy {
        let src = legacy_dir.join(dir_name);
        let dst = new_dir.join(dir_name);
        if src.is_dir() {
            if let Err(e) = copy_dir_recursive(&src, &dst) {
                eprintln!("[PathMigration] 复制目录 {dir_name} 失败: {e}");
                // 不阻塞，继续迁移其他内容
            }
        }
    }
    Ok(())
}

/// 迁移模型文件
fn migrate_model_files(new_dir: &PathBuf) -> Result<(), String> {
    let legacy_model_dir = match get_legacy_model_dir() {
        Some(d) => d,
        None => return Ok(()),
    };

    let model_file = "rmbg-1.4.onnx";
    let src = legacy_model_dir.join(model_file);
    if !src.exists() {
        return Ok(());
    }

    let dst_dir = new_dir.join("models");
    fs::create_dir_all(&dst_dir).map_err(|e| format!("创建模型目录失败: {e}"))?;
    let dst = dst_dir.join(model_file);

    if dst.exists() {
        return Ok(());
    }

    // 优先尝试 rename（同分区原子操作）
    eprintln!("[PathMigration] 迁移模型文件: {} -> {}", src.display(), dst.display());
    match fs::rename(&src, &dst) {
        Ok(()) => {
            eprintln!("[PathMigration] 模型文件 rename 成功");
        }
        Err(_) => {
            // rename 失败（跨分区），回退到复制
            eprintln!("[PathMigration] rename 失败，回退到复制");
            if let Err(e) = fs::copy(&src, &dst) {
                eprintln!("[PathMigration] 复制模型文件失败: {e}");
            }
        }
    }

    Ok(())
}

/// 复制单个文件（如果源文件存在）
fn copy_if_exists(src: &PathBuf, dst: &PathBuf) {
    if src.exists() {
        if let Err(e) = fs::copy(src, dst) {
            eprintln!(
                "[PathMigration] 复制文件失败: {} -> {}: {e}",
                src.display(),
                dst.display()
            );
        }
    }
}

/// 递归复制目录
fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("创建目录失败 {}: {e}", dst.display()))?;

    let entries =
        fs::read_dir(src).map_err(|e| format!("读取目录失败 {}: {e}", src.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {e}"))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path.to_path_buf(), &dst_path.to_path_buf())?;
        } else if let Err(e) = fs::copy(&src_path, &dst_path) {
            eprintln!(
                "[PathMigration] 复制文件失败: {} -> {}: {e}",
                src_path.display(),
                dst_path.display()
            );
        }
    }

    Ok(())
}
