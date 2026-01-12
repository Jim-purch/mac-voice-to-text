// build.rs
// Tauri 构建脚本
// 负责链接 Swift 原生库和运行时

use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    // 运行 Tauri 构建
    tauri_build::build();
    
    // 获取项目根目录
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let libs_dir = PathBuf::from(&manifest_dir).join("libs");
    
    // 检查是否在 macOS 上并且启用了 swift_audio 特性
    #[cfg(all(target_os = "macos", feature = "swift_audio"))]
    {
        // 检查 Swift 库是否存在
        let lib_path = libs_dir.join("libAudioCapture.a");
        
        if !lib_path.exists() {
            println!("cargo:warning=Swift 库不存在，尝试编译...");
            
            // 尝试编译 Swift 库
            let build_script = PathBuf::from(&manifest_dir).join("build-swift.sh");
            if build_script.exists() {
                let status = Command::new("bash")
                    .arg(&build_script)
                    .status();
                
                match status {
                    Ok(s) if s.success() => {
                        println!("cargo:warning=Swift 库编译成功");
                    }
                    _ => {
                        println!("cargo:warning=Swift 库编译失败");
                        return;
                    }
                }
            } else {
                println!("cargo:warning=未找到 build-swift.sh 脚本");
                return;
            }
        }
        
        // 如果库存在，链接它
        if lib_path.exists() {
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
            if let Ok(output) = Command::new("xcode-select").arg("-p").output() {
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
    }
    
    // 监听源文件变化
    println!("cargo:rerun-if-changed=build-swift.sh");
    println!("cargo:rerun-if-changed=libs/libAudioCapture.a");
    println!("cargo:rerun-if-changed=../swift-plugin/Sources/");
}
