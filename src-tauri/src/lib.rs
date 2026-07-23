mod commands;
mod contracts;
mod events;
mod exports;

use commands::{cancel_review_analysis, start_review_analysis, JobState};
use exports::save_export;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .manage(JobState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            start_review_analysis,
            cancel_review_analysis,
            save_export
        ])
        .run(tauri::generate_context!());
    if let Err(error) = result {
        eprintln!("ReviewFlow Desktop 실행 실패: {error}");
        std::process::exit(1);
    }
}
