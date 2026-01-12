// audio_bridge.rs
// Rust FFI 桥接层
// 用于连接 Swift 音频捕获和语音识别模块

use std::ffi::{c_char, c_float, c_int, CStr, CString};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// 音频样本回调类型
type AudioSampleCallback = extern "C" fn(*const c_float, c_int, f64);

/// 转录结果回调类型  
type TranscriptionCallback = extern "C" fn(*const c_char, bool);

/// 错误回调类型
type ErrorCallback = extern "C" fn(*const c_char);

// Swift FFI 函数声明
#[link(name = "AudioCapture", kind = "dylib")]
extern "C" {
    // 音频捕获函数
    fn audio_capture_check_permission() -> bool;
    fn audio_capture_start() -> bool;
    fn audio_capture_stop();
    fn audio_capture_get_status() -> c_int;
    fn audio_capture_set_callback(callback: AudioSampleCallback);
    fn audio_capture_set_error_callback(callback: ErrorCallback);
    
    // 语音识别函数
    fn speech_check_permission() -> bool;
    fn speech_set_language(language_code: *const c_char);
    fn speech_supports_on_device() -> bool;
    fn speech_start() -> bool;
    fn speech_append_audio(samples: *const c_float, count: c_int);
    fn speech_stop();
    fn speech_get_status() -> c_int;
    fn speech_set_callback(callback: TranscriptionCallback);
    fn speech_set_error_callback(callback: ErrorCallback);
}

/// 全局转录结果存储
lazy_static::lazy_static! {
    static ref TRANSCRIPTION_BUFFER: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref LATEST_TRANSCRIPTION: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref ERROR_MESSAGE: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    static ref IS_CAPTURING: AtomicBool = AtomicBool::new(false);
}

/// 音频样本回调 - 将音频数据传递给语音识别
extern "C" fn on_audio_sample(samples: *const c_float, count: c_int, _timestamp: f64) {
    if samples.is_null() || count <= 0 {
        return;
    }
    
    unsafe {
        speech_append_audio(samples, count);
    }
}

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
    
    // 更新最新转录
    if let Ok(mut latest) = LATEST_TRANSCRIPTION.lock() {
        *latest = text_str.clone();
    }
    
    // 如果是最终结果，追加到缓冲区
    if is_final {
        if let Ok(mut buffer) = TRANSCRIPTION_BUFFER.lock() {
            if !buffer.is_empty() {
                buffer.push('\n');
            }
            buffer.push_str(&text_str);
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
    pub fn init() {
        unsafe {
            audio_capture_set_callback(on_audio_sample);
            audio_capture_set_error_callback(on_error);
            speech_set_callback(on_transcription);
            speech_set_error_callback(on_error);
        }
        log::info!("音频桥接已初始化");
    }
    
    /// 检查所有权限
    pub fn check_permissions() -> (bool, bool) {
        unsafe {
            let audio_ok = audio_capture_check_permission();
            let speech_ok = speech_check_permission();
            (audio_ok, speech_ok)
        }
    }
    
    /// 设置识别语言
    pub fn set_language(language: &str) {
        let c_string = CString::new(language).unwrap_or_default();
        unsafe {
            speech_set_language(c_string.as_ptr());
        }
    }
    
    /// 检查是否支持端侧识别
    pub fn supports_on_device() -> bool {
        unsafe { speech_supports_on_device() }
    }
    
    /// 开始转录
    pub fn start_transcription() -> Result<(), String> {
        if IS_CAPTURING.load(Ordering::SeqCst) {
            return Err("转录已在进行中".to_string());
        }
        
        // 清空之前的错误
        if let Ok(mut error) = ERROR_MESSAGE.lock() {
            *error = None;
        }
        
        // 启动语音识别
        let speech_started = unsafe { speech_start() };
        if !speech_started {
            return Err("启动语音识别失败".to_string());
        }
        
        // 启动音频捕获
        let capture_started = unsafe { audio_capture_start() };
        if !capture_started {
            unsafe { speech_stop(); }
            return Err("启动音频捕获失败".to_string());
        }
        
        IS_CAPTURING.store(true, Ordering::SeqCst);
        log::info!("转录已开始");
        Ok(())
    }
    
    /// 停止转录
    pub fn stop_transcription() {
        if !IS_CAPTURING.load(Ordering::SeqCst) {
            return;
        }
        
        unsafe {
            audio_capture_stop();
            speech_stop();
        }
        
        IS_CAPTURING.store(false, Ordering::SeqCst);
        log::info!("转录已停止");
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
    pub fn get_capture_status() -> i32 {
        unsafe { audio_capture_get_status() }
    }
    
    /// 获取识别状态
    pub fn get_recognition_status() -> i32 {
        unsafe { speech_get_status() }
    }
}
