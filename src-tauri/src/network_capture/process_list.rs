use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sysinfo::{ProcessRefreshKind, RefreshKind, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub exe_path: Option<String>,
    pub cmd: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationInfo {
    pub name: String,
    pub exe_path: String,
    pub pids: Vec<u32>,
    pub icon: Option<String>,
}

pub fn get_all_processes() -> Vec<ProcessInfo> {
    let sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );

    sys.processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            exe_path: process.exe().map(|p| p.to_string_lossy().to_string()),
            cmd: process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_string())
                .collect(),
        })
        .collect()
}

pub fn get_applications() -> Vec<ApplicationInfo> {
    let sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );

    let mut app_map: HashMap<String, ApplicationInfo> = HashMap::new();

    for (pid, process) in sys.processes() {
        let exe_path = match process.exe() {
            Some(path) => path.to_string_lossy().to_string(),
            None => continue,
        };

        if exe_path.is_empty() {
            continue;
        }

        let name = process.name().to_string_lossy().to_string();

        if should_skip_process(&name, &exe_path) {
            continue;
        }

        app_map
            .entry(exe_path.clone())
            .and_modify(|app| app.pids.push(pid.as_u32()))
            .or_insert_with(|| ApplicationInfo {
                name: name.clone(),
                exe_path: exe_path.clone(),
                pids: vec![pid.as_u32()],
                icon: None,
            });
    }

    let mut apps: Vec<ApplicationInfo> = app_map.into_values().collect();
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

fn should_skip_process(name: &str, exe_path: &str) -> bool {
    let skip_names = [
        "svchost",
        "csrss",
        "wininit",
        "services",
        "lsass",
        "smss",
        "System",
        "Registry",
        "Memory Compression",
        "dwm",
        "fontdrvhost",
        "conhost",
        "dllhost",
        "sihost",
        "taskhostw",
        "RuntimeBroker",
        "SearchHost",
        "StartMenuExperienceHost",
        "ShellExperienceHost",
        "TextInputHost",
        "SecurityHealthService",
        "kernel_task",
        "launchd",
        "WindowServer",
        "loginwindow",
    ];

    let skip_paths = [
        "\\Windows\\System32\\",
        "\\Windows\\SysWOW64\\",
        "/usr/libexec/",
        "/System/Library/",
        "/usr/sbin/",
    ];

    if skip_names.iter().any(|n| name.eq_ignore_ascii_case(n)) {
        return true;
    }

    if skip_paths.iter().any(|p| exe_path.contains(p)) {
        return true;
    }

    false
}

pub fn search_applications(query: &str) -> Vec<ApplicationInfo> {
    let query_lower = query.to_lowercase();
    get_applications()
        .into_iter()
        .filter(|app| {
            app.name.to_lowercase().contains(&query_lower)
                || app.exe_path.to_lowercase().contains(&query_lower)
        })
        .collect()
}

pub fn get_pids_by_name(name: &str) -> Vec<u32> {
    let sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );

    let name_lower = name.to_lowercase();
    sys.processes()
        .iter()
        .filter(|(_, process)| {
            process
                .name()
                .to_string_lossy()
                .to_lowercase()
                .contains(&name_lower)
        })
        .map(|(pid, _)| pid.as_u32())
        .collect()
}
