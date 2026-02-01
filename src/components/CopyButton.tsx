import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { logger } from '../services/logger';

interface CopyButtonProps {
    content: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function CopyButton({ content, size = 'md', showLabel = false }: CopyButtonProps) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            logger.error('Failed to copy:', err);
        }
    };

    const sizeClasses = {
        sm: 'p-1',
        md: 'p-1.5',
        lg: 'p-2'
    };

    const iconSize = {
        sm: 14,
        md: 14,
        lg: 16
    };

    return (
        <button
            onClick={handleCopy}
            className={`
                ${sizeClasses[size]}
                inline-flex items-center justify-center rounded-lg
                text-stone-400 hover:text-stone-600 hover:bg-stone-100
                dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700
                transition-all duration-200
            `}
            title={t('copy')}
        >
            {copied ? (
                <Check size={iconSize[size]} className="text-green-500" />
            ) : (
                <Copy size={iconSize[size]} />
            )}
            {showLabel && (
                <span className="ml-1.5 text-xs font-medium">
                    {copied ? t('copied') : t('copy')}
                </span>
            )}
        </button>
    );
}
