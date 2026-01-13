// SpeechRecognizer.swift
// 语音识别管理器
// 使用 SFSpeechRecognizer 进行端侧语音转文字

import Foundation
import Speech
import AVFoundation

/// 转录结果回调类型
public typealias TranscriptionResultCallback = @convention(c) (UnsafePointer<CChar>, Bool) -> Void

/// 语音识别状态
@objc public enum RecognitionStatus: Int32 {
    case idle = 0           // 空闲
    case starting = 1       // 正在启动
    case recognizing = 2    // 正在识别
    case stopping = 3       // 正在停止
    case error = -1         // 错误
}

/// 语音识别管理器 - 负责将音频转换为文字
@objc public class SpeechRecognitionManager: NSObject {
    
    // MARK: - 单例
    @objc public static let shared = SpeechRecognitionManager()
    
    // MARK: - 属性
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    
    // 音频引擎用于格式转换
    private var audioFormat: AVAudioFormat?
    
    // 回调
    private var transcriptionCallback: TranscriptionResultCallback?
    private var errorCallback: ErrorCallback?
    
    // 状态
    private(set) var status: RecognitionStatus = .idle
    
    // 当前语言
    private var currentLocale: Locale = Locale(identifier: "zh-CN")
    
    // MARK: - 初始化
    private override init() {
        super.init()
        setupAudioFormat()
    }
    
    /// 设置音频格式
    private func setupAudioFormat() {
        // 16kHz, 单声道, Float32
        audioFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16000.0,
            channels: 1,
            interleaved: false
        )
    }
    
    // MARK: - 公共方法
    
    /// 设置转录回调
    @objc public func setTranscriptionCallback(_ callback: @escaping TranscriptionResultCallback) {
        self.transcriptionCallback = callback
    }
    
    /// 设置错误回调
    @objc public func setErrorCallback(_ callback: @escaping ErrorCallback) {
        self.errorCallback = callback
    }
    
    /// 设置识别语言
    @objc public func setLanguage(_ languageCode: String) {
        currentLocale = Locale(identifier: languageCode)
        // 重新创建识别器
        speechRecognizer = SFSpeechRecognizer(locale: currentLocale)
    }
    
    /// 获取支持的语言列表
    @objc public func getSupportedLanguages() -> [String] {
        return SFSpeechRecognizer.supportedLocales().map { $0.identifier }
    }
    
    /// 检查语音识别权限
    @objc public func checkPermission(completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                completion(status == .authorized)
            }
        }
    }
    
    /// 检查是否支持端侧识别
    @objc public func supportsOnDeviceRecognition() -> Bool {
        guard let recognizer = speechRecognizer ?? SFSpeechRecognizer(locale: currentLocale) else {
            return false
        }
        return recognizer.supportsOnDeviceRecognition
    }
    
    /// 开始语音识别
    @objc public func startRecognition() -> Bool {
        guard status == .idle else {
            reportError("识别已在进行中")
            return false
        }
        
        status = .starting
        
        // 创建语音识别器
        guard let recognizer = SFSpeechRecognizer(locale: currentLocale) else {
            reportError("无法创建语音识别器，语言：\(currentLocale.identifier)")
            status = .idle
            return false
        }
        
        guard recognizer.isAvailable else {
            reportError("语音识别服务不可用")
            status = .idle
            return false
        }
        
        speechRecognizer = recognizer
        
        // 创建识别请求
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else {
            reportError("无法创建识别请求")
            status = .idle
            return false
        }
        
        // 配置请求 - 使用端侧识别
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        
        // 启用标点符号（iOS 16+ / macOS 13+）
        if #available(macOS 13.0, iOS 16.0, *) {
            request.addsPunctuation = true
        }
        
        if request.requiresOnDeviceRecognition {
            print("[SpeechRecognizer] 使用端侧识别模式")
        } else {
            print("[SpeechRecognizer] 使用服务器识别模式")
        }
        
        // 用于跟踪上次发送的转录长度，避免重复发送
        var lastSentLength = 0
        
        // 开始识别任务
        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                // 检查是否是正常结束
                let nsError = error as NSError
                if nsError.domain == "kAFAssistantErrorDomain" && nsError.code == 1110 {
                    // 正常结束，不是错误
                    return
                }
                self.reportError("识别错误: \(error.localizedDescription)")
                return
            }
            
            if let result = result {
                let fullTranscription = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                
                // 对于非最终结果，只发送变化的部分
                // 对于最终结果，发送完整内容
                if isFinal {
                    // 最终结果：发送完整转录
                    fullTranscription.withCString { cString in
                        self.transcriptionCallback?(cString, true)
                    }
                    lastSentLength = fullTranscription.count
                    print("[SpeechRecognizer] 最终结果: \(fullTranscription)")
                } else {
                    // 部分结果：发送完整的当前转录（让 Rust 层处理差异）
                    // 只有内容有变化时才发送
                    if fullTranscription.count != lastSentLength {
                        fullTranscription.withCString { cString in
                            self.transcriptionCallback?(cString, false)
                        }
                        lastSentLength = fullTranscription.count
                    }
                }
            }
        }
        
        status = .recognizing
        print("[SpeechRecognizer] 语音识别已开始，语言：\(currentLocale.identifier)")
        return true
    }
    
    /// 追加音频数据进行识别
    @objc public func appendAudioData(_ samples: UnsafePointer<Float>, count: Int32) {
        guard status == .recognizing else { return }
        guard let audioFormat = audioFormat else { return }
        
        // 创建 PCM 缓冲区
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: AVAudioFrameCount(count)) else {
            return
        }
        
        buffer.frameLength = AVAudioFrameCount(count)
        
        // 复制数据
        if let channelData = buffer.floatChannelData?[0] {
            for i in 0..<Int(count) {
                channelData[i] = samples[i]
            }
        }
        
        // 追加到识别请求
        recognitionRequest?.append(buffer)
    }
    
    /// 停止语音识别
    @objc public func stopRecognition() {
        guard status == .recognizing else { return }
        
        status = .stopping
        
        // 结束音频输入
        recognitionRequest?.endAudio()
        
        // 取消任务
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        
        status = .idle
        print("[SpeechRecognizer] 语音识别已停止")
    }
    
    /// 获取当前状态
    @objc public func getStatus() -> RecognitionStatus {
        return status
    }
    
    // MARK: - 私有方法
    
    /// 报告错误
    private func reportError(_ message: String) {
        print("[SpeechRecognizer] 错误: \(message)")
        message.withCString { cString in
            errorCallback?(cString)
        }
    }
}

// MARK: - C 接口（供 Rust FFI 调用）

/// 检查语音识别权限
@_cdecl("speech_check_permission")
public func speech_checkPermission() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var result = false
    
    SpeechRecognitionManager.shared.checkPermission { authorized in
        result = authorized
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}

/// 设置识别语言
@_cdecl("speech_set_language")
public func speech_setLanguage(_ languageCode: UnsafePointer<CChar>) {
    let language = String(cString: languageCode)
    SpeechRecognitionManager.shared.setLanguage(language)
}

/// 检查是否支持端侧识别
@_cdecl("speech_supports_on_device")
public func speech_supportsOnDevice() -> Bool {
    return SpeechRecognitionManager.shared.supportsOnDeviceRecognition()
}

/// 开始语音识别
@_cdecl("speech_start")
public func speech_start() -> Bool {
    return SpeechRecognitionManager.shared.startRecognition()
}

/// 追加音频数据
@_cdecl("speech_append_audio")
public func speech_appendAudio(_ samples: UnsafePointer<Float>, _ count: Int32) {
    SpeechRecognitionManager.shared.appendAudioData(samples, count: count)
}

/// 停止语音识别
@_cdecl("speech_stop")
public func speech_stop() {
    SpeechRecognitionManager.shared.stopRecognition()
}

/// 获取识别状态
@_cdecl("speech_get_status")
public func speech_getStatus() -> Int32 {
    return SpeechRecognitionManager.shared.getStatus().rawValue
}

/// 设置转录回调
@_cdecl("speech_set_callback")
public func speech_setCallback(_ callback: @escaping TranscriptionResultCallback) {
    SpeechRecognitionManager.shared.setTranscriptionCallback(callback)
}

/// 设置错误回调
@_cdecl("speech_set_error_callback")
public func speech_setErrorCallback(_ callback: @escaping ErrorCallback) {
    SpeechRecognitionManager.shared.setErrorCallback(callback)
}
