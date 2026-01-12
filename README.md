# Mac Voice to Text 🎙️

一款 macOS 桌面应用，可以实时捕获系统音频并转换为文字。

![macOS](https://img.shields.io/badge/macOS-13.0+-blue?logo=apple)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特点

- 🔊 **系统音频捕获** - 使用 ScreenCaptureKit 捕获 macOS 系统音频
- 🗣️ **端侧语音识别** - 使用 SFSpeechRecognizer，无需联网，保护隐私
- ⚡ **实时转录** - 边播放边转录，低延迟
- 💾 **自动保存** - 转录内容自动保存为历史记录
- 📤 **多格式导出** - 支持导出为 TXT、Markdown、JSON
- 🌏 **多语言支持** - 支持中文、英语、日语等多种语言

## 📋 系统要求

- **macOS 13.0 (Ventura)** 或更高版本
- **Apple Silicon (M 芯片)** 或 Intel Mac
- 需要授予以下权限：
  - ✅ 屏幕录制权限（用于捕获系统音频）
  - ✅ 语音识别权限

## 🚀 快速开始

### 开发环境

1. **安装依赖**

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Node.js 依赖
npm install
```

2. **运行开发版本**

```bash
npm run tauri dev
```

3. **构建发布版本**

```bash
npm run tauri build
```

### 下载安装

前往 [Releases](https://github.com/Jim-purch/mac-voice-to-text/releases) 页面下载最新版本的 `.dmg` 安装包。

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Tauri v2 |
| 前端 | React 19 + TypeScript |
| 样式 | 原生 CSS（深色主题 + 毛玻璃效果）|
| 音频捕获 | ScreenCaptureKit (Swift) |
| 语音识别 | SFSpeechRecognizer (Swift) |
| 数据存储 | JSON 文件 |
| 构建工具 | Vite |

## 📁 项目结构

```
mac-voice-to-text/
├── src/                    # React 前端源码
│   ├── components/         # UI 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── App.tsx             # 主应用组件
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── lib.rs          # 主入口和命令
│   │   └── storage.rs      # 数据存储
│   ├── Cargo.toml
│   └── tauri.conf.json
├── swift-plugin/           # Swift 原生模块
│   ├── Sources/AudioCapture/
│   │   ├── AudioCaptureManager.swift   # 音频捕获
│   │   └── SpeechRecognizer.swift      # 语音识别
│   └── Package.swift
└── package.json
```

## 🛡️ 隐私说明

- 所有语音识别均在本地设备进行，不会上传至任何服务器
- 转录数据仅存储在本地应用数据目录
- 应用不收集任何用户信息

## 📝 开发说明

### Swift 模块编译

Swift 原生模块提供音频捕获和语音识别功能。在完整集成时需要：

```bash
cd swift-plugin
swift build -c release
```

### 权限配置

应用需要在 `Info.plist` 中声明以下权限：

- `NSMicrophoneUsageDescription` - 麦克风权限（音频处理）
- `NSSpeechRecognitionUsageDescription` - 语音识别权限
- `NSScreenCaptureUsageDescription` - 屏幕录制权限（系统音频捕获）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit) - 系统音频捕获
- [Apple Speech Framework](https://developer.apple.com/documentation/speech) - 语音识别
