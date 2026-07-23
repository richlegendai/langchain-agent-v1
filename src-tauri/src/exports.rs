use std::fs;

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::commands::CommandError;

const MAX_EXPORT_BYTES: usize = 20_000_000;

fn validate_export(file_name: &str, content_length: usize) -> Result<(), CommandError> {
    let extension = file_name.rsplit_once('.').map(|(_, value)| value);
    if !matches!(extension, Some("csv" | "json"))
        || file_name.contains('/')
        || file_name.contains('\\')
        || content_length > MAX_EXPORT_BYTES
    {
        return Err(CommandError::new(
            "invalid_export",
            "내보내기 파일 정보가 올바르지 않습니다.",
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn save_export(
    app: AppHandle,
    file_name: String,
    content: String,
) -> Result<bool, CommandError> {
    validate_export(&file_name, content.len())?;
    let selected = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .blocking_save_file();
    let Some(selected) = selected else {
        return Ok(false);
    };
    let path = match selected {
        FilePath::Path(path) => path,
        FilePath::Url(_) => {
            return Err(CommandError::new(
                "unsupported_export_path",
                "선택한 위치에는 파일을 저장할 수 없습니다.",
            ));
        }
    };
    fs::write(path, content.as_bytes()).map_err(|_| {
        CommandError::new("export_failed", "선택한 위치에 파일을 저장하지 못했습니다.")
    })?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::validate_export;

    #[test]
    fn accepts_csv_export_with_safe_name() {
        assert!(validate_export("reviews.csv", 128).is_ok());
    }

    #[test]
    fn rejects_export_name_with_path_separator() {
        assert!(validate_export("../reviews.csv", 128).is_err());
    }
}
