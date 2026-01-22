import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ArrowUp, X, Square } from 'lucide-react';

interface FloatingInputProps {
    onSendMessage: (content: string, images: string[]) => void;
    onAbort: () => void;
    onContentChange: (hasContent: boolean) => void;
    isProcessing: boolean;
    autoFocus?: boolean;
}

export function FloatingInput({ onSendMessage, onAbort, onContentChange, isProcessing, autoFocus }: FloatingInputProps) {
    const { t } = useI18n();
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Notify parent about content status for auto-collapse logic
    useEffect(() => {
        onContentChange(input.trim().length > 0 || images.length > 0);
    }, [input, images]);

    // Focus handling
    useEffect(() => {
        if (autoFocus) {
            // Small delay to ensure render
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [autoFocus]);

    // Auto-resize
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            if (input) {
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 72)}px`;
            }
        }
    }, [input]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && images.length === 0) || isProcessing) return;

        onSendMessage(input, images);
        setInput('');
        setImages([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    return (
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
                        autoFocus={autoFocus}
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
    );
}
