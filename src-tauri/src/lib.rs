use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

#[tauri::command]
fn save_file(data: Vec<u8>, app: tauri::AppHandle) {
    dbg!(&data);

    app.dialog()
        .file()
        .add_filter("DOLLBOX files", &["dbx", "dollbox"])
        .save_file(move |file_path| {
            dbg!(&file_path);
            if file_path.is_none() {
                return;
            }
            let result = std::fs::write(file_path.unwrap().as_path().unwrap(),data);
            if result.is_err() {
                app.dialog()
                    .message(result.unwrap_err().to_string())
                    .kind(MessageDialogKind::Error)
                    .title("File save error")
                    .show(|_| {});
                return;
            }
            app.dialog()
                .message("File save success")
                .kind(MessageDialogKind::Info)
                .title("Alert")
                .show(|_| {});
            return;
        });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
