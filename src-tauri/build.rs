// build.rs
// Tauri 构建脚本
// 负责链接 Swift 原生库和运行时

use std::env;
use std::path::PathBuf;

fn main() {
    // 运行 Tauri 构建
    tauri_build::build();
    
    // 获取项目根目录
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    
    // Swift 库可能在两个位置：src-tauri/libs 或 swift-plugin/libs
    let libs_dir_tauri = PathBuf::from(&manifest_dir).join("libs");
    let libs_dir_swift = PathBuf::from(&manifest_dir).parent().unwrap().join("swift-plugin").join("libs");
    
    // 检查是否在 macOS 上并且启用了 swift_audio 特性
    #[cfg(all(target_os = "macos", feature = "swift_audio"))]
    {
        // 检查 Swift 库是否存在（优先检查 swift-plugin/libs）
        let lib_path_swift = libs_dir_swift.join("libAudioCapture.a");
        let lib_path_tauri = libs_dir_tauri.join("libAudioCapture.a");
        
        let (lib_exists, libs_dir) = if lib_path_swift.exists() {
            (true, libs_dir_swift.clone())
        } else if lib_path_tauri.exists() {
            (true, libs_dir_tauri.clone())
        } else {
            (false, libs_dir_tauri.clone())
        };
        
        if !lib_exists {
            println!("cargo:warning=Swift 库不存在于 {} 或 {}", 
                     libs_dir_tauri.display(), libs_dir_swift.display());
            println!("cargo:warning=请先编译 Swift 库：cd swift-plugin && swift build -c release");
            return;
        }
        
        println!("cargo:warning=找到 Swift 库: {}", libs_dir.join("libAudioCapture.a").display());
        
        // 添加库搜索路径
        println!("cargo:rustc-link-search=native={}", libs_dir.display());
        
        // 链接静态库
        println!("cargo:rustc-link-lib=static=AudioCapture");
        
        // 链接 macOS 系统框架
        println!("cargo:rustc-link-lib=framework=ScreenCaptureKit");
        println!("cargo:rustc-link-lib=framework=Speech");
        println!("cargo:rustc-link-lib=framework=AVFoundation");
        println!("cargo:rustc-link-lib=framework=CoreMedia");
        println!("cargo:rustc-link-lib=framework=Foundation");
        
        // 获取 Xcode 路径来找到 Swift 运行时
        if let Ok(output) = std::process::Command::new("xcode-select").arg("-p").output() {
            if output.status.success() {
                let xcode_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                
                // Swift 运行时库路径
                let swift_lib_paths = vec![
                    format!("{}/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx", xcode_path),
                    format!("{}/usr/lib/swift/macosx", xcode_path),
                    "/usr/lib/swift".to_string(),
                ];
                
                for path in &swift_lib_paths {
                    let path_buf = PathBuf::from(path);
                    if path_buf.exists() {
                        println!("cargo:rustc-link-search=native={}", path);
                        // 添加 rpath 以便运行时能找到库
                        println!("cargo:rustc-link-arg=-Wl,-rpath,{}", path);
                    }
                }
                
                // 链接 Swift 运行时库
                println!("cargo:rustc-link-lib=dylib=swiftCore");
                println!("cargo:rustc-link-lib=dylib=swift_Concurrency");
                println!("cargo:rustc-link-lib=dylib=swiftFoundation");
            }
        }
    }
    
    // 监听源文件变化
    println!("cargo:rerun-if-changed=libs/libAudioCapture.a");
    println!("cargo:rerun-if-changed=../swift-plugin/libs/libAudioCapture.a");
    println!("cargo:rerun-if-changed=../swift-plugin/Sources/");
}
