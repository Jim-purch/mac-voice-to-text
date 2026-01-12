// Settings.tsx
// 设置面板组件

import type { LanguageOption } from '../hooks/useTranscription';

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

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    language: string;
    languages: LanguageOption[];
    onLanguageChange: (code: string) => void;
    hasAllPermissions: boolean;
    onRequestPermissions: () => void;
}

export function Settings({
    isOpen,
    onClose,
    language,
    languages,
    onLanguageChange,
    hasAllPermissions,
    onRequestPermissions,
}: SettingsProps) {
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
                    {/* 权限提示 */}
                    {!hasAllPermissions && (
                        <div className="permission-alert">
                            <AlertIcon />
                            <div className="permission-alert-content">
                                <div className="permission-alert-title">需要权限</div>
                                <p className="permission-alert-text">
                                    应用需要屏幕录制权限和语音识别权限才能正常工作。
                                </p>
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: 12 }}
                                    onClick={onRequestPermissions}
                                >
                                    打开系统设置
                                </button>
                            </div>
                        </div>
                    )}

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
