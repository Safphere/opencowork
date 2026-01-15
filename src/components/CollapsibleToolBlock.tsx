import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Loader2, Check, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface ToolBlockData {
    id: string;
    name: string;
    status: 'running' | 'done' | 'error';
    output?: string;
}

interface CollapsibleToolBlockProps {
    block: ToolBlockData;
}

export function CollapsibleToolBlock({ block }: CollapsibleToolBlockProps) {
    const [expanded, setExpanded] = useState(false);
    const { t } = useI18n();

    const getStatusIcon = () => {
        switch (block.status) {
            case 'running':
                return <Loader2 size={14} className="animate-spin text-primary" />;
            case 'done':
                return <Check size={14} className="text-green-500" />;
            case 'error':
                return <X size={14} className="text-destructive" />;
        }
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden my-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <Terminal size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{t('runningCommand')}</span>
                </div>
                {expanded ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-border">
                    <div className="p-3 bg-zinc-900 font-mono text-xs text-green-400 max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{block.output || 'No output yet...'}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

interface StepsIndicatorProps {
    count: number;
    expanded: boolean;
    onToggle: () => void;
}

export function StepsIndicator({ count, expanded, onToggle }: StepsIndicatorProps) {
    const { t } = useI18n();

    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 pl-3 border-l-2 border-primary/30"
        >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{count} {t('steps')}</span>
        </button>
    );
}
