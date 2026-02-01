import { useState, useRef, useEffect } from 'react';
import { Edit2, X, Check, Send, FileText, Info } from 'lucide-react';

interface MessageEditorProps {
    originalContent: string;
    onSave: (newContent: string) => void;
    onCancel: () => void;
    isUserMessage?: boolean;
    placeholder?: string;
}

export function MessageEditor({ originalContent, onSave, onCancel, isUserMessage = false, placeholder = "输入修改后的内容..." }: MessageEditorProps) {
    const [content, setContent] = useState(originalContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(content.length, content.length);
        }
    }, []);

    const handleSubmit = () => {
        if (content.trim()) {
            onSave(content);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2">
                    {isUserMessage ? (
                        <Edit2 size={14} className="text-amber-600 dark:text-amber-400" />
                    ) : (
                        <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="text-sm font-medium text-stone-700 dark:text-zinc-200">
                        {isUserMessage ? '编辑消息' : '添加注释/上下文'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleSubmit}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="保存 (Ctrl+Enter)"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        onClick={onCancel}
                        className="p-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded transition-colors"
                        title="取消 (Esc)"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Edit Area */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full min-h-[100px] max-h-[400px] px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                    <Info size={12} />
                    <span>Ctrl+Enter 保存 • Esc 取消</span>
                </div>
                <button
                    onClick={handleSubmit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                >
                    <Send size={12} />
                    保存
                </button>
            </div>

            {/* Edit Info Badge */}
            {!isUserMessage && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                    上下文
                </div>
            )}
        </div>
    );
}

interface ContextInserterProps {
    onInsert: (content: string) => void;
    onCancel: () => void;
}

export function ContextInserter({ onInsert, onCancel }: ContextInserterProps) {
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleSubmit = () => {
        if (content.trim()) {
            onInsert(content);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const presets = [
        { label: '补充信息', text: '补充说明：' },
        { label: '修正错误', text: '修正：之前的回答有误，正确的是：' },
        { label: '添加要求', text: '额外要求：' },
        { label: '提供上下文', text: '上下文：' },
    ];

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-stone-700 dark:text-zinc-200">
                        插入上下文信息
                    </span>
                </div>
                <button
                    onClick={onCancel}
                    className="p-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Presets */}
            <div className="mb-3">
                <span className="text-xs text-stone-500 dark:text-zinc-400 mb-1.5 block">快速插入：</span>
                <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setContent(content + preset.text)}
                            className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Text Area */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入要添加的上下文信息、修正或补充说明..."
                className="w-full min-h-[120px] max-h-[300px] px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                    插入的信息将作为额外上下文提供给 AI
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 disabled:text-stone-500 rounded-lg transition-colors"
                >
                    <Send size={12} />
                    插入上下文
                </button>
            </div>
        </div>
    );
}
