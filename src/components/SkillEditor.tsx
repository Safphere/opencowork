import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SkillEditorProps {
    filename: string | null;
    readOnly?: boolean;  // Optional read-only flag
    onClose: () => void;
    onSave: () => void;
}

import { useI18n } from '../i18n/I18nContext';

export function SkillEditor({ filename, readOnly = false, onClose, onSave }: SkillEditorProps) {
    const { t } = useI18n();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (filename) {
            setName(filename);
            window.ipcRenderer.invoke('skills:get', filename).then((c) => {
                setContent(c as string);
            });
        } else {
            // New skill template
            setName('');
            setContent('---\nname: my-skill\ndescription: Description of what this skill does\n---\n\n# Instructions\n\nExplain how the AI should perform this skill...');
        }
    }, [filename]);

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) return;

        // Basic validation
        if (!content.startsWith('---')) {
            alert(t('yamlError'));
            return;
        }

        await window.ipcRenderer.invoke('skills:save', { filename: name, content });
        onSave();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-card rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-stone-200 dark:border-border">
                <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-border">
                    <h3 className="text-lg font-semibold text-stone-800 dark:text-foreground">
                        {readOnly ? t('viewSkill') : (filename ? t('editSkill') : t('newSkill'))}
                    </h3>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 dark:text-muted-foreground dark:hover:text-foreground rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4 bg-stone-50/30 dark:bg-muted/10">
                    <div>
                        <label className="block text-xs font-medium text-stone-500 dark:text-muted-foreground mb-1.5">{t('filenameId')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!!filename || readOnly} // Disable if editing existing or read-only
                            placeholder="my-cool-skill"
                            className="w-full bg-white dark:bg-card border border-stone-200 dark:border-border rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-foreground focus:outline-none focus:border-orange-500 disabled:bg-stone-50 dark:disabled:bg-muted disabled:text-stone-700 dark:disabled:text-muted-foreground"
                        />
                    </div>

                    <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-medium text-stone-500 dark:text-muted-foreground mb-1.5">{t('skillDefinition')}</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={readOnly}
                            className="flex-1 w-full bg-stone-50 dark:bg-muted/50 border border-stone-200 dark:border-border rounded-lg p-4 font-mono text-xs text-stone-800 dark:text-foreground focus:outline-none focus:border-orange-500 resize-none disabled:text-stone-700 dark:disabled:text-muted-foreground"
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-stone-100 dark:border-border flex justify-end gap-2 bg-white dark:bg-card rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-stone-600 dark:text-muted-foreground hover:bg-stone-100 dark:hover:bg-muted rounded-lg text-sm transition-colors"
                    >
                        {readOnly ? t('close') : t('cancel')}
                    </button>
                    {!readOnly && (
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
                        >
                            {t('saveSkill')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
