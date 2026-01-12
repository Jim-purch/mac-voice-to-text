#!/bin/bash
# build-swift.sh
# 编译 Swift 静态库脚本

set -e

echo "🔨 开始编译 Swift 音频捕获库..."

# 进入 swift-plugin 目录
cd "$(dirname "$0")/../swift-plugin"

# 清理之前的构建
swift package clean 2>/dev/null || true

# 编译 Release 版本
echo "📦 编译 Release 版本..."
swift build -c release

# 获取编译输出路径
BUILD_DIR=$(swift build -c release --show-bin-path)
echo "✅ 编译完成！"
echo "📁 输出目录: $BUILD_DIR"

# 复制到 src-tauri 目录
TARGET_DIR="$(dirname "$0")"
mkdir -p "$TARGET_DIR/libs"

# 复制静态库
if [ -f "$BUILD_DIR/libAudioCapture.a" ]; then
    cp "$BUILD_DIR/libAudioCapture.a" "$TARGET_DIR/libs/"
    echo "✅ 已复制 libAudioCapture.a 到 src-tauri/libs/"
else
    echo "⚠️ 未找到 libAudioCapture.a，尝试查找其他格式..."
    find "$BUILD_DIR" -name "*.a" -o -name "*.dylib" 2>/dev/null | head -5
fi

echo ""
echo "🎉 Swift 库编译完成！"
echo "现在可以运行: npm run tauri dev"
