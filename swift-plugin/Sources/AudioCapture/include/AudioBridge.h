// AudioBridge.h
// C 语言头文件，定义 Swift 模块的 FFI 接口
// 用于 Rust 调用

#ifndef AudioBridge_h
#define AudioBridge_h

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// ============= 音频捕获接口 =============

/// 检查屏幕录制权限
/// @return true 如果有权限，false 否则
bool audio_capture_check_permission(void);

/// 开始音频捕获
/// @return true 如果成功启动，false 否则
bool audio_capture_start(void);

/// 停止音频捕获
void audio_capture_stop(void);

/// 获取捕获状态
/// @return 0=空闲, 1=启动中, 2=捕获中, 3=停止中, -1=错误
int32_t audio_capture_get_status(void);

// ============= 语音识别接口 =============

/// 检查语音识别权限
/// @return true 如果有权限，false 否则
bool speech_check_permission(void);

/// 设置识别语言
/// @param language_code 语言代码，如 "zh-CN", "en-US"
void speech_set_language(const char* language_code);

/// 检查是否支持端侧识别
/// @return true 如果支持，false 否则
bool speech_supports_on_device(void);

/// 开始语音识别
/// @return true 如果成功启动，false 否则
bool speech_start(void);

/// 追加音频数据
/// @param samples 音频样本数组指针
/// @param count 样本数量
void speech_append_audio(const float* samples, int32_t count);

/// 停止语音识别
void speech_stop(void);

/// 获取识别状态
/// @return 0=空闲, 1=启动中, 2=识别中, 3=停止中, -1=错误
int32_t speech_get_status(void);

// ============= 回调设置 =============

/// 音频样本回调类型
typedef void (*AudioSampleCallback)(const float* samples, int32_t count, double timestamp);

/// 转录结果回调类型
typedef void (*TranscriptionCallback)(const char* text, bool is_final);

/// 错误回调类型
typedef void (*ErrorCallback)(const char* message);

/// 设置音频样本回调
void audio_capture_set_callback(AudioSampleCallback callback);

/// 设置音频错误回调
void audio_capture_set_error_callback(ErrorCallback callback);

/// 设置转录回调
void speech_set_callback(TranscriptionCallback callback);

/// 设置语音识别错误回调
void speech_set_error_callback(ErrorCallback callback);

#ifdef __cplusplus
}
#endif

#endif /* AudioBridge_h */
