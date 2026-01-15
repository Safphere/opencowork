import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SkillEditorProps {
    filename: string | null;
    readOnly?: boolean;  // Optional read-only flag
    onClose: () => void;
    onSave: () => void;
}

export function SkillEditor({ filename, readOnly = false, onClose, onSave }: SkillEditorProps) {
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
            alert('Skill must start with YAML frontmatter (---)');
            return;
        }

        await window.ipcRenderer.invoke('skills:save', { filename: name, content });
        onSave();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-stone-100">
                    <h3 className="text-lg font-semibold text-stone-800">
                        {readOnly ? '查看技能' : (filename ? '编辑技能' : '新建技能')}
                    </h3>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1.5">文件名 (ID)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!!filename || readOnly} // Disable if editing existing or read-only
                            placeholder="my-cool-skill"
                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 disabled:bg-stone-50 disabled:text-stone-500"
                        />
                    </div>

                    <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-medium text-stone-500 mb-1.5">技能定义 (Markdown)</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={readOnly}
                            className="flex-1 w-full bg-stone-50 border border-stone-200 rounded-lg p-4 font-mono text-xs focus:outline-none focus:border-orange-500 resize-none disabled:text-stone-500"
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-stone-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm transition-colors"
                    >
                        {readOnly ? '关闭' : '取消'}
                    </button>
                    {!readOnly && (
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
                        >
                            保存技能
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
