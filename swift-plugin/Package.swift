// swift-tools-version:5.9
// Swift Package 配置文件
// 用于编译音频捕获和语音识别原生模块

import PackageDescription

let package = Package(
    name: "AudioCapture",
    platforms: [
        .macOS(.v13) // 最低支持 macOS 13.0 (Ventura)
    ],
    products: [
        // 静态库，供 Rust 通过 FFI 调用
        .library(
            name: "AudioCapture",
            type: .static,
            targets: ["AudioCapture"]
        ),
    ],
    targets: [
        .target(
            name: "AudioCapture",
            dependencies: [],
            path: "Sources/AudioCapture",
            linkerSettings: [
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("Speech"),
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreMedia"),
            ]
        ),
    ]
)
