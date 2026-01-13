// App.tsx
// Mac Voice to Text 主应用组件

import { useState, useCallback, useEffect, useRef } from 'react';
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

// 录制图标
function RecordTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

// 历史图标
function HistoryTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

// 模拟转录文本（用于测试）
const DEMO_TEXTS = [
  "这是一段测试语音转文字的内容。",
  "Mac Voice to Text 应用正在运行。",
  "您可以使用这个应用来捕获系统音频并转换为文字。",
  "转录结果会实时显示在屏幕上。",
  "所有内容都会自动保存到历史记录中。",
];

// 标签页类型
type TabType = 'record' | 'history';

function App() {
  // 当前标签页
  const [activeTab, setActiveTab] = useState<TabType>('record');

  // 设置面板状态
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 选中的历史记录（仅在历史标签页使用）
  const [selectedRecord, setSelectedRecord] = useState<TranscriptRecord | null>(null);

  // 模拟模式定时器
  const simulateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoIndexRef = useRef(0);

  // 使用 Hooks
  const transcription = useTranscription();
  const permissions = usePermissions();
  const language = useLanguage();
  const history = useTranscriptHistory();

  // 处理开始转录
  const handleStart = useCallback(async () => {
    // 自动切换到录制标签页
    setActiveTab('record');
    await transcription.startTranscription();

    // 如果没有权限（模拟模式），启动模拟转录
    if (!permissions.hasAllPermissions) {
      demoIndexRef.current = 0;
      simulateRef.current = setInterval(() => {
        const text = DEMO_TEXTS[demoIndexRef.current % DEMO_TEXTS.length];
        transcription.simulateTranscription(text);
        demoIndexRef.current++;
      }, 2000);
    }
  }, [transcription, permissions.hasAllPermissions]);

  // 处理停止转录
  const handleStop = useCallback(async () => {
    // 停止模拟
    if (simulateRef.current) {
      clearInterval(simulateRef.current);
      simulateRef.current = null;
    }

    const result = await transcription.stopTranscription();

    // 获取需要保存的文本：优先使用返回结果，其次使用 getCurrentText
    const textToSave = result?.full_text || transcription.getCurrentText();
    const duration = result?.duration_seconds ?? transcription.duration;

    console.log('停止转录，文本内容:', textToSave?.substring(0, 100), '长度:', textToSave?.length);

    // 如果有内容，自动保存
    if (textToSave && textToSave.trim()) {
      try {
        await history.saveRecord(textToSave, duration);
        console.log('转录已保存，时长:', duration);
        // 刷新历史记录
        await history.loadHistory();
      } catch (e) {
        console.error('自动保存失败:', e);
      }
    } else {
      console.log('没有转录内容需要保存');
    }
  }, [transcription, history]);

  // 清理模拟定时器
  useEffect(() => {
    return () => {
      if (simulateRef.current) {
        clearInterval(simulateRef.current);
      }
    };
  }, []);

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

  // 切换标签页
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // 切换到历史标签页时，刷新历史记录
    if (tab === 'history') {
      history.loadHistory();
    }
  }, [history]);

  return (
    <div className="app">
      {/* 头部 */}
      <header className="header">
        <h1>🎙️ Mac Voice to Text</h1>
        <div className="header-actions">
          {!permissions.hasAllPermissions && (
            <span className="demo-badge" title="当前为模拟模式，点击设置授予权限">
              模拟模式
            </span>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* 标签页切换 */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'record' ? 'active' : ''}`}
            onClick={() => handleTabChange('record')}
          >
            <RecordTabIcon />
            <span>录制</span>
            {transcription.isCapturing && <span className="tab-badge recording" />}
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            <HistoryTabIcon />
            <span>历史记录</span>
            {history.records.length > 0 && (
              <span className="tab-count">{history.records.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="main-content">
        {activeTab === 'record' ? (
          /* 录制标签页 - 显示实时转录 */
          <TranscriptionPanel
            latestText={transcription.latestText}
            fullText={transcription.fullText}
            isCapturing={transcription.isCapturing}
          />
        ) : (
          /* 历史标签页 - 显示历史记录列表和详情 */
          <div className="history-tab-content">
            <HistoryPanel
              records={history.records}
              isLoading={history.isLoading}
              selectedId={selectedRecord?.id ?? null}
              onSelect={handleSelectRecord}
              onDelete={handleDeleteRecord}
              onExport={handleExportRecord}
            />
            {selectedRecord ? (
              <div className="history-detail">
                <div className="history-detail-header">
                  <h3>转录详情</h3>
                  <span className="history-detail-date">{selectedRecord.created_at}</span>
                </div>
                <div className="history-detail-content">
                  <p>{selectedRecord.content}</p>
                </div>
              </div>
            ) : (
              <div className="history-detail-empty">
                <p>选择左侧的历史记录查看详情</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 控制栏 - 始终显示 */}
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
        permissions={permissions.permissions}
        onRequestPermissions={permissions.requestPermissions}
        onCheckPermissions={permissions.checkPermissions}
        isCheckingPermissions={permissions.isLoading}
      />
    </div>
  );
}

export default App;
