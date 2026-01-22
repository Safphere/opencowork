import { useState, useEffect, useRef } from 'react';
import { Home, History, X, Plus, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FloatingInput } from './FloatingInput';

type BallState = 'collapsed' | 'input' | 'expanded';

interface ContentBlock {
    type: string;
    text?: string;
    name?: string;
    source?: { media_type: string; data: string };
}

interface SessionSummary {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string | ContentBlock[];
}

import { useI18n } from '../i18n/I18nContext';

export function FloatingBallPage() {
    const { t } = useI18n();
    const [ballState, setBallState] = useState<BallState>('collapsed');
    // input/images moved to FloatingInput, but we track presence for auto logic
    const [hasContent, setHasContent] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);  // Add sessions state
    const [isHovering, setIsHovering] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isNewSession, setIsNewSession] = useState(true); // Track if this is a new session
    const hasInitialized = useRef(false); // Track if we've initialized the first session

    // Fetch session list when history is opened
    useEffect(() => {
        if (showHistory) {
            window.ipcRenderer.invoke('session:list').then((list) => {
                setSessions(list as SessionSummary[]);
            });
        }
    }, [showHistory]);

    // Initialize as new session when floating ball first expands (only once)
    useEffect(() => {
        if (ballState !== 'collapsed' && isNewSession && !hasInitialized.current) {
            // Clear any previous history to start fresh
            window.ipcRenderer.invoke('agent:new-session');
            setMessages([]);
            setStreamingText('');
            hasInitialized.current = true; // Mark as initialized
        }
    }, [ballState, isNewSession]);

    // Listen for state changes and messages
    useEffect(() => {
        const removeUpdateListener = window.ipcRenderer.on('agent:history-update', async (_event, ...args) => {
            const history = args[0] as Message[];
            setMessages(history.filter(m => m.role !== 'system') || []);
            setStreamingText('');

            // Auto-save session when history updates
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
                    try {
                        // Save with current sessionId (null for new sessions, which creates a new session)
                        const result = await window.ipcRenderer.invoke('session:save', history) as { success: boolean; sessionId?: string; error?: string };

                        if (result.success) {
                            // Update sessionId if this was a new session that got created
                            if (result.sessionId && !sessionId) {
                                setSessionId(result.sessionId);
                            }
                        } else {
                            console.error('[FloatingBall] Failed to save session:', result.error);
                        }
                    } catch (error) {
                        console.error('[FloatingBall] Error saving session:', error);
                    }
                }
            }
        });

        const removeStreamListener = window.ipcRenderer.on('agent:stream-token', (_event, ...args) => {
            const token = args[0] as string;
            setStreamingText(prev => prev + token);
        });

        const removeErrorListener = window.ipcRenderer.on('agent:error', (_event, ...args) => {
            const error = args[0] as string;
            console.error('Agent Error:', error);
            setIsProcessing(false);
            setStreamingText('');
        });

        const removeAbortListener = window.ipcRenderer.on('agent:aborted', () => {
            setIsProcessing(false);
            setStreamingText('');
        });

        const removeDoneListener = window.ipcRenderer.on('agent:done', () => {
            setIsProcessing(false);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
        });

        return () => {
            // Save session on unmount to prevent data loss
            if (messages.length > 0) {
                const hasRealContent = messages.some(msg => {
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
                    window.ipcRenderer.invoke('session:save', messages).catch(err => {
                        console.error('[FloatingBall] Error saving session on unmount:', err);
                    });
                }
            }

            removeUpdateListener?.();
            removeStreamListener?.();
            removeErrorListener?.();
            removeAbortListener?.();
            removeDoneListener?.();
        };
    }, []);

    // ... (refs and resizing logic same as before) ...
    // Change ref to textarea
    const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Auto-resize logic moved to FloatingInput

    // Add transparent class to html element
    useEffect(() => {
        document.documentElement.classList.add('floating-ball-mode');
        return () => {
            document.documentElement.classList.remove('floating-ball-mode');
        };
    }, []);

    // Auto-collapse logic (only if not hovering and no input)
    useEffect(() => {
        if (ballState === 'input' && !hasContent && !isProcessing && !isHovering) {
            collapseTimeoutRef.current = setTimeout(() => {
                setBallState('collapsed');
                window.ipcRenderer.invoke('floating-ball:toggle');
            }, 3000); // 3 seconds delay before auto-collapse
        }

        return () => {
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
            }
        };
    }, [ballState, hasContent, isProcessing, isHovering]);

    // Clear timeout when user types
    useEffect(() => {
        if (hasContent) {
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
                collapseTimeoutRef.current = null;
            }
        }
    }, [hasContent]);

    // Click outside to collapse
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (ballState !== 'collapsed' && !isProcessing) {
                    setBallState('collapsed');
                    window.ipcRenderer.invoke('floating-ball:toggle');
                }
            }
        };

        if (ballState !== 'collapsed') {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ballState, isProcessing]);

    // Focus logic now handled in FloatingInput via autoFocus prop

    // Sync window height with state
    // Track previous state for resize direction logic
    const prevBallState = useRef(ballState);

    // Sync window height with state
    useEffect(() => {
        const isStateChange = ballState !== prevBallState.current;
        let targetHeight = 0;
        let anchorBottom = false;

        if (ballState === 'expanded') {
            targetHeight = showHistory ? 600 : 500;
            // When switching to expanded (showing messages), grow UP (anchor bottom) to keep input appearing stable
            if (isStateChange) {
                anchorBottom = true;
            }
        } else if (ballState === 'input') {
            if (showHistory) {
                targetHeight = 340;
                // If shrinking from expanded, anchor bottom to keep input stable
                if (isStateChange && prevBallState.current === 'expanded') {
                    anchorBottom = true;
                }
            } else if (isStateChange && prevBallState.current === 'expanded') {
                // Collapsing from expanded -> input (no history).
                // Force a shrink with AnchorBottom to position window correctly before ResizeObserver takes over.
                // Estimate height ~140px.
                targetHeight = 140;
                anchorBottom = true;
            }
        }

        if (targetHeight > 0) {
            window.ipcRenderer.invoke('floating-ball:set-height', { height: targetHeight, anchorBottom });
        }

        prevBallState.current = ballState;
    }, [ballState, showHistory]);

    // Handle dynamic resizing for compact input state
    useEffect(() => {
        if (ballState !== 'input' || showHistory) return;

        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = Math.ceil(entry.contentRect.height);
                // Add execution guard to prevent thrashing if needed, but atomic setBounds in main should handle it.
                // Add a small buffer for borders/shadows if strictly contentRect
                window.ipcRenderer.invoke('floating-ball:set-height', height + 2);
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [ballState, showHistory, hasContent]); // Re-bind if dependencies change layout relevantly

    // Handle ball click - expand slowly
    const handleBallClick = () => {
        setBallState('input');
        window.ipcRenderer.invoke('floating-ball:toggle');
    };

    // Handle submit - send message and expand to full view
    const handleSubmit = async (content: string, images: string[]) => {
        if ((!content.trim() && images.length === 0) || isProcessing) return;
        // Removed sessionId check for single-session mode

        setIsProcessing(true);
        setStreamingText('');
        setBallState('expanded'); // Expand to show conversation

        try {
            // Send as object if images exist, otherwise string for backward compat
            if (images.length > 0) {
                await window.ipcRenderer.invoke('agent:send-message', { content, images });
            } else {
                await window.ipcRenderer.invoke('agent:send-message', content.trim());
            }
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
        }
    };

    // Handle abort - stop the current task
    const handleAbort = () => {
        window.ipcRenderer.invoke('agent:abort');
        setIsProcessing(false);
    };



    // Handle collapse
    const handleCollapse = () => {
        setBallState('collapsed');
        window.ipcRenderer.invoke('floating-ball:toggle');
    };

    // Image Handlers Moved to FloatingInput

    // General drag handling - works for all states
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, moved: false });

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { isDragging: true, startX: e.screenX, startY: e.screenY, moved: false };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (dragRef.current.isDragging) {
                const deltaX = moveEvent.screenX - dragRef.current.startX;
                const deltaY = moveEvent.screenY - dragRef.current.startY;

                // Move window immediately (no threshold for drag header)
                dragRef.current.startX = moveEvent.screenX;
                dragRef.current.startY = moveEvent.screenY;
                window.ipcRenderer.invoke('floating-ball:move', { deltaX, deltaY });
            }
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
            dragRef.current.moved = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Collapsed state drag with click detection
    const handleMouseDown = (e: React.MouseEvent) => {
        if (ballState !== 'collapsed') return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { isDragging: true, startX: e.screenX, startY: e.screenY, moved: false };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (dragRef.current.isDragging) {
                const deltaX = moveEvent.screenX - dragRef.current.startX;
                const deltaY = moveEvent.screenY - dragRef.current.startY;

                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    dragRef.current.moved = true;
                }

                if (dragRef.current.moved) {
                    dragRef.current.startX = moveEvent.screenX;
                    dragRef.current.startY = moveEvent.screenY;
                    window.ipcRenderer.invoke('floating-ball:move', { deltaX, deltaY });
                }
            }
        };

        const handleMouseUp = () => {
            const wasMoved = dragRef.current.moved;
            dragRef.current.isDragging = false;
            dragRef.current.moved = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Only trigger click if not dragged
            if (!wasMoved) {
                handleBallClick();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Collapsed Ball (Premium Design)
    if (ballState === 'collapsed') {
        return (
            <div
                ref={containerRef}
                className="w-16 h-16 flex items-center justify-center select-none cursor-move"
                style={{ background: 'transparent' }}
                onMouseDown={handleMouseDown}
            >
                <div className="relative w-14 h-14 group">
                    {/* Hover Glow - Subtle & Clean */}
                    {!isProcessing && !isSuccess && (
                        <div className="absolute inset-0 bg-stone-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100" />
                    )}

                    {/* Processing State: Premium Rotating Gradient Border */}
                    {isProcessing && !isSuccess && (
                        <div className="absolute -inset-[3px] rounded-full animate-spin-slow opacity-100">
                            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_90deg,#f97316_180deg,#f97316_270deg,transparent_360deg)] opacity-80 blur-[1px]" />
                        </div>
                    )}

                    {/* Inner Pulse for Processing */}
                    {isProcessing && !isSuccess && (
                        <div className="absolute inset-0 bg-orange-400/10 rounded-full animate-breathe" />
                    )}

                    {/* Main Ball Container */}
                    <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-md border overflow-hidden z-10 ${isSuccess
                        ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/30 shadow-lg'
                        : isProcessing
                            ? 'bg-stone-900 border-stone-800' // Darker bg for contrast during processing
                            : 'bg-stone-800 border-stone-700 hover:scale-105 hover:shadow-lg hover:border-stone-600'
                        }`}>

                        {/* Success Icon with Pop Animation */}
                        {isSuccess ? (
                            <div className="animate-success-pop flex flex-col items-center justify-center">
                                <Check size={28} className="text-white drop-shadow-sm" strokeWidth={3.5} />
                            </div>
                        ) : (
                            /* Logo or Icon */
                            <img
                                src="./icon.png"
                                alt="Logo"
                                className={`w-full h-full object-cover ${isProcessing ? 'opacity-80 scale-90 grayscale-[0.3]' : 'opacity-100 scale-100'}`}
                            />
                        )}

                        {/* Processing Center Dot (Optional, subtle tech feel) */}
                        {isProcessing && !isSuccess && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-8 h-8 rounded-full border border-orange-500/30 animate-ping opacity-20" />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // Unified Input & Expanded State
    return (
        <div
            ref={containerRef}
            className={`w-full bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden flex flex-col relative ${showHistory || ballState === 'expanded' ? 'h-screen' : 'h-auto'}`}
            style={{ maxHeight: '100vh' }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Draggable Header - Always at the top */}
            <div
                className="flex items-center justify-center py-1.5 cursor-move bg-stone-50 dark:bg-zinc-900 border-b border-stone-100 dark:border-zinc-800 shrink-0 z-20"
                onMouseDown={handleDragStart}
            >
                <div className="w-8 h-1 bg-stone-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Lightbox Overlay */}
            {selectedImage && (
                <div
                    className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                    }}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                        }}
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

            {/* Messages Area - Only shown in Expanded state */}
            {ballState === 'expanded' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide shrink-0 border-b border-stone-100 dark:border-zinc-800 bg-stone-50/30 dark:bg-zinc-900/10">
                    {messages.length === 0 && !isProcessing && (
                        <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-2 opacity-50">
                            <img src="./icon.png" className="w-8 h-8 opacity-20 grayscale" />
                            <p className="text-xs">{t('startChatHint')}</p>
                        </div>
                    )}

                    {messages.filter(m => m.role !== 'system').map((msg, idx) => {
                        if (msg.role === 'user') {
                            const text = typeof msg.content === 'string' ? msg.content :
                                Array.isArray(msg.content) ? msg.content.find(b => b.type === 'text')?.text : '';

                            // Check if message has images
                            const images = Array.isArray(msg.content) ? msg.content.filter(b => b.type === 'image') : [];

                            if (Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result') return null;

                            return (
                                <div key={idx} className="bg-stone-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm text-stone-700 dark:text-zinc-100 max-w-[85%] space-y-2 ml-auto">
                                    {images.length > 0 && (
                                        <div className="flex gap-2 flex-wrap justify-end">
                                            {images.map((img, i: number) => (
                                                <img
                                                    key={i}
                                                    src={`data:${img.source?.media_type};base64,${img.source?.data}`}
                                                    alt="User upload"
                                                    className="w-20 h-20 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    onClick={() => setSelectedImage(`data:${img.source?.media_type};base64,${img.source?.data}`)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {text && <div>{text}</div>}
                                    {!text && images.length === 0 && '...'}
                                </div>
                            );
                        }
                        // Assistant message
                        const blocks: ContentBlock[] = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
                        return (
                            <div key={idx} className="space-y-1">
                                {blocks.map((block, i: number) => {
                                    if (block.type === 'text' && block.text) {
                                        return (
                                            <div key={i} className="text-sm text-stone-600 dark:text-zinc-300 leading-relaxed max-w-none">
                                                <MarkdownRenderer content={block.text} className="prose-sm" isDark={true} />
                                            </div>
                                        );
                                    }
                                    if (block.type === 'tool_use') {
                                        return (
                                            <div key={i} className="text-xs text-stone-400 bg-stone-50 rounded px-2 py-1">
                                                ⌘ {block.name}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        );
                    })}

                    {/* Streaming */}
                    {streamingText && (
                        <div className="text-sm text-stone-600 leading-relaxed max-w-none">
                            <MarkdownRenderer content={streamingText} className="prose-sm" />
                            <span className="inline-block w-1.5 h-4 bg-orange-500 ml-0.5 animate-pulse" />
                        </div>
                    )}

                    {/* Processing indicator */}
                    {isProcessing && !streamingText && (
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                            {t('thinking')}
                        </div>
                    )}
                </div>
            )}

            {/* Input Area - Using FloatingInput */}
            <FloatingInput
                onSendMessage={handleSubmit}
                onAbort={handleAbort}
                onContentChange={setHasContent}
                isProcessing={isProcessing}
                autoFocus={ballState === 'input'}
            />

            {/* Quick Actions */}
            <div className="px-2 pb-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        onClick={async () => {
                            // Clear current conversation and start a new session
                            await window.ipcRenderer.invoke('agent:new-session');
                            setSessionId(null); // Reset to null so a new session will be created
                            setIsNewSession(true); // Mark as new session
                            hasInitialized.current = false; // Reset initialization flag
                            setMessages([]);
                            setStreamingText('');
                            // Keep the ball in input state for new conversation
                            setBallState('input');
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <Plus size={12} />
                        {t('newSession')}
                    </button>
                    <button
                        onClick={() => {
                            const newHistoryState = !showHistory;
                            setShowHistory(newHistoryState);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${showHistory ? 'text-orange-500 bg-orange-50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                    >
                        <History size={12} />
                        {t('history')}
                    </button>
                    <button
                        onClick={() => window.ipcRenderer.invoke('floating-ball:show-main')}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <Home size={12} />
                        {t('home')}
                    </button>
                </div>
                <button
                    onClick={handleCollapse}
                    className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* History Panel - Rendered Below Input */}
            {showHistory && (
                <div className="border-t border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 flex-1 min-h-[100px] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 text-xs font-semibold text-stone-500 flex justify-between items-center bg-stone-100/50 dark:bg-zinc-800/50">
                        <span>{t('history')}</span>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1 flex-1">
                        {sessions.length === 0 ? (
                            <p className="text-xs text-stone-300 py-4 text-center">{t('noHistory')}</p>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={async () => {
                                            setSessionId(session.id); // Set the actual session ID
                                            setIsNewSession(false); // Mark as existing session
                                            await window.ipcRenderer.invoke('session:load', session.id);
                                            setShowHistory(false);
                                            setBallState('expanded'); // Show conversation view
                                        }}
                                        className="w-full text-left p-2 hover:bg-stone-50 rounded-lg transition-colors group border border-transparent hover:border-stone-100"
                                    >
                                        <div className="text-xs text-stone-700 font-medium truncate">
                                            {session.title || t('untitledSession')}
                                        </div>
                                        <div className="text-[10px] text-stone-400 mt-0.5 flex justify-between">
                                            <span>
                                                {new Date(session.updatedAt).toLocaleString('zh-CN', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            <span className="opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity">
                                                {t('load')}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
