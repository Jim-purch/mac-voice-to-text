// storage.rs
// 转录数据存储模块
// 使用 SQLite 持久化存储转录记录

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 转录记录结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptRecord {
    pub id: i64,
    pub content: String,
    pub language: String,
    pub created_at: String,
    pub duration_seconds: i32,
}

/// 存储管理器
pub struct StorageManager {
    data_dir: PathBuf,
}

impl StorageManager {
    /// 创建新的存储管理器
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        
        // 确保目录存在
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("无法创建数据目录: {}", e))?;
        
        Ok(Self { data_dir })
    }
    
    /// 获取转录文件路径
    fn transcripts_file(&self) -> PathBuf {
        self.data_dir.join("transcripts.json")
    }
    
    /// 加载所有转录记录
    pub fn load_transcripts(&self) -> Result<Vec<TranscriptRecord>, String> {
        let file_path = self.transcripts_file();
        
        if !file_path.exists() {
            return Ok(Vec::new());
        }
        
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("读取转录文件失败: {}", e))?;
        
        serde_json::from_str(&content)
            .map_err(|e| format!("解析转录数据失败: {}", e))
    }
    
    /// 保存转录记录
    pub fn save_transcript(&self, content: &str, language: &str, duration_seconds: i32) -> Result<TranscriptRecord, String> {
        let mut transcripts = self.load_transcripts()?;
        
        // 生成新 ID
        let new_id = transcripts.iter().map(|t| t.id).max().unwrap_or(0) + 1;
        
        // 获取当前时间
        let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        
        let record = TranscriptRecord {
            id: new_id,
            content: content.to_string(),
            language: language.to_string(),
            created_at,
            duration_seconds,
        };
        
        transcripts.push(record.clone());
        
        // 写入文件
        let json = serde_json::to_string_pretty(&transcripts)
            .map_err(|e| format!("序列化数据失败: {}", e))?;
        
        fs::write(self.transcripts_file(), json)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        
        log::info!("已保存转录记录，ID: {}", new_id);
        Ok(record)
    }
    
    /// 删除转录记录
    pub fn delete_transcript(&self, id: i64) -> Result<(), String> {
        let mut transcripts = self.load_transcripts()?;
        transcripts.retain(|t| t.id != id);
        
        let json = serde_json::to_string_pretty(&transcripts)
            .map_err(|e| format!("序列化数据失败: {}", e))?;
        
        fs::write(self.transcripts_file(), json)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        
        log::info!("已删除转录记录，ID: {}", id);
        Ok(())
    }
    
    /// 导出转录到文件
    pub fn export_transcript(&self, id: i64, format: &str) -> Result<String, String> {
        let transcripts = self.load_transcripts()?;
        let record = transcripts.iter()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("未找到 ID 为 {} 的记录", id))?;
        
        let export_dir = self.data_dir.join("exports");
        fs::create_dir_all(&export_dir)
            .map_err(|e| format!("无法创建导出目录: {}", e))?;
        
        let filename = format!("transcript_{}_{}.{}", id, record.created_at.replace([':', ' '], "_"), format);
        let file_path = export_dir.join(&filename);
        
        let content = match format {
            "md" => format!(
                "# 转录记录\n\n- **时间**: {}\n- **语言**: {}\n- **时长**: {} 秒\n\n---\n\n{}",
                record.created_at, record.language, record.duration_seconds, record.content
            ),
            "json" => serde_json::to_string_pretty(record)
                .map_err(|e| format!("JSON 序列化失败: {}", e))?,
            _ => record.content.clone(), // txt 格式
        };
        
        fs::write(&file_path, &content)
            .map_err(|e| format!("写入导出文件失败: {}", e))?;
        
        log::info!("已导出转录记录到: {:?}", file_path);
        Ok(file_path.to_string_lossy().to_string())
    }
}
