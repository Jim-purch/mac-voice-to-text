// useTranscription.ts
// 转录功能自定义 Hook
// 封装与 Tauri 后端的所有通信

import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 检测是否在 Tauri 环境中运行
const isTauri = (): boolean => {
  try {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  } catch {
    return false;
  }
};

// 安全调用 invoke，在非 Tauri 环境返回默认值
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>, defaultValue?: T): Promise<T> {
  if (!isTauri()) {
    console.warn(`[Mock] Tauri command not available: ${cmd}`);
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error('Not in Tauri environment');
  }
  return invoke<T>(cmd, args);
}

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
  // 用于存储的累积文本（包含所有已确认的转录）
  const [accumulatedText, setAccumulatedText] = useState('');

  // 计时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 保存上一次的 fullText，用于检测变化
  const prevFullTextRef = useRef('');

  // 开始转录
  const startTranscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await safeInvoke('start_transcription');

      setIsCapturing(true);
      setFullText('');
      setLatestText('');
      setAccumulatedText('');
      setDuration(0);
      prevFullTextRef.current = '';

      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // 开始轮询状态（每 300ms，更频繁以获取实时更新）
      pollRef.current = setInterval(async () => {
        try {
          const status = await safeInvoke<TranscriptionStatus>('get_transcription_status', undefined, {
            is_capturing: true,
            latest_text: '',
            full_text: '',
            duration_seconds: 0,
          });

          // 更新最新转录文本
          setLatestText(status.latest_text);

          // 如果 full_text 有变化，说明有新的确认文本
          if (status.full_text !== prevFullTextRef.current) {
            setFullText(status.full_text);
            setAccumulatedText(status.full_text);
            prevFullTextRef.current = status.full_text;
          }
        } catch (e) {
          console.error('轮询状态失败:', e);
        }
      }, 300);

    } catch (e) {
      setError(String(e));
      console.error('开始转录失败:', e);
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

      const result = await safeInvoke<TranscriptionStatus>('stop_transcription', undefined, {
        is_capturing: false,
        latest_text: latestText,
        full_text: fullText || accumulatedText,
        duration_seconds: duration,
      });

      setIsCapturing(false);

      // 合并最终文本：如果后端返回空，使用前端累积的文本
      const finalFullText = result.full_text || accumulatedText || fullText;
      const finalLatestText = result.latest_text || latestText;

      // 如果有未确认的最新文本，追加到完整文本
      let combinedText = finalFullText;
      if (finalLatestText && !finalFullText.endsWith(finalLatestText)) {
        combinedText = finalFullText ? `${finalFullText}\n${finalLatestText}` : finalLatestText;
      }

      setFullText(combinedText);
      setLatestText('');
      setAccumulatedText(combinedText);

      return {
        ...result,
        full_text: combinedText,
        duration_seconds: duration,
      };

    } catch (e) {
      setError(String(e));
      console.error('停止转录失败:', e);

      // 即使出错，也返回前端累积的文本
      return {
        is_capturing: false,
        latest_text: '',
        full_text: accumulatedText || fullText,
        duration_seconds: duration,
      };
    } finally {
      setIsLoading(false);
    }
  }, [latestText, fullText, duration, accumulatedText]);

  // 获取当前累积的完整文本（用于外部获取）
  const getCurrentText = useCallback(() => {
    let text = accumulatedText || fullText;
    if (latestText && !text.endsWith(latestText)) {
      text = text ? `${text}\n${latestText}` : latestText;
    }
    return text;
  }, [accumulatedText, fullText, latestText]);

  // 模拟转录（用于演示）
  const simulateTranscription = useCallback(async (text: string) => {
    try {
      await safeInvoke('simulate_transcription', { text });
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
    accumulatedText,
    duration,
    error,
    isLoading,
    startTranscription,
    stopTranscription,
    simulateTranscription,
    getCurrentText,
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
      const status = await safeInvoke<PermissionStatus>('check_permissions', undefined, {
        audio_capture: false,
        speech_recognition: false,
      });
      setPermissions(status);
      return status;
    } catch (e) {
      console.error('检查权限失败:', e);
      // 返回默认权限状态
      const defaultStatus = { audio_capture: false, speech_recognition: false };
      setPermissions(defaultStatus);
      return defaultStatus;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      await safeInvoke('request_permissions');
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

// 默认语言列表（非 Tauri 环境使用）
const defaultLanguages: [string, string][] = [
  ['zh-CN', '简体中文'],
  ['zh-TW', '繁體中文'],
  ['en-US', 'English (US)'],
  ['en-GB', 'English (UK)'],
  ['ja-JP', '日本語'],
  ['ko-KR', '한국어'],
];

// 语言设置 Hook
export function useLanguage() {
  const [language, setLanguageState] = useState('zh-CN');
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载支持的语言列表
  const loadLanguages = useCallback(async () => {
    try {
      const result = await safeInvoke<[string, string][]>('get_supported_languages', undefined, defaultLanguages);
      setLanguages(result.map(([code, name]) => ({ code, name })));
    } catch (e) {
      console.error('加载语言列表失败:', e);
      // 使用默认列表
      setLanguages(defaultLanguages.map(([code, name]) => ({ code, name })));
    }
  }, []);

  // 获取当前语言
  const loadCurrentLanguage = useCallback(async () => {
    try {
      const lang = await safeInvoke<string>('get_language', undefined, 'zh-CN');
      setLanguageState(lang);
    } catch (e) {
      console.error('获取当前语言失败:', e);
    }
  }, []);

  // 设置语言
  const setLanguage = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      await safeInvoke('set_language', { language: code });
      setLanguageState(code);
    } catch (e) {
      console.error('设置语言失败:', e);
      // 即使失败也更新本地状态
      setLanguageState(code);
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
      const result = await safeInvoke<TranscriptRecord[]>('get_transcript_history', undefined, []);
      // 按时间倒序排列
      setRecords(result.sort((a, b) => b.id - a.id));
    } catch (e) {
      setError(String(e));
      console.error('加载历史记录失败:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存记录
  const saveRecord = useCallback(async (content: string, durationSeconds: number) => {
    try {
      const record = await safeInvoke<TranscriptRecord>('save_transcript', {
        content,
        durationSeconds,
      });
      if (record) {
        setRecords(prev => [record, ...prev]);
      }
      return record;
    } catch (e) {
      console.error('保存记录失败:', e);
      throw e;
    }
  }, []);

  // 删除记录
  const deleteRecord = useCallback(async (id: number) => {
    try {
      await safeInvoke('delete_transcript', { id });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('删除记录失败:', e);
      throw e;
    }
  }, []);

  // 导出记录
  const exportRecord = useCallback(async (id: number, format: string = 'txt') => {
    try {
      const path = await safeInvoke<string>('export_transcript', { id, format });
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
