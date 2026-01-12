// useTranscription.ts
// 转录功能自定义 Hook
// 封装与 Tauri 后端的所有通信

import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 类型定义
export interface PermissionStatus {
  audio_capture: boolean;
  speech_recognition: boolean;
}

export interface TranscriptionStatus {
  is_capturing: boolean;
  latest_text: string;
  full_text: string;
  duration_seconds: number;
}

export interface TranscriptRecord {
  id: number;
  content: string;
  language: string;
  created_at: string;
  duration_seconds: number;
}

export interface LanguageOption {
  code: string;
  name: string;
}

// 格式化持续时间
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 转录 Hook
export function useTranscription() {
  // 状态
  const [isCapturing, setIsCapturing] = useState(false);
  const [latestText, setLatestText] = useState('');
  const [fullText, setFullText] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 计时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 开始转录
  const startTranscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await invoke('start_transcription');
      
      setIsCapturing(true);
      setFullText('');
      setLatestText('');
      setDuration(0);
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      // 开始轮询状态（每 500ms）
      pollRef.current = setInterval(async () => {
        try {
          const status = await invoke<TranscriptionStatus>('get_transcription_status');
          setLatestText(status.latest_text);
          setFullText(status.full_text);
        } catch (e) {
          console.error('轮询状态失败:', e);
        }
      }, 500);
      
    } catch (e) {
      setError(e as string);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 停止转录
  const stopTranscription = useCallback(async (): Promise<TranscriptionStatus | null> => {
    try {
      setIsLoading(true);
      
      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // 清除轮询
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      
      const result = await invoke<TranscriptionStatus>('stop_transcription');
      
      setIsCapturing(false);
      setFullText(result.full_text);
      setLatestText(result.latest_text);
      
      return result;
      
    } catch (e) {
      setError(e as string);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 模拟转录（用于演示）
  const simulateTranscription = useCallback(async (text: string) => {
    try {
      await invoke('simulate_transcription', { text });
    } catch (e) {
      console.error('模拟转录失败:', e);
    }
  }, []);
  
  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);
  
  return {
    isCapturing,
    latestText,
    fullText,
    duration,
    error,
    isLoading,
    startTranscription,
    stopTranscription,
    simulateTranscription,
    formattedDuration: formatDuration(duration),
  };
}

// 权限 Hook
export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const checkPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await invoke<PermissionStatus>('check_permissions');
      setPermissions(status);
      return status;
    } catch (e) {
      console.error('检查权限失败:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const requestPermissions = useCallback(async () => {
    try {
      await invoke('request_permissions');
    } catch (e) {
      console.error('请求权限失败:', e);
    }
  }, []);
  
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);
  
  return {
    permissions,
    isLoading,
    checkPermissions,
    requestPermissions,
    hasAllPermissions: permissions?.audio_capture && permissions?.speech_recognition,
  };
}

// 语言设置 Hook
export function useLanguage() {
  const [language, setLanguageState] = useState('zh-CN');
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 加载支持的语言列表
  const loadLanguages = useCallback(async () => {
    try {
      const result = await invoke<[string, string][]>('get_supported_languages');
      setLanguages(result.map(([code, name]) => ({ code, name })));
    } catch (e) {
      console.error('加载语言列表失败:', e);
    }
  }, []);
  
  // 获取当前语言
  const loadCurrentLanguage = useCallback(async () => {
    try {
      const lang = await invoke<string>('get_language');
      setLanguageState(lang);
    } catch (e) {
      console.error('获取当前语言失败:', e);
    }
  }, []);
  
  // 设置语言
  const setLanguage = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      await invoke('set_language', { language: code });
      setLanguageState(code);
    } catch (e) {
      console.error('设置语言失败:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadLanguages();
    loadCurrentLanguage();
  }, [loadLanguages, loadCurrentLanguage]);
  
  return {
    language,
    languages,
    isLoading,
    setLanguage,
  };
}

// 历史记录 Hook
export function useTranscriptHistory() {
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<TranscriptRecord[]>('get_transcript_history');
      // 按时间倒序排列
      setRecords(result.sort((a, b) => b.id - a.id));
    } catch (e) {
      setError(e as string);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 保存记录
  const saveRecord = useCallback(async (content: string, durationSeconds: number) => {
    try {
      const record = await invoke<TranscriptRecord>('save_transcript', {
        content,
        durationSeconds,
      });
      setRecords(prev => [record, ...prev]);
      return record;
    } catch (e) {
      console.error('保存记录失败:', e);
      throw e;
    }
  }, []);
  
  // 删除记录
  const deleteRecord = useCallback(async (id: number) => {
    try {
      await invoke('delete_transcript', { id });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('删除记录失败:', e);
      throw e;
    }
  }, []);
  
  // 导出记录
  const exportRecord = useCallback(async (id: number, format: string = 'txt') => {
    try {
      const path = await invoke<string>('export_transcript', { id, format });
      return path;
    } catch (e) {
      console.error('导出记录失败:', e);
      throw e;
    }
  }, []);
  
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  
  return {
    records,
    isLoading,
    error,
    loadHistory,
    saveRecord,
    deleteRecord,
    exportRecord,
  };
}
