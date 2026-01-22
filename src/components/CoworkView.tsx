import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Zap, AlertTriangle, Check, X, Settings, History, Plus, Trash2, ChevronDown, ChevronUp, MessageCircle, Download } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { useI18n } from '../i18n/I18nContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import Anthropic from '@anthropic-ai/sdk';

type Mode = 'chat' | 'work';

interface PermissionRequest {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
}

interface SessionSummary {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

interface CoworkViewProps {
    history: Anthropic.MessageParam[];
    onSendMessage: (message: string | { content: string, images: string[] }) => void;
    onAbort: () => void;
    isProcessing: boolean;
    onOpenSettings: () => void;
}

// Memoize the entire view to prevent re-renders when parent state (like settings) changes
export const CoworkView = memo(function CoworkView({ history, onSendMessage, onAbort, isProcessing, onOpenSettings }: CoworkViewProps) {
    const { t } = useI18n();
    const [mode, setMode] = useState<Mode>('work');
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const [streamingText, setStreamingText] = useState('');
    const [workingDir, setWorkingDir] = useState<string | null>(null);
    const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [config, setConfig] = useState<any>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // Load config including model name
    // Provider Constants


    useEffect(() => {
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            setConfig(cfg as any); // Use full config
        });
        // ... existing listeners
        const removeStreamListener = window.ipcRenderer.on('agent:stream-token', (_event, ...args) => {
            const token = args[0] as string;
            setStreamingText(prev => prev + token);
        });

        // Clear streaming when history updates and save session
        const removeHistoryListener = window.ipcRenderer.on('agent:history-update', async (_event, ...args) => {
            const newHistory = args[0] as Anthropic.MessageParam[];
            setStreamingText('');
            // Auto-save session only if there's meaningful content
            if (newHistory && newHistory.length > 0) {
                const hasRealContent = newHistory.some(msg => {
                    const content = msg.content;
                    if (typeof content === 'string') {
                        return content.trim().length > 0;
                    } else if (Array.isArray(content)) {
                        return content.some(block =>
                            block.type === 'text' ? (block.text || '').trim().length > 0 : true
                        );
                    }
                    return false;
                });

                if (hasRealContent) {
                    try {
                        const result = await window.ipcRenderer.invoke('session:save', newHistory) as { success: boolean; sessionId?: string; error?: string };
                        if (!result.success) {
                            console.error('[CoworkView] Failed to save session:', result.error);
                        }
                    } catch (error) {
                        console.error('[CoworkView] Error saving session:', error);
                    }
                }
            }
        });

        // Listen for permission requests
        const removeConfirmListener = window.ipcRenderer.on('agent:confirm-request', (_event, ...args) => {
            const req = args[0] as PermissionRequest;
            setPermissionRequest(req);
        });

        // Listen for abort events
        const removeAbortListener = window.ipcRenderer.on('agent:aborted', () => {
            setStreamingText('');
            setPermissionRequest(null);
        });

        return () => {
            // Save session on unmount to prevent data loss
            if (history && history.length > 0) {
                const hasRealContent = history.some(msg => {
                    const content = msg.content;
                    if (typeof content === 'string') {
                        return content.trim().length > 0;
                    } else if (Array.isArray(content)) {
                        return content.some(block =>
                            block.type === 'text' ? (block.text || '').trim().length > 0 : true
                        );
                    }
                    return false;
                });

                if (hasRealContent) {
                    window.ipcRenderer.invoke('session:save', history).catch(err => {
                        console.error('[CoworkView] Error saving session on unmount:', err);
                    });
                }
            }

            removeStreamListener?.();
            removeHistoryListener?.();
            removeConfirmListener?.();
            removeAbortListener?.();
        };
    }, []);

    // Fetch session list when history panel is opened
    useEffect(() => {
        if (showHistory) {
            window.ipcRenderer.invoke('session:list').then((list) => {
                setSessions(list as SessionSummary[]);
            });
        }
    }, [showHistory]);

    useEffect(() => {
        scrollToBottom();
    }, [history, streamingText]);



    const handleSelectFolder = async () => {
        const folder = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        if (folder) {
            setWorkingDir(folder);
            // Set as primary working directory (also authorizes it)
            await window.ipcRenderer.invoke('agent:set-working-dir', folder);
        }
    };

    const handlePermissionResponse = (approved: boolean) => {
        if (permissionRequest) {
            window.ipcRenderer.invoke('agent:confirm-response', {
                id: permissionRequest.id,
                approved
            });
            setPermissionRequest(null);
        }
    };



    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Focus input on Ctrl/Cmd+L
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                // inputRef.current?.focus(); // Logic moved to ChatInput
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);



    const toggleBlock = useCallback((id: string) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const relevantHistory = history.filter(m => (m.role as string) !== 'system');

    return (
        <div className="flex flex-col h-full bg-[#FAF8F5] dark:bg-zinc-950 relative">
            {/* Permission Dialog Overlay */}
            {permissionRequest && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-stone-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle size={24} className="text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-stone-800 dark:text-zinc-100 text-lg">{t('actionConfirmation')}</h3>
                                <p className="text-sm text-stone-500 dark:text-zinc-400">{permissionRequest.tool}</p>
                            </div>
                        </div>

                        <p className="text-stone-600 dark:text-zinc-300 mb-4">{permissionRequest.description}</p>

                        {/* Show details if write_file */}
                        {typeof permissionRequest.args?.path === 'string' && (
                            <div className="bg-stone-50 dark:bg-zinc-800 rounded-lg p-3 mb-4 font-mono text-xs text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
                                <span className="text-stone-400 dark:text-zinc-500">{t('path')} </span>
                                {permissionRequest.args.path as string}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => handlePermissionResponse(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                            >
                                <X size={16} />
                                {t('deny')}
                            </button>
                            <button
                                onClick={() => handlePermissionResponse(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
                            >
                                <Check size={16} />
                                {t('allow')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Lightbox */}
            {selectedImage && (
                <div
                    className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}

            {/* Top Bar with Mode Tabs and Settings */}
            <div className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        <button
                            onClick={() => setMode('chat')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            <MessageCircle size={14} />
                            {t('chat')}
                        </button>
                        <button
                            onClick={() => setMode('work')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'work' ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            <Zap size={14} />
                            {t('cowork')}
                        </button>
                    </div>
                </div>

                {/* History + Settings */}
                <div className="flex items-center gap-2">
                    {workingDir && (
                        <span className="text-xs text-stone-400 dark:text-zinc-500 truncate max-w-32">
                            📂 {workingDir.split(/[\\/]/).pop()}
                        </span>
                    )}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => window.ipcRenderer.invoke('agent:new-session')}
                            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title={t('newSession')}
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors ${showHistory ? 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300' : ''}`}
                            title={t('history')}
                        >
                            <History size={16} />
                        </button>
                    </div>
                    <button
                        onClick={onOpenSettings}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* History Panel - Floating Popover */}
            {showHistory && (
                <div className="absolute top-12 right-6 z-20 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-stone-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-orange-500" />
                            <span className="text-sm font-semibold text-stone-700 dark:text-zinc-200">{t('taskHistory')}</span>
                        </div>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-2">
                        {sessions.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm text-stone-400 dark:text-zinc-500">{t('noHistorySessions')}</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="group relative p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-stone-100 dark:hover:border-zinc-700"
                                    >
                                        <p className="text-xs font-medium text-stone-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                                            {session.title}
                                        </p>
                                        <p className="text-[10px] text-stone-400 mt-1">
                                            {new Date(session.updatedAt).toLocaleString('zh-CN', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    window.ipcRenderer.invoke('session:load', session.id);
                                                    setShowHistory(false);
                                                }}
                                                className="text-[10px] flex items-center gap-1 text-orange-500 hover:text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                                            >
                                                {t('load')}
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await window.ipcRenderer.invoke('session:delete', session.id);
                                                    setSessions(sessions.filter(s => s.id !== session.id));
                                                }}
                                                className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Area - Narrower for better readability */}
            <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollRef}>
                <div className="max-w-xl mx-auto space-y-5">
                    {relevantHistory.length === 0 && !streamingText ? (
                        <EmptyState mode={mode} workingDir={workingDir} />
                    ) : (
                        <>
                            {relevantHistory.map((msg, idx) => (
                                <MessageItem
                                    key={idx}
                                    message={msg}
                                    expandedBlocks={expandedBlocks}
                                    toggleBlock={toggleBlock}
                                    showTools={mode === 'work'}
                                    onImageClick={setSelectedImage}
                                />
                            ))}

                            {streamingText && (
                                <div className="animate-in fade-in duration-200">
                                    <div className="text-stone-700 dark:text-zinc-300 text-[15px] leading-7 max-w-none">
                                        <MarkdownRenderer content={streamingText} isDark={true} />
                                        <span className="inline-block w-2 h-5 bg-orange-500 ml-0.5 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isProcessing && !streamingText && (
                        <div className="flex items-center gap-2 text-stone-400 text-sm animate-pulse">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                            <span>{t('thinking')}</span>
                        </div>
                    )}
                </div>
            </div>


            {/* Bottom Input */}
            <ChatInput
                onSendMessage={(msg) => {
                    setStreamingText('');
                    onSendMessage(msg);
                }}
                onAbort={onAbort}
                isProcessing={isProcessing}
                workingDir={workingDir}
                onSelectFolder={handleSelectFolder}
                mode={mode}
                config={config}
                setConfig={(newConfig) => {
                    setConfig(newConfig);
                    // Also update in main process if ChatInput doesn't do it directly?
                    // ChatInput logic calls invoke, so we just update local state.
                }}
            />
        </div>
    );
});



const MessageItem = memo(function MessageItem({ message, expandedBlocks, toggleBlock, showTools, onImageClick }: {
    message: Anthropic.MessageParam,
    expandedBlocks: Set<string>,
    toggleBlock: (id: string) => void,
    showTools: boolean,
    onImageClick: (src: string) => void
}) {
    const { t } = useI18n();
    const isUser = message.role === 'user';

    if (isUser && Array.isArray(message.content) && message.content[0]?.type === 'tool_result') {
        return null;
    }

    if (isUser) {
        const contentArray = Array.isArray(message.content) ? message.content : [];
        const text = typeof message.content === 'string' ? message.content :
            contentArray.find((b): b is Anthropic.TextBlockParam => 'type' in b && b.type === 'text')?.text || '';

        // Extract images from user message
        const images = contentArray.filter((b): b is Anthropic.ImageBlockParam => 'type' in b && b.type === 'image');

        return (
            <div className="space-y-2 max-w-[85%]">
                {images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {images.map((img, i: number) => {
                            const imgSource = img.source as { media_type: string; data: string };
                            const src = `data:${imgSource.media_type};base64,${imgSource.data}`;
                            return (
                                <img
                                    key={i}
                                    src={src}
                                    alt="User upload"
                                    className="w-32 h-32 object-cover rounded-xl border border-stone-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => onImageClick(src)}
                                />
                            );
                        })}
                    </div>
                )}
                {text && (
                    <div className="user-bubble inline-block">
                        {text}
                    </div>
                )}
            </div>
        );
    }

    const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text' as const, text: message.content as string }];

    type ContentBlock = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
    type ToolGroup = { type: 'tool_group'; items: ContentBlock[]; count: number };
    const groupedBlocks: (ContentBlock | ToolGroup)[] = [];
    let currentToolGroup: ContentBlock[] = [];

    blocks.forEach((block) => {
        const b = block as ContentBlock;
        if (b.type === 'tool_use') {
            currentToolGroup.push(b);
        } else {
            if (currentToolGroup.length > 0) {
                groupedBlocks.push({ type: 'tool_group', items: currentToolGroup, count: currentToolGroup.length });
                currentToolGroup = [];
            }
            groupedBlocks.push(b);
        }
    });
    if (currentToolGroup.length > 0) {
        groupedBlocks.push({ type: 'tool_group', items: currentToolGroup, count: currentToolGroup.length });
    }

    return (
        <div className="space-y-4">
            {groupedBlocks.map((block, i: number) => {
                if (block.type === 'text' && block.text) {
                    return (
                        <div key={i} className="text-stone-700 dark:text-zinc-300 text-[15px] leading-7 max-w-none">
                            <MarkdownRenderer content={block.text} isDark={true} />
                        </div>
                    );
                }

                if (block.type === 'tool_group' && showTools) {
                    const toolGroup = block as ToolGroup;
                    return (
                        <div key={i} className="space-y-2">
                            {toolGroup.count > 1 && (
                                <div className="steps-indicator mb-2">
                                    <ChevronUp size={12} />
                                    <span>{toolGroup.count} steps</span>
                                </div>
                            )}

                            {toolGroup.items.map((tool, j: number) => {
                                const blockId = tool.id || `tool-${i}-${j}`;
                                const isExpanded = expandedBlocks.has(blockId);

                                return (
                                    <div key={j} className="command-block">
                                        <div
                                            className="command-block-header"
                                            onClick={() => toggleBlock(blockId)}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-stone-400 dark:text-zinc-500 text-sm">⌘</span>
                                                <span className="text-sm text-stone-600 dark:text-zinc-300 font-medium">{tool.name || 'Running command'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tool.name === 'write_file' && (
                                                    <Download size={14} className="text-stone-400" />
                                                )}
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="p-3 bg-stone-50 dark:bg-zinc-900 border-t border-stone-100 dark:border-zinc-800">
                                                {/* For Context Skills (empty input), show a friendly message */}
                                                {Object.keys(tool.input || {}).length === 0 ? (
                                                    <div className="text-xs text-emerald-600 font-medium">
                                                        ✓ {t('skillLoaded')}
                                                    </div>
                                                ) : (
                                                    <pre className="text-xs font-mono text-stone-500 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto">
                                                        {JSON.stringify(tool.input, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
});

function EmptyState({ mode, workingDir }: { mode: Mode, workingDir: string | null }) {
    const { t } = useI18n();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-lg flex items-center justify-center rotate-3 border border-stone-100 dark:border-zinc-700 overflow-hidden">
                <img src="./icon.png" alt="Logo" className="opacity-90 dark:opacity-80 w-full h-full object-cover" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold text-stone-800 dark:text-zinc-100">
                    {mode === 'chat' ? 'OpenCowork Chat' : 'OpenCowork Work'}
                </h2>
                <p className="text-stone-500 dark:text-zinc-400 text-sm max-w-xs">
                    {mode === 'work' && !workingDir
                        ? '请先选择一个工作目录来开始任务'
                        : mode === 'work' && workingDir
                            ? `工作目录: ${workingDir.split(/[\\/]/).pop()}`
                            : t('startByDescribing')
                    }
                </p>
            </div>
        </div>
    );
}
