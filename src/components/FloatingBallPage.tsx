import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ChevronDown, Home, History, X, Plus, Square } from 'lucide-react';
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

export function FloatingBallPage() {
    const [ballState, setBallState] = useState<BallState>('collapsed');
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]); // Base64 strings
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);  // Add sessions state
    const [isHovering, setIsHovering] = useState(false);

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
    const messagesRef = useRef<HTMLDivElement>(null);
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
    }, [input, ballState]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesRef.current && ballState === 'expanded') {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, streamingText, ballState]);

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
                await window.ipcRenderer.invoke('agent:send-message', { content: input.trim(), images });
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
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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

    // Collapsed Ball (Unchanged)
    if (ballState === 'collapsed') {
        return (
            <div
                ref={containerRef}
                className="w-16 h-16 flex items-center justify-center select-none cursor-move"
                style={{ background: 'transparent' }}
                onMouseDown={handleMouseDown}
            >
                <div className="relative w-14 h-14 group">
                    <div className="absolute inset-0 bg-amber-200/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center shadow-lg border border-stone-700 transition-transform hover:scale-105 overflow-hidden">
                        <img src="./icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    {isProcessing && (
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full animate-pulse border-2 border-white" />
                    )}
                </div>
            </div>
        );
    }

    // Input-only state (initial expand)
    if (ballState === 'input') {
        return (
            <div
                ref={containerRef}
                className="w-full h-full bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* Draggable Header */}
                <div
                    className="flex items-center justify-center py-1.5 cursor-move bg-stone-50 border-b border-stone-100"
                    onMouseDown={handleDragStart}
                >
                    <div className="w-8 h-1 bg-stone-300 rounded-full" />
                </div>

                {/* Input Area */}
                <div className="p-2">
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
                        <div className="flex flex-col bg-[#FAF9F7] border border-stone-200 rounded-[20px] px-3 pt-2 pb-1 shadow-sm transition-all hover:shadow-md focus-within:ring-4 focus-within:ring-orange-50/50 focus-within:border-orange-200">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="描述任务... (Enter 发送, Shift+Enter 换行)"
                                rows={1}
                                className="w-full bg-transparent text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[72px] leading-6 pt-0.5 pb-0 transition-[height] duration-200 ease-out mb-0"
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
                                        title="上传图片"
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
                                            title="停止"
                                        >
                                            <Square size={12} fill="currentColor" />
                                            <span className="text-[10px] font-semibold">停止</span>
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
                <div className="px-2 pb-1.5 flex items-center justify-between">
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
                            新会话
                        </button>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <History size={12} />
                            历史
                        </button>
                        <button
                            onClick={() => window.ipcRenderer.invoke('floating-ball:show-main')}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <Home size={12} />
                            首页
                        </button>
                    </div>
                    <button
                        onClick={handleCollapse}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Previous Tasks (History) */}
                {showHistory && (
                    <div className="border-t border-stone-100 p-3 max-h-60 overflow-y-auto scrollbar-hide">
                        <p className="text-xs text-stone-400 mb-2">历史记录</p>
                        {sessions.length === 0 ? (
                            <p className="text-xs text-stone-300 py-2 text-center">暂无历史</p>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => {
                                            window.ipcRenderer.invoke('session:load', session.id);
                                            setShowHistory(false);
                                        }}
                                        className="w-full text-left p-2 hover:bg-stone-50 rounded-lg transition-colors group border border-transparent hover:border-stone-100"
                                    >
                                        <div className="text-xs text-stone-700 font-medium truncate">
                                            {session.title || 'Untitled Session'}
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
                                                加载
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Expanded state (with conversation)
    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Draggable Header */}
            <div
                className="flex items-center justify-center py-1 cursor-move bg-stone-50 border-b border-stone-100 shrink-0"
                onMouseDown={handleDragStart}
            >
                <div className="w-8 h-1 bg-stone-300 rounded-full" />
            </div>

            {/* Lightbox Overlay */}
            {selectedImage && (
                <div
                    className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
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

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100 shrink-0">
                <span className="text-sm font-medium text-stone-700">OpenCowork</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            window.ipcRenderer.invoke('agent:new-session');
                            setMessages([]);
                            setImages([]);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={() => window.ipcRenderer.invoke('floating-ball:show-main')}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                    >
                        <Home size={14} />
                    </button>
                    <button
                        onClick={handleCollapse}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
                {messages.filter(m => m.role !== 'system').map((msg, idx) => {
                    if (msg.role === 'user') {
                        const text = typeof msg.content === 'string' ? msg.content :
                            Array.isArray(msg.content) ? msg.content.find(b => b.type === 'text')?.text : '';

                        // Check if message has images
                        const images = Array.isArray(msg.content) ? msg.content.filter(b => b.type === 'image') : [];

                        if (Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result') return null;

                        return (
                            <div key={idx} className="bg-stone-100 rounded-xl px-3 py-2 text-sm text-stone-700 max-w-[85%] space-y-2" style={{ wordBreak: 'break-all' }}>
                                {images.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
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
                                {text && <div style={{ wordBreak: 'break-all' }} className="whitespace-pre-wrap">{text}</div>}
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
                                        <div key={i} className="text-sm text-stone-600 leading-relaxed max-w-none" style={{ wordBreak: 'break-all' }}>
                                            <MarkdownRenderer content={block.text} className="prose-sm" />
                                        </div>
                                    );
                                }
                                if (block.type === 'tool_use') {
                                    return (
                                        <div key={i} className="text-xs text-stone-400 bg-stone-50 rounded px-2 py-1" style={{ wordBreak: 'break-all' }}>
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
                    <div className="text-sm text-stone-600 leading-relaxed max-w-none" style={{ wordBreak: 'break-all' }}>
                        <MarkdownRenderer content={streamingText} className="prose-sm" />
                        <span className="inline-block w-1.5 h-4 bg-orange-500 ml-0.5 animate-pulse" />
                    </div>
                )}

                {/* Processing indicator */}
                {isProcessing && !streamingText && (
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                        思考中...
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-stone-100 p-2 shrink-0">
                {/* Image Preview */}
                {images.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
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

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="flex flex-col bg-[#FAF9F7] border border-stone-200 rounded-[20px] px-3 pt-2 pb-1 shadow-sm transition-all hover:shadow-md focus-within:ring-4 focus-within:ring-orange-50/50 focus-within:border-orange-200">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder="继续对话... (Enter 发送, Shift+Enter 换行)"
                            rows={1}
                            className="w-full bg-transparent text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[72px] leading-6 pt-0.5 pb-0 transition-[height] duration-200 ease-out mb-0"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                height: 'auto'
                            }}
                            ref={ballState === 'expanded' ? inputRef : undefined}
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                    title="上传图片"
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
                                        title="停止"
                                    >
                                        <Square size={12} fill="currentColor" />
                                        <span className="text-[10px] font-semibold">停止</span>
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

                <p className="text-[11px] text-stone-400 text-center mt-1.5 mb-1 px-2">
                    AI 可能会出错，请仔细核查重要信息
                </p>
            </div >
        </div >
    );
}
