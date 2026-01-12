// lib.rs
// Tauri 应用主入口
// Mac Voice to Text - 实时语音转文字应用

// 由于 Swift 库需要在运行时加载，使用条件编译
// 在开发阶段，我们使用模拟模式，直到 Swift 库编译就绪

mod storage;

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use storage::{StorageManager, TranscriptRecord};
use tauri::{AppHandle, Manager, State};

/// 应用状态
struct AppState {
    storage: Mutex<Option<StorageManager>>,
    current_language: Mutex<String>,
    is_capturing: Mutex<bool>,
    transcription_buffer: Mutex<String>,
    latest_transcription: Mutex<String>,
    capture_start_time: Mutex<Option<std::time::Instant>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            storage: Mutex::new(None),
            current_language: Mutex::new("zh-CN".to_string()),
            is_capturing: Mutex::new(false),
            transcription_buffer: Mutex::new(String::new()),
            latest_transcription: Mutex::new(String::new()),
            capture_start_time: Mutex::new(None),
        }
    }
}

/// 权限状态返回结构
#[derive(Debug, Serialize, Deserialize)]
struct PermissionStatus {
    audio_capture: bool,
    speech_recognition: bool,
}

/// 转录状态返回结构
#[derive(Debug, Serialize, Deserialize)]
struct TranscriptionStatus {
    is_capturing: bool,
    latest_text: String,
    full_text: String,
    duration_seconds: i32,
}

// ============= Tauri 命令 =============

/// 检查权限状态
#[tauri::command]
async fn check_permissions() -> Result<PermissionStatus, String> {
    // TODO: 在 Swift 库就绪后，调用实际的权限检查
    // 目前返回模拟值，提示用户需要手动授权
    log::info!("检查权限状态");
    
    Ok(PermissionStatus {
        audio_capture: false,  // 在 Swift 库就绪后改为实际检查
        speech_recognition: false,
    })
}

/// 请求权限（打开系统设置）
#[tauri::command]
async fn request_permissions() -> Result<(), String> {
    log::info!("请求用户授权");
    
    // 打开系统偏好设置 - 隐私与安全 - 屏幕录制
    std::process::Command::new("open")
        .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"])
        .spawn()
        .map_err(|e| format!("无法打开系统设置: {}", e))?;
    
    Ok(())
}

/// 设置识别语言
#[tauri::command]
async fn set_language(state: State<'_, AppState>, language: String) -> Result<(), String> {
    log::info!("设置识别语言: {}", language);
    
    let mut current = state.current_language.lock()
        .map_err(|_| "无法获取状态锁")?;
    *current = language;
    
    Ok(())
}

/// 获取当前语言
#[tauri::command]
async fn get_language(state: State<'_, AppState>) -> Result<String, String> {
    let current = state.current_language.lock()
        .map_err(|_| "无法获取状态锁")?;
    Ok(current.clone())
}

/// 获取支持的语言列表
#[tauri::command]
async fn get_supported_languages() -> Result<Vec<(String, String)>, String> {
    // 常用语言列表
    Ok(vec![
        ("zh-CN".to_string(), "简体中文".to_string()),
        ("zh-TW".to_string(), "繁體中文".to_string()),
        ("en-US".to_string(), "English (US)".to_string()),
        ("en-GB".to_string(), "English (UK)".to_string()),
        ("ja-JP".to_string(), "日本語".to_string()),
        ("ko-KR".to_string(), "한국어".to_string()),
        ("es-ES".to_string(), "Español".to_string()),
        ("fr-FR".to_string(), "Français".to_string()),
        ("de-DE".to_string(), "Deutsch".to_string()),
    ])
}

/// 开始转录
#[tauri::command]
async fn start_transcription(state: State<'_, AppState>) -> Result<(), String> {
    log::info!("开始转录");
    
    {
        let is_capturing = state.is_capturing.lock()
            .map_err(|_| "无法获取状态锁")?;
        if *is_capturing {
            return Err("转录已在进行中".to_string());
        }
    }
    
    // 清空缓冲区
    {
        let mut buffer = state.transcription_buffer.lock()
            .map_err(|_| "无法获取状态锁")?;
        buffer.clear();
    }
    {
        let mut latest = state.latest_transcription.lock()
            .map_err(|_| "无法获取状态锁")?;
        latest.clear();
    }
    
    // 记录开始时间
    {
        let mut start_time = state.capture_start_time.lock()
            .map_err(|_| "无法获取状态锁")?;
        *start_time = Some(std::time::Instant::now());
    }
    
    // 设置捕获状态
    {
        let mut is_capturing = state.is_capturing.lock()
            .map_err(|_| "无法获取状态锁")?;
        *is_capturing = true;
    }
    
    // TODO: 在 Swift 库就绪后，启动实际的音频捕获和语音识别
    // audio_bridge::AudioBridge::start_transcription()?;
    
    Ok(())
}

/// 停止转录
#[tauri::command]
async fn stop_transcription(state: State<'_, AppState>) -> Result<TranscriptionStatus, String> {
    log::info!("停止转录");
    
    let duration_seconds;
    {
        let start_time = state.capture_start_time.lock()
            .map_err(|_| "无法获取状态锁")?;
        duration_seconds = start_time
            .map(|t| t.elapsed().as_secs() as i32)
            .unwrap_or(0);
    }
    
    // 停止捕获
    {
        let mut is_capturing = state.is_capturing.lock()
            .map_err(|_| "无法获取状态锁")?;
        *is_capturing = false;
    }
    
    // TODO: 在 Swift 库就绪后，停止实际的音频捕获和语音识别
    // audio_bridge::AudioBridge::stop_transcription();
    
    let full_text = state.transcription_buffer.lock()
        .map_err(|_| "无法获取状态锁")?
        .clone();
    
    let latest_text = state.latest_transcription.lock()
        .map_err(|_| "无法获取状态锁")?
        .clone();
    
    Ok(TranscriptionStatus {
        is_capturing: false,
        latest_text,
        full_text,
        duration_seconds,
    })
}

/// 获取转录状态
#[tauri::command]
async fn get_transcription_status(state: State<'_, AppState>) -> Result<TranscriptionStatus, String> {
    let is_capturing = *state.is_capturing.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    let latest_text = state.latest_transcription.lock()
        .map_err(|_| "无法获取状态锁")?
        .clone();
    
    let full_text = state.transcription_buffer.lock()
        .map_err(|_| "无法获取状态锁")?
        .clone();
    
    let duration_seconds = state.capture_start_time.lock()
        .map_err(|_| "无法获取状态锁")?
        .map(|t| t.elapsed().as_secs() as i32)
        .unwrap_or(0);
    
    Ok(TranscriptionStatus {
        is_capturing,
        latest_text,
        full_text,
        duration_seconds,
    })
}

/// 保存转录记录
#[tauri::command]
async fn save_transcript(
    state: State<'_, AppState>,
    content: String,
    duration_seconds: i32,
) -> Result<TranscriptRecord, String> {
    let storage = state.storage.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    let storage = storage.as_ref()
        .ok_or("存储未初始化")?;
    
    let language = state.current_language.lock()
        .map_err(|_| "无法获取状态锁")?
        .clone();
    
    storage.save_transcript(&content, &language, duration_seconds)
}

/// 获取转录历史
#[tauri::command]
async fn get_transcript_history(state: State<'_, AppState>) -> Result<Vec<TranscriptRecord>, String> {
    let storage = state.storage.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    let storage = storage.as_ref()
        .ok_or("存储未初始化")?;
    
    storage.load_transcripts()
}

/// 删除转录记录
#[tauri::command]
async fn delete_transcript(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let storage = state.storage.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    let storage = storage.as_ref()
        .ok_or("存储未初始化")?;
    
    storage.delete_transcript(id)
}

/// 导出转录记录
#[tauri::command]
async fn export_transcript(
    state: State<'_, AppState>,
    id: i64,
    format: String,
) -> Result<String, String> {
    let storage = state.storage.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    let storage = storage.as_ref()
        .ok_or("存储未初始化")?;
    
    storage.export_transcript(id, &format)
}

/// 模拟接收转录文本（用于演示）
#[tauri::command]
async fn simulate_transcription(state: State<'_, AppState>, text: String) -> Result<(), String> {
    let is_capturing = *state.is_capturing.lock()
        .map_err(|_| "无法获取状态锁")?;
    
    if !is_capturing {
        return Err("转录未在进行中".to_string());
    }
    
    // 更新最新文本
    {
        let mut latest = state.latest_transcription.lock()
            .map_err(|_| "无法获取状态锁")?;
        *latest = text.clone();
    }
    
    // 追加到缓冲区
    {
        let mut buffer = state.transcription_buffer.lock()
            .map_err(|_| "无法获取状态锁")?;
        if !buffer.is_empty() {
            buffer.push_str("\n");
        }
        buffer.push_str(&text);
    }
    
    Ok(())
}

// ============= 应用入口 =============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 初始化日志
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // 初始化存储
            let storage = StorageManager::new(app.handle())
                .map_err(|e| format!("初始化存储失败: {}", e))?;
            
            let state = app.state::<AppState>();
            let mut storage_lock = state.storage.lock()
                .map_err(|_| "无法获取状态锁".to_string())?;
            *storage_lock = Some(storage);
            
            log::info!("Mac Voice to Text 应用已启动");
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            check_permissions,
            request_permissions,
            set_language,
            get_language,
            get_supported_languages,
            start_transcription,
            stop_transcription,
            get_transcription_status,
            save_transcript,
            get_transcript_history,
            delete_transcript,
            export_transcript,
            simulate_transcription,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
