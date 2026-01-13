// Settings.tsx
// 设置面板组件

import { useState } from 'react';
import type { LanguageOption, PermissionStatus } from '../hooks/useTranscription';

// 关闭图标
function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}

// 警告图标
function AlertIcon() {
    return (
        <svg className="permission-alert-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}

// 刷新图标
function RefreshIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
    );
}

// 勾选图标
function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" />
        </svg>
    );
}

// 叉号图标
function XIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    language: string;
    languages: LanguageOption[];
    onLanguageChange: (code: string) => void;
    hasAllPermissions: boolean;
    permissions: PermissionStatus | null;
    onRequestPermissions: () => void;
    onCheckPermissions: () => Promise<PermissionStatus>;
    isCheckingPermissions: boolean;
}

export function Settings({
    isOpen,
    onClose,
    language,
    languages,
    onLanguageChange,
    hasAllPermissions,
    permissions,
    onRequestPermissions,
    onCheckPermissions,
    isCheckingPermissions,
}: SettingsProps) {
    const [checkMessage, setCheckMessage] = useState<string | null>(null);

    const handleCheckPermissions = async () => {
        setCheckMessage(null);
        const result = await onCheckPermissions();
        if (result.audio_capture && result.speech_recognition) {
            setCheckMessage('✅ 所有权限已获取，请重新启动应用以应用更改');
        } else {
            const missing = [];
            if (!result.audio_capture) missing.push('屏幕录制');
            if (!result.speech_recognition) missing.push('语音识别');
            setCheckMessage(`❌ 仍缺少权限: ${missing.join(', ')}`);
        }
    };

    return (
        <>
            {/* 遮罩层 */}
            <div
                className={`overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            {/* 设置面板 */}
            <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
                <div className="settings-header">
                    <h2>设置</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>

                <div className="settings-content">
                    {/* 权限状态 */}
                    <div className="settings-group">
                        <div className="settings-group-title">权限状态</div>

                        {/* 权限列表 */}
                        <div className="permission-list">
                            <div className={`permission-item ${permissions?.audio_capture ? 'granted' : 'denied'}`}>
                                <span className="permission-icon">
                                    {permissions?.audio_capture ? <CheckIcon /> : <XIcon />}
                                </span>
                                <span className="permission-name">屏幕录制权限</span>
                                <span className="permission-status">
                                    {permissions?.audio_capture ? '已授权' : '未授权'}
                                </span>
                            </div>
                            <div className={`permission-item ${permissions?.speech_recognition ? 'granted' : 'denied'}`}>
                                <span className="permission-icon">
                                    {permissions?.speech_recognition ? <CheckIcon /> : <XIcon />}
                                </span>
                                <span className="permission-name">语音识别权限</span>
                                <span className="permission-status">
                                    {permissions?.speech_recognition ? '已授权' : '未授权'}
                                </span>
                            </div>
                        </div>

                        {/* 检测结果消息 */}
                        {checkMessage && (
                            <div className="permission-message">
                                {checkMessage}
                            </div>
                        )}

                        {/* 权限提示 */}
                        {!hasAllPermissions && (
                            <div className="permission-alert">
                                <AlertIcon />
                                <div className="permission-alert-content">
                                    <div className="permission-alert-title">需要权限</div>
                                    <p className="permission-alert-text">
                                        应用需要屏幕录制权限和语音识别权限才能正常工作。
                                        请在系统设置中授权后点击"重新检测"。
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="permission-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={handleCheckPermissions}
                                disabled={isCheckingPermissions}
                            >
                                {isCheckingPermissions ? (
                                    <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                                ) : (
                                    <RefreshIcon />
                                )}
                                重新检测
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={onRequestPermissions}
                            >
                                打开系统设置
                            </button>
                        </div>
                    </div>

                    {/* 语言设置 */}
                    <div className="settings-group">
                        <div className="settings-group-title">识别语言</div>
                        <div className="settings-item">
                            <label htmlFor="language">选择语言</label>
                            <select
                                id="language"
                                value={language}
                                onChange={(e) => onLanguageChange(e.target.value)}
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 关于 */}
                    <div className="settings-group">
                        <div className="settings-group-title">关于</div>
                        <div className="settings-item">
                            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                Mac Voice to Text v0.1.0
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                使用 macOS ScreenCaptureKit 捕获系统音频，
                                SFSpeechRecognizer 进行端侧语音识别。
                            </p>
                        </div>
                        <div className="settings-item" style={{ marginTop: 16 }}>
                            <a
                                href="https://github.com/Jim-purch/mac-voice-to-text"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', textDecoration: 'none' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                查看源代码
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Settings;
