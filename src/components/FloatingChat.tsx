import { useState, useRef, useEffect } from 'react';
import { Minimize2, X, ChevronDown, ChevronUp, Terminal, Loader2, Plus, ArrowUp, Check } from 'lucide-react';

interface ToolBlock {
    id: string;
    name: string;
    status: 'running' | 'done' | 'error';
    output?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    toolBlocks?: ToolBlock[];
    stepsCount?: number;
}

interface FloatingChatProps {
    onSendMessage: (message: string) => void;
    isProcessing: boolean;
    messages: Message[];
    onClose: () => void;
    onMinimize: () => void;
    isMinimized: boolean;
}

export function FloatingChat({
    onSendMessage,
    isProcessing,
    messages,
    onClose,
    onMinimize,
    isMinimized
}: FloatingChatProps) {
    const [input, setInput] = useState('');
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!isMinimized) {
            scrollToBottom();
        }
    }, [messages, isMinimized]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isProcessing) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const toggleBlock = (id: string) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Minimized floating ball - Abstract "Ghost/Blob" style (Reference Image 0)
    if (isMinimized) {
        return (
            <div
                onClick={onMinimize}
                className="fixed bottom-8 right-8 group cursor-pointer z-50"
            >
                <div className="relative w-16 h-16">
                    {/* Abstract Blob/Ghost Shape */}
                    <div className="absolute inset-0 bg-stone-800 rounded-full flex items-center justify-center shadow-xl overflow-hidden transition-transform group-hover:scale-105 border border-stone-700">
                        {/* Simple Ghost Face */}
                        <div className="relative w-10 h-10">
                            <div className="absolute top-2 left-2 w-2 h-2 bg-stone-950 rounded-full" />
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-stone-950 rounded-full" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-6 bg-amber-50/90 rounded-t-full" />
                        </div>
                    </div>
                    {/* Processing Indicator */}
                    {isProcessing && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse border-2 border-white" />
                    )}
                </div>
            </div>
        );
    }

    // Expanded Window - Light/Cream Theme (Reference Image 2)
    return (
        <div className="fixed bottom-8 right-8 w-[520px] max-h-[720px] flex flex-col z-50 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 font-sans">
            {/* Main Container - Clean White/Cream */}
            <div className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header Actions */}
                <div className="absolute top-0 right-0 p-2 flex gap-1 z-10">
                    <button
                        onClick={onMinimize}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Minimize to ball"
                    >
                        <Minimize2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-[400px] bg-gradient-to-b from-stone-50 to-white">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-3 pt-16">
                            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                                <Terminal size={28} className="text-stone-300" />
                            </div>
                            <p className="text-sm">Start a conversation</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {msg.role === 'user' ? (
                                // User Message - Warm Gray Bubble (Reference Image 2 - top bubble)
                                <div className="bg-stone-200/80 text-stone-800 rounded-2xl px-5 py-4 text-sm leading-relaxed max-w-[90%] shadow-sm">
                                    {msg.content}
                                </div>
                            ) : (
                                // Assistant Message - Clean typography
                                <div className="space-y-4 w-full">
                                    <p className="text-stone-700 text-base leading-7">
                                        {msg.content}
                                    </p>

                                    {/* Steps Indicator (Reference Image 2 - "12 steps") */}
                                    {msg.stepsCount && msg.stepsCount > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-stone-400 pl-3 border-l-2 border-stone-300">
                                            <ChevronUp size={14} />
                                            <span>{msg.stepsCount} steps</span>
                                        </div>
                                    )}

                                    {/* Tool Execution Blocks (Reference Image 2 - "Running command") */}
                                    {(msg.toolBlocks?.length ?? 0) > 0 && (
                                        <div className="space-y-2">
                                            {msg.toolBlocks?.map((block) => (
                                                <div
                                                    key={block.id}
                                                    className="bg-white border border-stone-200 rounded-xl overflow-hidden"
                                                >
                                                    <button
                                                        onClick={() => toggleBlock(block.id)}
                                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {block.status === 'running' ? (
                                                                <Loader2 size={14} className="animate-spin text-orange-500" />
                                                            ) : block.status === 'done' ? (
                                                                <Check size={14} className="text-green-500" />
                                                            ) : (
                                                                <Terminal size={14} className="text-stone-400" />
                                                            )}
                                                            <span className="text-sm font-medium text-stone-600">
                                                                Running command
                                                            </span>
                                                        </div>
                                                        <ChevronDown
                                                            size={16}
                                                            className={`text-stone-400 transition-transform ${expandedBlocks.has(block.id) ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                    {expandedBlocks.has(block.id) && block.output && (
                                                        <div className="border-t border-stone-100 bg-stone-50 p-4 max-h-48 overflow-y-auto">
                                                            <pre className="text-xs font-mono text-stone-500 whitespace-pre-wrap">{block.output}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Reference Image 2 - Bottom) */}
                <div className="border-t border-stone-200 bg-white p-4">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="bg-white border border-stone-200 rounded-xl flex items-center shadow-sm focus-within:border-stone-300 focus-within:ring-1 focus-within:ring-stone-200 transition-all">
                            {/* Plus Button */}
                            <button
                                type="button"
                                className="p-3 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Plus size={18} />
                            </button>

                            {/* Input */}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Reply..."
                                className="flex-1 bg-transparent border-none text-stone-800 placeholder:text-stone-400 py-3 text-sm focus:ring-0 focus:outline-none"
                                disabled={isProcessing}
                            />

                            {/* Model Selector (Decorative) */}
                            <div className="flex items-center gap-2 px-3 text-xs text-stone-400">
                                <span className="font-medium">GLM 4.7</span>
                                <ChevronDown size={12} />
                            </div>

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!input.trim() || isProcessing}
                                className={`m-1.5 p-2.5 rounded-lg transition-all duration-200 ${input.trim() && !isProcessing
                                        ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
                                        : 'bg-stone-100 text-stone-300'
                                    }`}
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </form>

                    {/* Disclaimer */}
                    <p className="text-[11px] text-stone-400 text-center mt-3">
                        Claude is AI and can make mistakes. Please double-check responses.
                    </p>
                </div>
            </div>
        </div>
    );
}
