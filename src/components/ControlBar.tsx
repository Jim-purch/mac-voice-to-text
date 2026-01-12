// ControlBar.tsx
// 控制栏组件 - 录制按钮和时间显示

import { formatDuration } from '../hooks/useTranscription';

// 麦克风图标
function MicIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
    );
}

// 停止图标
function StopIcon() {
    return (
        <div className="record-icon" style={{ width: 20, height: 20, background: 'white', borderRadius: 4 }} />
    );
}

interface ControlBarProps {
    isCapturing: boolean;
    duration: number;
    isLoading: boolean;
    onStart: () => void;
    onStop: () => void;
}

export function ControlBar({
    isCapturing,
    duration,
    isLoading,
    onStart,
    onStop,
}: ControlBarProps) {
    const handleClick = () => {
        if (isLoading) return;
        if (isCapturing) {
            onStop();
        } else {
            onStart();
        }
    };

    return (
        <div className="control-bar">
            <div className="control-info">
                <span className="control-label">状态</span>
                <div className="status-indicator">
                    <span className={`status-dot ${isCapturing ? 'recording' : 'ready'}`} />
                    <span className="status-text">
                        {isCapturing ? '正在录制' : '准备就绪'}
                    </span>
                </div>
            </div>

            <button
                className={`record-button ${isCapturing ? 'recording' : ''}`}
                onClick={handleClick}
                disabled={isLoading}
                title={isCapturing ? '停止转录' : '开始转录'}
            >
                {isLoading ? (
                    <div className="loading-spinner" />
                ) : isCapturing ? (
                    <StopIcon />
                ) : (
                    <MicIcon />
                )}
            </button>

            <div className="control-info">
                <span className="control-label">时长</span>
                <span className="control-value">{formatDuration(duration)}</span>
            </div>
        </div>
    );
}

export default ControlBar;
