// AudioCaptureManager.swift
// 系统音频捕获管理器
// 使用 ScreenCaptureKit 捕获 macOS 系统音频

import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreMedia

/// 音频样本回调类型
public typealias AudioSampleCallback = @convention(c) (UnsafePointer<Float>, Int32, Double) -> Void

/// 转录结果回调类型
public typealias TranscriptionCallback = @convention(c) (UnsafePointer<CChar>, Bool) -> Void

/// 错误回调类型
public typealias ErrorCallback = @convention(c) (UnsafePointer<CChar>) -> Void

/// 音频捕获状态
@objc public enum CaptureStatus: Int32 {
    case idle = 0           // 空闲
    case starting = 1       // 正在启动
    case capturing = 2      // 正在捕获
    case stopping = 3       // 正在停止
    case error = -1         // 错误
}

/// 音频捕获管理器 - 负责从系统捕获音频
@objc public class AudioCaptureManager: NSObject, SCStreamDelegate, SCStreamOutput {
    
    // MARK: - 单例
    @objc public static let shared = AudioCaptureManager()
    
    // MARK: - 属性
    private var stream: SCStream?
    private var streamConfiguration: SCStreamConfiguration?
    private var contentFilter: SCContentFilter?
    
    // 回调
    private var audioCallback: AudioSampleCallback?
    private var errorCallback: ErrorCallback?
    
    // 状态
    private(set) var status: CaptureStatus = .idle
    
    // 音频格式设置
    private let sampleRate: Double = 16000.0  // 16kHz 适合语音识别
    private let channelCount: Int = 1          // 单声道
    
    // MARK: - 初始化
    private override init() {
        super.init()
    }
    
    // MARK: - 公共方法
    
    /// 设置音频样本回调
    @objc public func setAudioCallback(_ callback: @escaping AudioSampleCallback) {
        self.audioCallback = callback
    }
    
    /// 设置错误回调
    @objc public func setErrorCallback(_ callback: @escaping ErrorCallback) {
        self.errorCallback = callback
    }
    
    /// 检查屏幕录制权限
    @objc public func checkPermission() async -> Bool {
        do {
            // 尝试获取可共享内容以检查权限
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
            return !content.displays.isEmpty
        } catch {
            return false
        }
    }
    
    /// 开始捕获系统音频
    @objc public func startCapture() async -> Bool {
        guard status == .idle else {
            reportError("捕获已在进行中")
            return false
        }
        
        status = .starting
        
        do {
            // 获取可共享内容
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
            
            guard let display = content.displays.first else {
                reportError("未找到可用显示器")
                status = .idle
                return false
            }
            
            // 创建内容过滤器 - 捕获整个显示器的音频
            let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
            self.contentFilter = filter
            
            // 配置流 - 只捕获音频
            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.excludesCurrentProcessAudio = true  // 排除本应用的音频
            config.sampleRate = Int(sampleRate)
            config.channelCount = channelCount
            
            // 不需要视频
            config.width = 2
            config.height = 2
            config.minimumFrameInterval = CMTime(value: 1, timescale: 1)  // 1 FPS 最小化视频开销
            
            self.streamConfiguration = config
            
            // 创建流
            let stream = SCStream(filter: filter, configuration: config, delegate: self)
            self.stream = stream
            
            // 添加音频输出
            try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: DispatchQueue(label: "com.voicetotext.audio"))
            
            // 开始捕获
            try await stream.startCapture()
            
            status = .capturing
            print("[AudioCapture] 系统音频捕获已开始")
            return true
            
        } catch {
            reportError("启动捕获失败: \(error.localizedDescription)")
            status = .idle
            return false
        }
    }
    
    /// 停止捕获
    @objc public func stopCapture() async {
        guard status == .capturing else { return }
        
        status = .stopping
        
        do {
            try await stream?.stopCapture()
            stream = nil
            contentFilter = nil
            streamConfiguration = nil
            status = .idle
            print("[AudioCapture] 系统音频捕获已停止")
        } catch {
            reportError("停止捕获失败: \(error.localizedDescription)")
            status = .error
        }
    }
    
    /// 获取当前状态
    @objc public func getStatus() -> CaptureStatus {
        return status
    }
    
    // MARK: - SCStreamOutput 代理方法
    
    public func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio else { return }
        guard status == .capturing else { return }
        
        // 处理音频样本
        processAudioSample(sampleBuffer)
    }
    
    // MARK: - SCStreamDelegate 代理方法
    
    public func stream(_ stream: SCStream, didStopWithError error: Error) {
        reportError("流停止: \(error.localizedDescription)")
        status = .error
    }
    
    // MARK: - 私有方法
    
    /// 处理音频样本缓冲区
    private func processAudioSample(_ sampleBuffer: CMSampleBuffer) {
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
        
        var length = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        
        let status = CMBlockBufferGetDataPointer(blockBuffer, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &length, dataPointerOut: &dataPointer)
        
        guard status == kCMBlockBufferNoErr, let data = dataPointer else { return }
        
        // 获取时间戳
        let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let timestamp = CMTimeGetSeconds(presentationTime)
        
        // 将数据转换为 Float 数组（假设是 Float32 格式）
        let floatCount = length / MemoryLayout<Float>.size
        let floatPointer = UnsafeRawPointer(data).bindMemory(to: Float.self, capacity: floatCount)
        
        // 调用回调
        audioCallback?(floatPointer, Int32(floatCount), timestamp)
    }
    
    /// 报告错误
    private func reportError(_ message: String) {
        print("[AudioCapture] 错误: \(message)")
        message.withCString { cString in
            errorCallback?(cString)
        }
    }
}

// MARK: - C 接口（供 Rust FFI 调用）

/// 检查屏幕录制权限
@_cdecl("audio_capture_check_permission")
public func audioCapture_checkPermission() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var result = false
    
    Task {
        result = await AudioCaptureManager.shared.checkPermission()
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}

/// 开始音频捕获
@_cdecl("audio_capture_start")
public func audioCapture_start() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var result = false
    
    Task {
        result = await AudioCaptureManager.shared.startCapture()
        semaphore.signal()
    }
    
    semaphore.wait()
    return result
}

/// 停止音频捕获
@_cdecl("audio_capture_stop")
public func audioCapture_stop() {
    let semaphore = DispatchSemaphore(value: 0)
    
    Task {
        await AudioCaptureManager.shared.stopCapture()
        semaphore.signal()
    }
    
    semaphore.wait()
}

/// 获取捕获状态
@_cdecl("audio_capture_get_status")
public func audioCapture_getStatus() -> Int32 {
    return AudioCaptureManager.shared.getStatus().rawValue
}

/// 设置音频回调
@_cdecl("audio_capture_set_callback")
public func audioCapture_setCallback(_ callback: @escaping AudioSampleCallback) {
    AudioCaptureManager.shared.setAudioCallback(callback)
}

/// 设置错误回调
@_cdecl("audio_capture_set_error_callback")
public func audioCapture_setErrorCallback(_ callback: @escaping ErrorCallback) {
    AudioCaptureManager.shared.setErrorCallback(callback)
}
