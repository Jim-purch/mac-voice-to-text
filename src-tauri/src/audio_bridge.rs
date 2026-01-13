// audio_bridge.rs
// Rust FFI 桥接层
// 用于连接 Swift 音频捕获和语音识别模块

use std::ffi::{c_char, c_float, c_int, CStr, CString};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, Once};

/// 音频样本回调类型
type AudioSampleCallback = extern "C" fn(*const c_float, c_int, f64);

/// 转录结果回调类型  
type TranscriptionCallback = extern "C" fn(*const c_char, bool);

/// 错误回调类型
type ErrorCallback = extern "C" fn(*const c_char);

// 条件编译：只在 swift_audio 特性启用时链接 Swift 库
#[cfg(feature = "swift_audio")]
mod ffi {
    use super::*;
    
    #[link(name = "AudioCapture")]
    extern "C" {
        // 音频捕获函数
        pub fn audio_capture_check_permission() -> bool;
        pub fn audio_capture_start() -> bool;
        pub fn audio_capture_stop();
        pub fn audio_capture_get_status() -> c_int;
        pub fn audio_capture_set_callback(callback: AudioSampleCallback);
        pub fn audio_capture_set_error_callback(callback: ErrorCallback);
        
        // 语音识别函数
        pub fn speech_check_permission() -> bool;
        pub fn speech_set_language(language_code: *const c_char);
        pub fn speech_supports_on_device() -> bool;
        pub fn speech_start() -> bool;
        pub fn speech_append_audio(samples: *const c_float, count: c_int);
        pub fn speech_stop();
        pub fn speech_get_status() -> c_int;
        pub fn speech_set_callback(callback: TranscriptionCallback);
        pub fn speech_set_error_callback(callback: ErrorCallback);
    }
}

/// 全局转录结果存储
static INIT: Once = Once::new();
static IS_CAPTURING: AtomicBool = AtomicBool::new(false);

lazy_static::lazy_static! {
    static ref TRANSCRIPTION_BUFFER: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref LATEST_TRANSCRIPTION: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref ERROR_MESSAGE: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
}

/// 音频样本回调 - 将音频数据传递给语音识别
#[cfg(feature = "swift_audio")]
extern "C" fn on_audio_sample(samples: *const c_float, count: c_int, _timestamp: f64) {
    if samples.is_null() || count <= 0 {
        return;
    }
    
    unsafe {
        ffi::speech_append_audio(samples, count);
    }
}

#[cfg(not(feature = "swift_audio"))]
extern "C" fn on_audio_sample(_samples: *const c_float, _count: c_int, _timestamp: f64) {}

/// 转录结果回调
extern "C" fn on_transcription(text: *const c_char, is_final: bool) {
    if text.is_null() {
        return;
    }
    
    let text_str = unsafe {
        match CStr::from_ptr(text).to_str() {
            Ok(s) => s.to_string(),
            Err(_) => return,
        }
    };
    
    // 更新最新转录（实时显示用）
    if let Ok(mut latest) = LATEST_TRANSCRIPTION.lock() {
        *latest = text_str.clone();
    }
    
    // 如果是最终结果，追加到缓冲区并清空最新转录
    if is_final {
        if let Ok(mut buffer) = TRANSCRIPTION_BUFFER.lock() {
            if !buffer.is_empty() {
                buffer.push('\n');
            }
            buffer.push_str(&text_str);
        }
        // 最终结果已追加，清空 latest 避免重复
        if let Ok(mut latest) = LATEST_TRANSCRIPTION.lock() {
            latest.clear();
        }
    }
    
    log::info!("转录{}: {}", if is_final { "(最终)" } else { "(部分)" }, text_str);
}

/// 错误回调
extern "C" fn on_error(message: *const c_char) {
    if message.is_null() {
        return;
    }
    
    let msg = unsafe {
        match CStr::from_ptr(message).to_str() {
            Ok(s) => s.to_string(),
            Err(_) => "未知错误".to_string(),
        }
    };
    
    log::error!("原生模块错误: {}", msg);
    
    if let Ok(mut error) = ERROR_MESSAGE.lock() {
        *error = Some(msg);
    }
}

/// 音频桥接模块
pub struct AudioBridge;

impl AudioBridge {
    /// 初始化回调
    #[cfg(feature = "swift_audio")]
    pub fn init() {
        INIT.call_once(|| {
            unsafe {
                ffi::audio_capture_set_callback(on_audio_sample);
                ffi::audio_capture_set_error_callback(on_error);
                ffi::speech_set_callback(on_transcription);
                ffi::speech_set_error_callback(on_error);
            }
            log::info!("音频桥接已初始化 (Swift 模式)");
        });
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn init() {
        INIT.call_once(|| {
            log::info!("音频桥接已初始化 (模拟模式)");
        });
    }
    
    /// 检查所有权限
    #[cfg(feature = "swift_audio")]
    pub fn check_permissions() -> (bool, bool) {
        unsafe {
            let audio_ok = ffi::audio_capture_check_permission();
            let speech_ok = ffi::speech_check_permission();
            (audio_ok, speech_ok)
        }
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn check_permissions() -> (bool, bool) {
        // 模拟模式：返回 false，提示需要权限
        (false, false)
    }
    
    /// 设置识别语言
    #[cfg(feature = "swift_audio")]
    pub fn set_language(language: &str) {
        if let Ok(c_string) = CString::new(language) {
            unsafe {
                ffi::speech_set_language(c_string.as_ptr());
            }
        }
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn set_language(_language: &str) {
        log::info!("模拟模式：设置语言");
    }
    
    /// 检查是否支持端侧识别
    #[cfg(feature = "swift_audio")]
    pub fn supports_on_device() -> bool {
        unsafe { ffi::speech_supports_on_device() }
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn supports_on_device() -> bool {
        true // 模拟模式假设支持
    }
    
    /// 开始转录
    #[cfg(feature = "swift_audio")]
    pub fn start_transcription() -> Result<(), String> {
        if IS_CAPTURING.load(Ordering::SeqCst) {
            return Err("转录已在进行中".to_string());
        }
        
        // 清空之前的错误和缓冲
        Self::clear_transcription();
        if let Ok(mut error) = ERROR_MESSAGE.lock() {
            *error = None;
        }
        
        // 启动语音识别
        let speech_started = unsafe { ffi::speech_start() };
        if !speech_started {
            return Err("启动语音识别失败".to_string());
        }
        
        // 启动音频捕获
        let capture_started = unsafe { ffi::audio_capture_start() };
        if !capture_started {
            unsafe { ffi::speech_stop(); }
            return Err("启动音频捕获失败".to_string());
        }
        
        IS_CAPTURING.store(true, Ordering::SeqCst);
        log::info!("转录已开始");
        Ok(())
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn start_transcription() -> Result<(), String> {
        if IS_CAPTURING.load(Ordering::SeqCst) {
            return Err("转录已在进行中".to_string());
        }
        
        Self::clear_transcription();
        IS_CAPTURING.store(true, Ordering::SeqCst);
        log::info!("转录已开始 (模拟模式)");
        Ok(())
    }
    
    /// 停止转录
    #[cfg(feature = "swift_audio")]
    pub fn stop_transcription() {
        if !IS_CAPTURING.load(Ordering::SeqCst) {
            return;
        }
        
        unsafe {
            ffi::audio_capture_stop();
            ffi::speech_stop();
        }
        
        IS_CAPTURING.store(false, Ordering::SeqCst);
        log::info!("转录已停止");
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn stop_transcription() {
        IS_CAPTURING.store(false, Ordering::SeqCst);
        log::info!("转录已停止 (模拟模式)");
    }
    
    /// 获取最新的转录文本
    pub fn get_latest_transcription() -> String {
        LATEST_TRANSCRIPTION.lock()
            .map(|s| s.clone())
            .unwrap_or_default()
    }
    
    /// 获取完整的转录缓冲区
    pub fn get_full_transcription() -> String {
        TRANSCRIPTION_BUFFER.lock()
            .map(|s| s.clone())
            .unwrap_or_default()
    }
    
    /// 清空转录缓冲区
    pub fn clear_transcription() {
        if let Ok(mut buffer) = TRANSCRIPTION_BUFFER.lock() {
            buffer.clear();
        }
        if let Ok(mut latest) = LATEST_TRANSCRIPTION.lock() {
            latest.clear();
        }
    }
    
    /// 模拟追加文本（用于测试）
    pub fn simulate_text(text: &str) {
        if let Ok(mut latest) = LATEST_TRANSCRIPTION.lock() {
            *latest = text.to_string();
        }
        if let Ok(mut buffer) = TRANSCRIPTION_BUFFER.lock() {
            if !buffer.is_empty() {
                buffer.push('\n');
            }
            buffer.push_str(text);
        }
    }
    
    /// 获取错误信息
    pub fn get_error() -> Option<String> {
        ERROR_MESSAGE.lock()
            .ok()
            .and_then(|e| e.clone())
    }
    
    /// 是否正在捕获
    pub fn is_capturing() -> bool {
        IS_CAPTURING.load(Ordering::SeqCst)
    }
    
    /// 获取捕获状态
    #[cfg(feature = "swift_audio")]
    pub fn get_capture_status() -> i32 {
        unsafe { ffi::audio_capture_get_status() }
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn get_capture_status() -> i32 {
        if IS_CAPTURING.load(Ordering::SeqCst) { 2 } else { 0 }
    }
    
    /// 获取识别状态
    #[cfg(feature = "swift_audio")]
    pub fn get_recognition_status() -> i32 {
        unsafe { ffi::speech_get_status() }
    }
    
    #[cfg(not(feature = "swift_audio"))]
    pub fn get_recognition_status() -> i32 {
        if IS_CAPTURING.load(Ordering::SeqCst) { 2 } else { 0 }
    }
}
