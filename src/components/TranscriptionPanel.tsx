// TranscriptionPanel.tsx
// 转录面板组件 - 显示实时转录文本

import { useEffect, useRef, useState, useCallback } from 'react';

interface TranscriptionPanelProps {
    latestText: string;
    fullText: string;
    isCapturing: boolean;
}

// 复制图标
function CopyIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    );
}

// 复制成功图标
function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
        </svg>
    );
}

export function TranscriptionPanel({
    latestText,
    fullText,
    isCapturing,
}: TranscriptionPanelProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // 显示的文本：优先显示完整文本，否则显示最新文本
    // 实时转录时，将完整文本和最新部分结合显示
    const displayFullText = fullText || '';
    const displayLatestText = latestText || '';

    // 构建显示文本
    let displayText = displayFullText;
    // 如果正在录制且有最新的部分识别结果（未确认的文本），则追加显示
    if (isCapturing && displayLatestText && !displayFullText.endsWith(displayLatestText)) {
        if (displayText) {
            displayText = displayText + '\n' + displayLatestText;
        } else {
            displayText = displayLatestText;
        }
    }

    const isEmpty = !displayText;

    // 自动滚动到底部
    useEffect(() => {
        if (contentRef.current && (displayFullText || displayLatestText)) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [displayFullText, displayLatestText]);

    // 复制文本到剪贴板
    const handleCopy = useCallback(async () => {
        if (!displayText) return;

        try {
            await navigator.clipboard.writeText(displayText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, [displayText]);

    return (
        <div className="transcription-panel">
            <div className="transcription-header">
                <h2>实时转录</h2>
                <div className="transcription-header-actions">
                    {isCapturing && (
                        <div className="status-indicator">
                            <span className="status-dot recording" />
                            <span className="status-text">正在识别...</span>
                        </div>
                    )}
                    {!isEmpty && (
                        <button
                            className={`btn btn-ghost btn-icon copy-btn ${copied ? 'copied' : ''}`}
                            onClick={handleCopy}
                            title={copied ? '已复制!' : '复制文本'}
                        >
                            {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    )}
                </div>
            </div>

            <div className="transcription-content" ref={contentRef}>
                {isEmpty ? (
                    <div className="empty-state">
                        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        <h3 className="empty-state-title">准备开始转录</h3>
                        <p className="empty-state-text">
                            点击下方的录制按钮开始捕获系统音频
                        </p>
                    </div>
                ) : (
                    <div className="transcription-text-container">
                        <p className="transcription-text">
                            {displayText}
                            {isCapturing && <span className="transcription-cursor" />}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TranscriptionPanel;
