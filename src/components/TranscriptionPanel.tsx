// TranscriptionPanel.tsx
// 转录面板组件 - 显示实时转录文本

interface TranscriptionPanelProps {
    latestText: string;
    fullText: string;
    isCapturing: boolean;
}

export function TranscriptionPanel({
    latestText,
    fullText,
    isCapturing,
}: TranscriptionPanelProps) {
    // 显示的文本：如果正在录制，显示完整文本+最新部分文本
    // 如果已停止，显示最终文本
    const displayText = fullText || latestText;
    const isEmpty = !displayText;

    return (
        <div className="transcription-panel">
            <div className="transcription-header">
                <h2>实时转录</h2>
                {isCapturing && (
                    <div className="status-indicator">
                        <span className="status-dot recording" />
                        <span className="status-text">正在识别...</span>
                    </div>
                )}
            </div>

            <div className="transcription-content">
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
                    <p className="transcription-text">
                        {displayText}
                        {isCapturing && <span className="transcription-cursor" />}
                    </p>
                )}
            </div>
        </div>
    );
}

export default TranscriptionPanel;
