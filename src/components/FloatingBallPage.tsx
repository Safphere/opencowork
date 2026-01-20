import { useState, useEffect, useRef } from 'react';
import { ArrowUp, Home, History, X, Plus, Square, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

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
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]); // Base64 strings
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);  // Add sessions state
    const [isHovering, setIsHovering] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Fetch session list when history is opened
    useEffect(() => {
        if (showHistory) {
            window.ipcRenderer.invoke('session:list').then((list) => {
                setSessions(list as SessionSummary[]);
            });
        }
    }, [showHistory]);

    // Change ref to textarea
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; // Reset to auto
            // Only set specific height if there is content, otherwise let rows=1 handle it
            // This prevents placeholder from causing expansion when the window is still resizing (small width)
            if (input) {
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 72)}px`;
            }
        }
    }, [input]);

    // Add transparent class to html element
    useEffect(() => {
        document.documentElement.classList.add('floating-ball-mode');
        return () => {
            document.documentElement.classList.remove('floating-ball-mode');
        };
    }, []);

    // Listen for state changes and messages
    useEffect(() => {
        // Don't reset isProcessing on history update - wait for agent:done
        const removeHistoryListener = window.ipcRenderer.on('agent:history-update', (_event, ...args) => {
            const history = args[0] as Message[];
            setMessages(history.filter(m => m.role !== 'system'));
            setStreamingText('');
        });

        const removeStreamListener = window.ipcRenderer.on('agent:stream-token', (_event, ...args) => {
            const token = args[0] as string;
            setStreamingText(prev => prev + token);
        });

        const removeErrorListener = window.ipcRenderer.on('agent:error', () => {
            setIsProcessing(false);
            setStreamingText('');
        });

        // Listen for abort event
        const removeAbortListener = window.ipcRenderer.on('agent:aborted', () => {
            setIsProcessing(false);
            setStreamingText('');
        });

        // Only reset isProcessing when processing is truly done
        const removeDoneListener = window.ipcRenderer.on('agent:done', () => {
            setIsProcessing(false);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000); // Reset success state after 3s
        });

        return () => {
            removeHistoryListener?.();
            removeStreamListener?.();
            removeErrorListener?.();
            removeAbortListener?.();
            removeDoneListener?.();
        };
    }, []);

    // Auto-collapse logic (only if not hovering and no input)
    useEffect(() => {
        if (ballState === 'input' && !input.trim() && images.length === 0 && !isProcessing && !isHovering) {
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
    }, [ballState, input, images, isProcessing, isHovering]);

    // Clear timeout when user types
    useEffect(() => {
        if (input.trim() || images.length > 0) {
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
                collapseTimeoutRef.current = null;
            }
        }
    }, [input, images]);

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

    // Focus input when expanding to input state
    useEffect(() => {
        if (ballState === 'input') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [ballState]);

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
    }, [ballState, showHistory, input, images.length]); // Re-bind if dependencies change layout relevantly

    // Handle ball click - expand slowly
    const handleBallClick = () => {
        setBallState('input');
        window.ipcRenderer.invoke('floating-ball:toggle');
    };

    // Handle submit - send message and expand to full view
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && images.length === 0) || isProcessing) return;

        setIsProcessing(true);
        setStreamingText('');
        setBallState('expanded'); // Expand to show conversation

        try {
            // Send as object if images exist, otherwise string for backward compat
            if (images.length > 0) {
                await window.ipcRenderer.invoke('agent:send-message', { content: input, images });
            } else {
                await window.ipcRenderer.invoke('agent:send-message', input.trim());
            }
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
        }
        setInput('');
        setImages([]);
    };

    // Handle abort - stop the current task
    const handleAbort = () => {
        window.ipcRenderer.invoke('agent:abort');
        setIsProcessing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    // Handle collapse
    const handleCollapse = () => {
        setBallState('collapsed');
        window.ipcRenderer.invoke('floating-ball:toggle');
    };

    // Image Input Handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        if (result) {
                            setImages(prev => [...prev, result]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        if (result) {
                            setImages(prev => [...prev, result]);
                        }
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

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

            {/* Input Area - Always Visible and Stable */}
            <div className="p-2 shrink-0 z-10 bg-white dark:bg-zinc-950">
                {/* Image Preview */}
                {images.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded border border-stone-200 overflow-hidden shrink-0 group">
                                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100"
                                >
                                    <X size={8} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-1">
                    <div className="flex flex-col bg-[#FAF9F7] dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-[20px] px-3 pt-2 pb-1 shadow-sm transition-all hover:shadow-md focus-within:ring-4 focus-within:ring-orange-50/50 focus-within:border-orange-200">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={t('describeTaskPlaceholderFloating')}
                            rows={1}
                            className="w-full bg-transparent text-stone-800 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[72px] leading-6 pt-0.5 pb-0 transition-[height] duration-200 ease-out mb-0"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                height: 'auto'
                            }}
                            autoFocus
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                    title={t('uploadImage')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 0 0 0-2.828 0L6 21" /></svg>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                />
                            </div>

                            <div>
                                {isProcessing ? (
                                    <button
                                        type="button"
                                        onClick={handleAbort}
                                        className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all flex items-center gap-1 px-2 shadow-sm"
                                        title={t('stop')}
                                    >
                                        <Square size={12} fill="currentColor" />
                                        <span className="text-[10px] font-semibold">{t('stop')}</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() && images.length === 0}
                                        className={`p-1 rounded-lg transition-all shadow-sm flex items-center justify-center ${input.trim() || images.length > 0
                                            ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-200 hover:shadow-md'
                                            : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                                            }`}
                                        style={{ width: '26px', height: '26px' }}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Quick Actions */}
            <div className="px-2 pb-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            window.ipcRenderer.invoke('agent:new-session');
                            setMessages([]);
                            setImages([]);
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
                                        onClick={() => {
                                            window.ipcRenderer.invoke('session:load', session.id);
                                            setShowHistory(false);
                                            setBallState('expanded');
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
