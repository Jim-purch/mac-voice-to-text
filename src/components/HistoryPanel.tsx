// HistoryPanel.tsx
// 历史记录侧边栏组件

import { formatDuration } from '../hooks/useTranscription';
import type { TranscriptRecord } from '../hooks/useTranscription';

// 删除图标
function TrashIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
    );
}

// 导出图标
function ExportIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
    );
}

interface HistoryPanelProps {
    records: TranscriptRecord[];
    isLoading: boolean;
    selectedId: number | null;
    onSelect: (record: TranscriptRecord) => void;
    onDelete: (id: number) => void;
    onExport: (id: number) => void;
}

export function HistoryPanel({
    records,
    isLoading,
    selectedId,
    onSelect,
    onDelete,
    onExport,
}: HistoryPanelProps) {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>历史记录</h2>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {records.length} 条
                </span>
            </div>

            <div className="sidebar-content">
                {isLoading ? (
                    <div className="empty-state">
                        <div className="loading-spinner" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-state-text">暂无记录</p>
                    </div>
                ) : (
                    records.map(record => (
                        <div
                            key={record.id}
                            className={`history-item ${selectedId === record.id ? 'active' : ''}`}
                            onClick={() => onSelect(record)}
                        >
                            <div className="history-item-header">
                                <span className="history-item-date">{record.created_at}</span>
                                <span className="history-item-duration">
                                    {formatDuration(record.duration_seconds)}
                                </span>
                            </div>
                            <p className="history-item-preview">
                                {record.content || '(空内容)'}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onExport(record.id);
                                    }}
                                    title="导出"
                                >
                                    <ExportIcon />
                                </button>
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('确定要删除这条记录吗？')) {
                                            onDelete(record.id);
                                        }
                                    }}
                                    title="删除"
                                    style={{ color: 'var(--color-error)' }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default HistoryPanel;
