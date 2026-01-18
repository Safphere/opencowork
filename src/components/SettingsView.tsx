import { useState, useEffect } from 'react';
import { X, Settings, FolderOpen, Server, Check, Plus, Trash2, Edit2, Zap, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';
import { SkillEditor } from './SkillEditor';

interface SettingsViewProps {
    onClose: () => void;
}

interface Config {
    apiKey: string;
    apiUrl: string;
    model: string;
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
}

interface SkillInfo {
    id: string;
    name: string;
    path: string;
    isBuiltin: boolean;
}

interface ToolPermission {
    tool: string;
    pathPattern?: string;
    grantedAt: number;
}

interface TrustedHubProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
}

const TrustedHubPlaceholder = ({ title, description, icon }: TrustedHubProps) => (
    <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg opacity-60 mb-6">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {icon ? (
                    <div className="text-stone-500">{icon}</div>
                ) : (
                    <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-stone-700">{title}</p>
                <p className="text-xs text-stone-400">{description}</p>
            </div>
        </div>
        <span className="text-xs text-stone-400 px-2 py-1 bg-stone-100 rounded">
            开发中
        </span>
    </div>
);

export function SettingsView({ onClose }: SettingsViewProps) {
    // ... (state code matches existing)
    const [config, setConfig] = useState<Config>({
        apiKey: '',
        apiUrl: 'https://api.minimaxi.com/anthropic',
        model: 'MiniMax-M2.1',
        authorizedFolders: [],
        networkAccess: false,
        shortcut: 'Alt+Space'
    });
    // ... (other state hooks)
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'api' | 'folders' | 'mcp' | 'skills' | 'advanced'>('api');
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // MCP State
    const [mcpConfig, setMcpConfig] = useState('');
    const [mcpSaved, setMcpSaved] = useState(false);

    // Skills State
    const [skills, setSkills] = useState<SkillInfo[]>([]);
    const [editingSkill, setEditingSkill] = useState<string | null>(null);
    const [viewingSkill, setViewingSkill] = useState<boolean>(false);
    const [showSkillEditor, setShowSkillEditor] = useState(false);

    // Permissions State
    const [permissions, setPermissions] = useState<ToolPermission[]>([]);

    // ... (keep all helper functions)

    const loadPermissions = () => {
        window.ipcRenderer.invoke('permissions:list').then(list => setPermissions(list as ToolPermission[]));
    };

    const revokePermission = async (tool: string, pathPattern?: string) => {
        await window.ipcRenderer.invoke('permissions:revoke', { tool, pathPattern });
        loadPermissions();
    };

    const clearAllPermissions = async () => {
        if (confirm('确定要清除所有已授权的权限吗？')) {
            await window.ipcRenderer.invoke('permissions:clear');
            loadPermissions();
        }
    };

    useEffect(() => {
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            if (cfg) setConfig(cfg as Config);
        });
    }, []);

    useEffect(() => {
        if (activeTab === 'mcp') {
            window.ipcRenderer.invoke('mcp:get-config').then(cfg => setMcpConfig(cfg as string));
        } else if (activeTab === 'skills') {
            refreshSkills();
        } else if (activeTab === 'advanced') {
            loadPermissions();
        }
    }, [activeTab]);

    const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        const key = e.key;
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            const normalizedKey = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
            parts.push(normalizedKey);
        }

        const isFunctionKey = /^F\d{1,2}$/.test(parts[parts.length - 1] || '');
        if (parts.length >= 1 && (isFunctionKey || parts.length >= 2)) {
            const newShortcut = parts.join('+');
            setConfig({ ...config, shortcut: newShortcut });
            setIsRecordingShortcut(false);
            window.ipcRenderer.invoke('shortcut:update', newShortcut);
        }
    };

    const refreshSkills = () => {
        window.ipcRenderer.invoke('skills:list').then(list => setSkills(list as SkillInfo[]));
    };

    const handleSave = async () => {
        await window.ipcRenderer.invoke('config:set-all', config);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 800);
    };

    const saveMcpConfig = async () => {
        try {
            JSON.parse(mcpConfig);
            await window.ipcRenderer.invoke('mcp:save-config', mcpConfig);
            setMcpSaved(true);
            setTimeout(() => setMcpSaved(false), 2000);
        } catch (e) {
            alert('Invalid JSON configuration');
        }
    };

    const deleteSkill = async (filename: string) => {
        if (confirm(`确定要删除技能 "${filename}" 吗？`)) {
            await window.ipcRenderer.invoke('skills:delete', filename);
            refreshSkills();
        }
    };

    const addFolder = async () => {
        const result = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        if (result && !config.authorizedFolders.includes(result)) {
            setConfig({ ...config, authorizedFolders: [...config.authorizedFolders, result] });
        }
    };

    const removeFolder = (folder: string) => {
        setConfig({ ...config, authorizedFolders: config.authorizedFolders.filter(f => f !== folder) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0">
                    <h2 className="text-lg font-semibold text-stone-800">设置</h2>
                    <div className="flex items-center gap-2">
                        {activeTab === 'api' || activeTab === 'folders' || activeTab === 'advanced' ? (
                            <button
                                onClick={handleSave}
                                disabled={saved}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${saved
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                    }`}
                            >
                                {saved ? <Check size={14} /> : null}
                                {saved ? '已保存' : '保存'}
                            </button>
                        ) : null}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-stone-100 overflow-x-auto shrink-0">
                    {[
                        { id: 'api' as const, label: '通用', icon: <Settings size={14} /> },
                        { id: 'folders' as const, label: '权限', icon: <FolderOpen size={14} /> },
                        { id: 'mcp' as const, label: 'MCP', icon: <Server size={14} /> },
                        { id: 'skills' as const, label: 'Skills', icon: <Zap size={14} /> },
                        { id: 'advanced' as const, label: '高级', icon: <Settings size={14} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                                }`}
                        >
                            {/*tab.icon*/}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 bg-stone-50/30 flex flex-col">
                    <div className={`p-5 min-h-0 ${['mcp', 'skills'].includes(activeTab) ? 'flex-1 flex flex-col' : 'space-y-5'}`}>
                        {activeTab === 'api' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1.5">API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            value={config.apiKey}
                                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                            placeholder="sk-..."
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-9"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                                            title={showApiKey ? "隐藏" : "显示"}
                                        >
                                            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1.5">API URL</label>
                                    <input
                                        type="text"
                                        value={config.apiUrl}
                                        onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                                        placeholder="https://api.anthropic.com"
                                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1.5">模型名称</label>
                                    <input
                                        type="text"
                                        value={config.model}
                                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                        placeholder="glm-4.7"
                                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    />
                                    <p className="text-xs text-stone-400 mt-1">输入模型名称，如 MiniMax-M2.1</p>
                                </div>
                            </>
                        )}

                        {activeTab === 'folders' && (
                            <>
                                <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-xs">
                                    出于安全考虑，AI 只能访问以下授权的文件夹及其子文件夹。
                                </div>

                                {config.authorizedFolders.length === 0 ? (
                                    <div className="text-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                                        <p className="text-sm">暂无授权文件夹</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {config.authorizedFolders.map((folder, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FolderOpen size={16} className="text-stone-400 shrink-0" />
                                                    <span className="text-sm font-mono text-stone-600 truncate">
                                                        {folder}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeFolder(folder)}
                                                    className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={addFolder}
                                    className="w-full py-2.5 border border-dashed border-stone-300 text-stone-500 hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={16} />
                                    添加文件夹
                                </button>
                            </>
                        )}

                        {activeTab === 'mcp' && (
                            <div className="h-full flex flex-col">
                                <TrustedHubPlaceholder
                                    title="OpenCowork Hub"
                                    description="可信的 MCP 服务"
                                />
                                <div className="flex items-center justify-between mb-2 shrink-0">
                                    <span
                                        onClick={() => window.ipcRenderer.invoke('mcp:open-config-folder')}
                                        className="text-xs font-medium text-orange-500 hover:text-orange-600 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                                        title="点击打开配置文件所在文件夹"
                                    >
                                        mcp.json 配置
                                    </span>
                                    <button
                                        onClick={saveMcpConfig}
                                        className={`text-xs px-2 py-1 rounded transition-colors ${mcpSaved ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                            }`}
                                    >
                                        {mcpSaved ? '已保存' : '保存配置'}
                                    </button>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0">
                                    <textarea
                                        value={mcpConfig}
                                        onChange={(e) => setMcpConfig(e.target.value)}
                                        className="w-full flex-1 bg-white border border-stone-200 rounded-lg p-3 font-mono text-xs focus:outline-none focus:border-orange-500 resize-none text-stone-700 mb-2"
                                        placeholder='{ "mcpServers": { ... } }'
                                        spellCheck={false}
                                    />
                                    <p className="text-[10px] text-stone-400 shrink-0 mb-0">
                                        配置将保存在 ~/.opencowork/mcp.json。请确保 JSON 格式正确。
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'skills' && (
                            <div className="h-full flex flex-col">
                                <TrustedHubPlaceholder
                                    title="OpenCowork Hub"
                                    description="可信的 AI 技能"
                                />
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <p className="text-sm text-stone-500">自定义 AI 技能</p>
                                    <button
                                        onClick={() => {
                                            setEditingSkill(null);
                                            setShowSkillEditor(true);
                                        }}
                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                    >
                                        <Plus size={12} />
                                        新建技能
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1">
                                    {skills.length === 0 ? (
                                        <div className="text-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                                            <p className="text-sm">暂无技能</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {skills.map((skill) => (
                                                <div
                                                    key={skill.id}
                                                    className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg hover:border-orange-200 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${skill.isBuiltin ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                                                            <Zap size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-stone-700">{skill.name}</p>
                                                                {skill.isBuiltin && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-full font-medium">内置</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-stone-400 font-mono truncate max-w-xs">{skill.path}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingSkill(skill.id);
                                                                setViewingSkill(skill.isBuiltin); // Set view-only if built-in
                                                                setShowSkillEditor(true);
                                                            }}
                                                            className="p-1.5 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                                            title={skill.isBuiltin ? "查看" : "编辑"}
                                                        >
                                                            {skill.isBuiltin ? <Eye size={14} /> : <Edit2 size={14} />}
                                                        </button>
                                                        {!skill.isBuiltin && (
                                                            <button
                                                                onClick={() => deleteSkill(skill.id)}
                                                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                                title="删除"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <>
                                <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg opacity-60">
                                    <div>
                                        <p className="text-sm font-medium text-stone-700">浏览器操作</p>
                                        <p className="text-xs text-stone-400">允许 AI 操作浏览器（开发中）</p>
                                    </div>
                                    <button
                                        disabled
                                        className="w-10 h-6 rounded-full bg-stone-200 cursor-not-allowed"
                                    >
                                        <div className="w-4 h-4 rounded-full bg-white shadow mx-1 translate-x-0" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-stone-700">快捷键</p>
                                        <p className="text-xs text-stone-400">{config.shortcut} 呼出悬浮球</p>
                                    </div>
                                    {isRecordingShortcut ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            className="px-3 py-1.5 text-sm border border-orange-400 rounded-lg bg-orange-50 text-orange-600 font-medium outline-none animate-pulse"
                                            placeholder="按下快捷键..."
                                            onKeyDown={handleShortcutKeyDown}
                                            onBlur={() => setIsRecordingShortcut(false)}
                                            readOnly
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setIsRecordingShortcut(true)}
                                            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600"
                                        >
                                            {config.shortcut}
                                        </button>
                                    )}
                                </div>

                                {/* Permissions Management */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-stone-700">已授权的权限</p>
                                    {permissions.length === 0 ? (
                                        <p className="text-xs text-stone-400 p-3 bg-stone-50 rounded-lg">暂无已保存的权限</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {permissions.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-mono text-stone-700">{p.tool}</p>
                                                        <p className="text-xs text-stone-400 break-all">{p.pathPattern === '*' ? '所有路径' : p.pathPattern}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => revokePermission(p.tool, p.pathPattern)}
                                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        撤销
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={clearAllPermissions}
                                                className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                            >
                                                清除所有权限
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Skill Editor Modal */}
            {showSkillEditor && (
                <SkillEditor
                    filename={editingSkill}
                    readOnly={viewingSkill}
                    onClose={() => {
                        setShowSkillEditor(false);
                        setViewingSkill(false);
                    }}
                    onSave={refreshSkills}
                />
            )}
        </div>
    );
}
