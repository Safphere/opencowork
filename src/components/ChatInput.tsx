import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { ArrowUp, FolderOpen, Square, ChevronDown, Check, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface ChatInputProps {
    onSendMessage: (message: string | { content: string, images: string[] }) => void;
    onAbort: () => void;
    isProcessing: boolean;
    workingDir: string | null;
    onSelectFolder: () => void;
    mode: 'memory' | 'work';
    config: any;
    setConfig: (config: any) => void;
}

export function ChatInput({
    onSendMessage,
    onAbort,
    isProcessing,
    workingDir,
    onSelectFolder,
    mode,
    config,
    setConfig
}: ChatInputProps) {
    const { t } = useI18n();
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Provider Constants
    const PROVIDER_MODELS: Record<string, string[]> = {
        'glm': ['glm-4.7', 'glm-4.6'],
        'zai': ['glm-4.7', 'glm-4.6'],
        'minimax_cn': ['MiniMax-M2.1'],
        'minimax_intl': ['MiniMax-M2.1'],
        'custom': []
    };

    // Helper method to get display name
    const getModelDisplayName = (cfg: any) => {
        if (!cfg || !cfg.activeProviderId || !cfg.providers) return 'Loading...';
        const p = cfg.providers[cfg.activeProviderId];
        if (!p) return 'Unknown';

        // For custom provider, display custom model name or 'Custom Model'
        if (cfg.activeProviderId === 'custom') {
            return p.model || 'Custom Model';
        }

        return p.model || 'Unknown';
    };

    const PROVIDER_NAMES: Record<string, string> = {
        'glm': '智谱 GLM',
        'zai': 'ZAI',
        'minimax_cn': 'MiniMax (国内)',
        'minimax_intl': 'MiniMax (海外)',
        'custom': '自定义'
    };

    // Auto-resize textarea - Isolated to this component
    useLayoutEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Focus input on Ctrl/Cmd+L
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && images.length === 0) || isProcessing) return;

        const messageContent = images.length > 0 ? { content: input, images } : input;

        // All messages are sent asynchronously (fire and forget)
        onSendMessage(messageContent);

        setInput('');
        setImages([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

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
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        setImages(prev => [...prev, e.target?.result as string]);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 pt-3 pb-1 shadow-lg shadow-stone-200/50 dark:shadow-black/20">
            <div className="max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
                {/* Image Preview Area */}
                {images.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-lg border border-stone-200 overflow-hidden shrink-0 group">
                                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col bg-[#FAF9F7] dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 rounded-[20px] px-3 pt-2 pb-1 shadow-sm transition-all hover:shadow-md focus-within:ring-4 focus-within:ring-orange-50/50 focus-within:border-orange-200 dark:focus-within:border-orange-500/30">

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={mode === 'memory' ? t('inputMessage') : workingDir ? t('describeTaskPlaceholder') : t('selectWorkingDirFirst')}
                            rows={1}
                            className="w-full bg-transparent text-stone-800 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[120px] leading-6 pt-0.5 pb-0 transition-[height] duration-200 ease-out mb-0"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                height: 'auto'
                            }}
                        />
                        {/* Hide scrollbar */}
                        <style>{`
                            textarea::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        {/* Toolbar Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={onSelectFolder}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                    title={t('selectWorkingDir')}
                                >
                                    <FolderOpen size={16} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
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

                                <div className="w-px h-3 bg-stone-200 dark:bg-zinc-700 mx-1" />

                                {/* Model Selector */}
                                <div className="relative">
                                    <div
                                        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-stone-500 bg-stone-100/50 hover:bg-stone-100 dark:text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md cursor-pointer transition-colors max-w-[120px]"
                                        title={t('switchModel')}
                                    >
                                        <span className="truncate scale-90 origin-left">
                                            {config ? getModelDisplayName(config) : 'Loading...'}
                                        </span>
                                        <ChevronDown size={12} className="text-stone-400 dark:text-zinc-500 shrink-0" />
                                    </div>

                                    {/* Model Selector Popover */}
                                    {isModelSelectorOpen && config && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsModelSelectorOpen(false)} />
                                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto py-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                                {Object.keys(PROVIDER_MODELS).map(providerId => {
                                                    const models = PROVIDER_MODELS[providerId];
                                                    const provider = config.providers[providerId];

                                                    // Filter out providers that are not properly configured
                                                    // For custom: require both apiKey and model
                                                    // For others: require apiKey
                                                    const isCustom = providerId === 'custom';
                                                    const hasApiKey = provider?.apiKey && provider.apiKey.trim() !== '';
                                                    const hasModel = provider?.model && provider.model.trim() !== '';
                                                    const isConfigured = isCustom ? (hasApiKey && hasModel) : hasApiKey;

                                                    if (!isConfigured) {
                                                        return null;
                                                    }

                                                    // Use custom model name if available
                                                    let providerName = PROVIDER_NAMES[providerId] || providerId;
                                                    if (isCustom) {
                                                        providerName = provider?.name || '自定义';
                                                    } else {
                                                        providerName = provider?.name || providerName;
                                                    }

                                                    if (isCustom) {
                                                        return (
                                                            <div key={providerId}>
                                                                <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 dark:text-zinc-500 bg-stone-50/50 dark:bg-zinc-800/50 uppercase tracking-wider">
                                                                    {providerName}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const newConfig = { ...config, activeProviderId: providerId };
                                                                        setConfig(newConfig);
                                                                        window.ipcRenderer.invoke('config:set-all', newConfig);
                                                                        setIsModelSelectorOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors truncate flex items-center justify-between group ${config.activeProviderId === providerId ? 'text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-500/10' : 'text-stone-600 dark:text-zinc-300'}`}
                                                                >
                                                                    <span>{provider?.model || 'Custom Model'}</span>
                                                                    {config.activeProviderId === providerId && <Check size={12} />}
                                                                </button>
                                                            </div>
                                                        );
                                                    }

                                                    if (models.length === 0) return null;

                                                    return (
                                                        <div key={providerId}>
                                                            <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 dark:text-zinc-500 bg-stone-50/50 dark:bg-zinc-800/50 uppercase tracking-wider sticky top-0">
                                                                {providerName}
                                                            </div>
                                                            {models.map(model => (
                                                                <button
                                                                    key={model}
                                                                    onClick={() => {
                                                                        const newConfig = { ...config };
                                                                        newConfig.activeProviderId = providerId;
                                                                        if (!newConfig.providers[providerId]) {
                                                                            newConfig.providers[providerId] = { id: providerId, model: model, apiKey: '', apiUrl: '' };
                                                                        }
                                                                        newConfig.providers[providerId].model = model;

                                                                        setConfig(newConfig);
                                                                        window.ipcRenderer.invoke('config:set-all', newConfig);
                                                                        setIsModelSelectorOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors truncate flex items-center justify-between group ${config.activeProviderId === providerId && config.providers[providerId].model === model ? 'text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-500/10' : 'text-stone-600 dark:text-zinc-300'}`}
                                                                >
                                                                    <span>{model}</span>
                                                                    {config.activeProviderId === providerId && config.providers[providerId].model === model && <Check size={12} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                                {/* Show message if no providers are configured */}
                                                {Object.keys(PROVIDER_MODELS).every(providerId => {
                                                    const provider = config.providers[providerId];
                                                    const isCustom = providerId === 'custom';
                                                    const hasApiKey = provider?.apiKey && provider.apiKey.trim() !== '';
                                                    const hasModel = provider?.model && provider.model.trim() !== '';
                                                    return !(isCustom ? (hasApiKey && hasModel) : hasApiKey);
                                                }) && (
                                                    <div className="px-3 py-4 text-xs text-stone-400 dark:text-zinc-500 text-center">
                                                        请先在设置中配置API Key
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Send/Stop Button */}
                            <div>
                                {isProcessing ? (
                                    <button
                                        type="button"
                                        onClick={onAbort}
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
                                            : 'bg-stone-100 dark:bg-zinc-800 text-stone-300 dark:text-zinc-600 cursor-not-allowed'
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

                <p className="text-[11px] text-stone-400 dark:text-zinc-600 text-center mt-1.5">
                    {t('aiDisclaimer')}
                </p>
            </div>
        </div>
    );
}
