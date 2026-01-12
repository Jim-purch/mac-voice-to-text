// App.tsx
// Mac Voice to Text 主应用组件

import { useState, useCallback } from 'react';
import './index.css';

import { ControlBar } from './components/ControlBar';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Settings } from './components/Settings';
import {
  useTranscription,
  usePermissions,
  useLanguage,
  useTranscriptHistory,
} from './hooks/useTranscription';
import type { TranscriptRecord } from './hooks/useTranscription';

// 设置图标
function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function App() {
  // 设置面板状态
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 选中的历史记录
  const [selectedRecord, setSelectedRecord] = useState<TranscriptRecord | null>(null);

  // 使用 Hooks
  const transcription = useTranscription();
  const permissions = usePermissions();
  const language = useLanguage();
  const history = useTranscriptHistory();

  // 处理开始转录
  const handleStart = useCallback(async () => {
    // 清除选中的历史记录，显示实时转录
    setSelectedRecord(null);
    await transcription.startTranscription();
  }, [transcription]);

  // 处理停止转录
  const handleStop = useCallback(async () => {
    const result = await transcription.stopTranscription();

    // 如果有内容，自动保存
    if (result && result.full_text) {
      try {
        await history.saveRecord(result.full_text, result.duration_seconds);
      } catch (e) {
        console.error('自动保存失败:', e);
      }
    }
  }, [transcription, history]);

  // 处理选择历史记录
  const handleSelectRecord = useCallback((record: TranscriptRecord) => {
    setSelectedRecord(record);
  }, []);

  // 处理删除历史记录
  const handleDeleteRecord = useCallback(async (id: number) => {
    try {
      await history.deleteRecord(id);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (e) {
      console.error('删除失败:', e);
    }
  }, [history, selectedRecord]);

  // 处理导出历史记录
  const handleExportRecord = useCallback(async (id: number) => {
    try {
      const path = await history.exportRecord(id, 'txt');
      console.log('已导出到:', path);
      alert(`已导出到: ${path}`);
    } catch (e) {
      console.error('导出失败:', e);
    }
  }, [history]);

  // 显示的文本：选中历史记录时显示历史内容，否则显示实时转录
  const displayText = selectedRecord
    ? selectedRecord.content
    : (transcription.fullText || transcription.latestText);

  return (
    <div className="app">
      {/* 头部 */}
      <header className="header">
        <h1>🎙️ Mac Voice to Text</h1>
        <div className="header-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="main-content">
        {/* 历史记录侧边栏 */}
        <HistoryPanel
          records={history.records}
          isLoading={history.isLoading}
          selectedId={selectedRecord?.id ?? null}
          onSelect={handleSelectRecord}
          onDelete={handleDeleteRecord}
          onExport={handleExportRecord}
        />

        {/* 转录面板 */}
        <TranscriptionPanel
          latestText={transcription.latestText}
          fullText={displayText}
          isCapturing={transcription.isCapturing && !selectedRecord}
        />
      </div>

      {/* 控制栏 */}
      <ControlBar
        isCapturing={transcription.isCapturing}
        duration={transcription.duration}
        isLoading={transcription.isLoading}
        onStart={handleStart}
        onStop={handleStop}
      />

      {/* 设置面板 */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        language={language.language}
        languages={language.languages}
        onLanguageChange={language.setLanguage}
        hasAllPermissions={permissions.hasAllPermissions || false}
        onRequestPermissions={permissions.requestPermissions}
      />
    </div>
  );
}

export default App;
