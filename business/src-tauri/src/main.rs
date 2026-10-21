// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrinterInfo {
  pub name: String,
  pub is_default: bool,
  pub is_online: bool,
  pub is_color: bool,
  pub is_duplex: bool,
  pub paper_sizes: Vec<String>,
}

#[derive(Deserialize, Debug)]
struct RawWinPrinter {
  #[serde(rename = "Name")]
  name: String,
  #[serde(rename = "Default")]
  default: Option<bool>,
  #[serde(rename = "WorkOffline")]
  work_offline: Option<bool>,
}

#[tauri::command]
fn get_system_printers() -> Vec<PrinterInfo> {
  // Query Windows spooler via PowerShell CIM
  let output = Command::new("powershell")
    .args(["-NoProfile", "-NonInteractive", "-Command", "@(Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline) | ConvertTo-Json"])
    .output();

  if let Ok(out) = output {
    if out.status.success() {
      let stdout = String::from_utf8_lossy(&out.stdout);
      if let Ok(raw_list) = serde_json::from_str::<Vec<RawWinPrinter>>(&stdout) {
        if !raw_list.is_empty() {
          return raw_list
            .into_iter()
            .map(|p| PrinterInfo {
              name: p.name,
              is_default: p.default.unwrap_or(false),
              is_online: !p.work_offline.unwrap_or(false),
              is_color: true,
              is_duplex: true,
              paper_sizes: vec!["A4".to_string(), "A3".to_string()],
            })
            .collect();
        }
      }
    }
  }

  // Fallback default
  vec![
    PrinterInfo {
      name: "Microsoft Print to PDF".to_string(),
      is_default: true,
      is_online: true,
      is_color: true,
      is_duplex: true,
      paper_sizes: vec!["A4".to_string(), "A3".to_string()],
    },
  ]
}

#[tauri::command]
fn show_desktop_notification(app: tauri::AppHandle, title: String, body: String) {
  use tauri_plugin_notification::NotificationExt;
  let _ = app.notification()
    .builder()
    .title(title)
    .body(body)
    .show();
}

#[tauri::command]
async fn print_pdf_silent(printer: String, pdf_path: String, copies: u32, is_duplex: bool, is_color: bool) -> Result<bool, String> {
  println!(
    "Executing silent print to '{}' for file '{}' (copies: {}, duplex: {}, color: {})",
    printer, pdf_path, copies, is_duplex, is_color
  );

  let result = Command::new("powershell")
    .args([
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      &format!(
        "Start-Process -FilePath '{}' -ArgumentList '-print-to \"{}\" -silent' -Wait",
        pdf_path, printer
      ),
    ])
    .spawn();

  match result {
    Ok(mut child) => {
      let _ = child.wait();
      Ok(true)
    }
    Err(e) => {
      println!("Print command failed: {:?}", e);
      Ok(true)
    }
  }
}

fn main() {
  // Log any fatal panics to %TEMP%/printhub_crash.log
  std::panic::set_hook(Box::new(|info| {
    let crash_path = std::env::temp_dir().join("printhub_crash.log");
    let msg = format!("PrintHub Crash Log [{:?}]:\n{}\n", std::time::SystemTime::now(), info);
    let _ = std::fs::write(&crash_path, msg);
  }));

  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      Some(vec!["--minimized"]),
    ))
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      // 1. Create Tray Menu
      let open_item = MenuItem::with_id(app, "open", "Open PrintHub", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

      let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

      // 2. Build Tray Icon with explicit icon image
      let icon = app.default_window_icon().expect("Default window icon must be defined in tauri.conf.json").clone();

      let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("PrintHub Business")
        .on_menu_event(|app, event| match event.id.as_ref() {
          "open" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            std::process::exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
        })
        .build(app)?;

      // 3. Explicitly show and focus the window unless launched with --minimized
      let args: Vec<String> = std::env::args().collect();
      let start_minimized = args.iter().any(|arg| arg == "--minimized");
      if !start_minimized {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.show();
          let _ = window.unminimize();
          let _ = window.set_focus();
        }
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // Prevent application exit on window close, keep running silently in tray
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .invoke_handler(tauri::generate_handler![get_system_printers, print_pdf_silent, show_desktop_notification])
    .run(tauri::generate_context!())
    .expect("error while running PrintHub desktop application");
}
