import { useState, useEffect, useRef } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { Check, Copy } from 'lucide-react';
import { logger } from '../services/logger';

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
});

interface MarkdownRendererProps {
    content: string;
    className?: string;
    isDark?: boolean;
    onFilePathClick?: (filePath: string) => void;
}

import { useI18n } from '../i18n/I18nContext';

export function MarkdownRenderer({ content, className = '', isDark = false, onFilePathClick }: MarkdownRendererProps) {
    const { t } = useI18n();
    return (
        <div className={`prose ${isDark ? 'prose-invert' : 'prose-stone'} max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node: _node, inline, className, children, ...props }: { node?: unknown; inline?: boolean; className?: string; children?: React.ReactNode }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeContent = String(children).replace(/\n$/, '');

                        if (!inline && match) {
                            // Mermaid handling
                            if (match[1] === 'mermaid') {
                                return <MermaidDiagram code={codeContent} isDark={isDark} />;
                            }

                            // Standard Syntax Highlighting
                            const language = match[1];
                            return (
                                <div className="my-5 rounded-xl border border-stone-200 bg-[#FAFAFA] dark:bg-[#1e1e1e] shadow-sm overflow-hidden">
                                    {/* Mac-style Window Header */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5F5F4] dark:bg-[#1e1e1e] border-b border-stone-200 dark:border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            {/* Traffic Lights */}
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                                                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                                            </div>
                                            {/* Language Label */}
                                            <span className="ml-2 text-xs font-mono font-medium text-stone-500 select-none">
                                                {language}
                                            </span>
                                        </div>
                                        <CopyButton text={codeContent} />
                                    </div>

                                    <SyntaxHighlighter
                                        style={isDark ? vscDarkPlus : oneLight}
                                        language={language}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            padding: '1.25rem',
                                            fontSize: '0.9rem',
                                            lineHeight: '1.6',
                                            background: 'transparent', // Let container bg show through
                                            border: 'none',
                                        }}
                                        {...props}
                                    >
                                        {codeContent}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        }

                        // Inline code - check for file paths
                        const codeText = String(children);
                        // Detect Windows paths (E:\...) or Unix paths (/.../...)
                        const isFilePath = /^[A-Za-z]:[/\\]|^\/\w+/.test(codeText);

                        if (isFilePath) {
                            return (
                                <code
                                    className={`${className} px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-mono text-sm border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors`}
                                    onClick={() => {
                                        if (onFilePathClick) {
                                            onFilePathClick(codeText);
                                        } else {
                                            window.ipcRenderer.invoke('shell:open-path', codeText);
                                        }
                                    }}
                                    title={onFilePathClick ? '在文件画布中打开' : t('openInFileManager')}
                                    {...props}
                                >
                                    📁 {children}
                                </code>
                            );
                        }

                        return (
                            <code
                                className={`${className} px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 font-mono text-sm border border-stone-200 dark:border-zinc-700`}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Improved Table Styling
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-6 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                <table className="w-full text-left border-collapse text-sm">
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    thead({ children }) {
                        return <thead className="bg-stone-50 dark:bg-zinc-800/50 text-stone-700 dark:text-zinc-200">{children}</thead>;
                    },
                    th({ children }) {
                        return <th className="px-4 py-3 font-semibold border-b border-stone-200 dark:border-zinc-800">{children}</th>;
                    },
                    td({ children }) {
                        return <td className="px-4 py-3 border-b border-stone-100 dark:border-zinc-800/50 text-stone-600 dark:text-zinc-400">{children}</td>;
                    },
                    // Improved Spacing for Typography
                    p({ children }) {
                        // ⚠️ 只处理纯文本内容的换行，不破坏 React 组件
                        // 检查 children 是否为纯字符串
                        const isPlainText = typeof children === 'string' ||
                            (Array.isArray(children) && children.every(child => typeof child === 'string'));

                        if (isPlainText && typeof children === 'string') {
                            // 将换行符转换为 <br />
                            const lines = children.split('\n');
                            if (lines.length > 1) {
                                const formattedContent = lines.map((line, index) => (
                                    <React.Fragment key={index}>
                                        {line}
                                        {index < lines.length - 1 && <br />}
                                    </React.Fragment>
                                ));
                                return <p className="mb-4 leading-7 text-stone-700 dark:text-zinc-300 last:mb-0">{formattedContent}</p>;
                            }
                        }
                        // 对于复杂内容（包含组件等），保持原样
                        return <p className="mb-4 leading-7 text-stone-700 dark:text-zinc-300 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                        return <ul className="list-disc pl-6 mb-4 space-y-1 text-stone-700 dark:text-zinc-300 marker:text-stone-400 dark:marker:text-zinc-600">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="list-decimal pl-6 mb-4 space-y-1 text-stone-700 dark:text-zinc-300 marker:text-stone-400 dark:marker:text-zinc-600">{children}</ol>;
                    },
                    li({ children }) {
                        return <li className="pl-1">{children}</li>;
                    },
                    h1({ children }) {
                        return <h1 className="text-2xl font-bold mt-8 mb-4 text-stone-900 dark:text-zinc-100 pb-2 border-b border-stone-100 dark:border-zinc-800 text-shadow-sm">{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 className="text-lg font-bold mt-6 mb-3 text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block shadow-sm"></span>
                            {children}
                        </h2>;
                    },
                    h3({ children }) {
                        return <h3 className="text-base font-semibold mt-4 mb-2 text-stone-800 dark:text-zinc-200">{children}</h3>;
                    },
                    blockquote({ children }) {
                        return <blockquote className="border-l-4 border-orange-200 dark:border-orange-500/30 pl-4 py-2 my-4 text-stone-600 dark:text-zinc-400 italic bg-orange-50/30 dark:bg-orange-900/10 rounded-r-lg">{children}</blockquote>;
                    },
                    a({ href, children }) {
                        return <a href={href} className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline decoration-orange-300 dark:decoration-orange-500/30 hover:decoration-orange-600 underline-offset-2 transition-all font-medium" target="_blank" rel="noopener noreferrer">{children}</a>
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

function MermaidDiagram({ code, isDark }: { code: string, isDark: boolean }) {
    const [svg, setSvg] = useState<string>('');
    const renderId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        mermaid.render(renderId.current, code).then(({ svg }) => {
            setSvg(svg);
        }).catch((err) => {
            logger.error('Mermaid render error:', err);
            setSvg(`<div class="text-red-500 bg-red-50 p-2 rounded text-xs font-mono">Failed to render diagram</div>`);
        });
    }, [code, isDark]);

    return (
        <div
            className="my-6 p-4 bg-white border border-stone-200 rounded-xl flex justify-center overflow-x-auto shadow-sm"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

function CopyButton({ text }: { text: string }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 transition-all"
            title={t('copyCode')}
        >
            {copied ? (
                <>
                    <Check size={13} className="text-green-600" />
                    <span className="text-green-600">{t('copied')}</span>
                </>
            ) : (
                <>
                    <Copy size={13} />
                    <span>{t('copy')}</span>
                </>
            )}
        </button>
    );
}
