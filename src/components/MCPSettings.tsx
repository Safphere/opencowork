import { useState, useEffect } from 'react';
import {
    Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, Terminal,
    Loader2, Settings2, FolderOpen, ChevronDown
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useI18n } from '../i18n/I18nContext';

interface MCPServerConfig {
    name: string;
    type?: 'stdio' | 'sse' | 'http';
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    env?: Record<string, string>;
    disabled?: boolean;
    source?: 'builtin' | 'user';
}

interface MCPStatus {
    name: string;
    status: 'connected' | 'connecting' | 'error' | 'stopped';
    error?: string;
    config: MCPServerConfig;
}

// --- Presets Definition ---
// --- Presets Definition Removed (Now Built-in via Backend) ---


interface MCPSettingsProps {
    config?: any;
}

export function MCPSettings({ config: _config }: MCPSettingsProps) {
    const { t } = useI18n();
    const [servers, setServers] = useState<MCPStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Add Mode State
    const [jsonInput, setJsonInput] = useState('');
    const [parsedConfigs, setParsedConfigs] = useState<MCPServerConfig[] | null>(null);

    // Validation State
    const [showBuiltin, setShowBuiltin] = useState(true);
    const [validationStep, setValidationStep] = useState<'idle' | 'validating' | 'done'>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);

    const [editingServer, setEditingServer] = useState<string | null>(null);

    useEffect(() => {
        loadServers();
        const timer = setInterval(loadServers, 5000);
        return () => clearInterval(timer);
    }, []);

    const loadServers = async () => {
        const list = await window.ipcRenderer.invoke('mcp:get-all');
        if (Array.isArray(list)) {
            setServers(list as MCPStatus[]);
        }
    };

    const handleToggle = async (name: string, currentDisabled: boolean) => {
        // Optimistic Update
        setServers(prev => prev.map(s => s.name === name ? { ...s, status: 'connecting', config: { ...s.config, disabled: !currentDisabled } } : s));
        // Fix: If currentDisabled is true, we want to Enable it (enabled=true). So pass currentDisabled directly.
        await window.ipcRenderer.invoke('mcp:toggle-server', name, currentDisabled);
        loadServers();
    };



    const handleDelete = async (name: string) => {
        if (confirm(`${t('confirmDeleteMCP')} ${name}?`)) {
            await window.ipcRenderer.invoke('mcp:remove-server', name);
            loadServers();
        }
    };

    const startAdd = () => {
        setIsAdding(true);
        setEditingServer(null);
        setValidationStep('idle');
        setValidationError(null);
        setJsonInput('');
        setParsedConfigs(null);
    };

    const handleEdit = (server: MCPStatus) => {
        setIsAdding(true);
        setEditingServer(server.name);
        setValidationStep('idle');
        setValidationError(null);
        // Pretty print JSON for editing
        const configToEdit = { ...server.config };
        setJsonInput(JSON.stringify(configToEdit, null, 2));
        // Auto-analyze since it's valid
        setParsedConfigs([configToEdit]);
    };

    const handleAnalyze = async () => {
        setValidationError(null);
        setValidationStep('validating');

        try {
            // Use Backend "Agent" Parser (Robust & Standardized)
            const configs = await window.ipcRenderer.invoke('mcp:analyze-config', jsonInput) as MCPServerConfig[];

            if (configs && configs.length > 0) {
                setParsedConfigs(configs);
                setValidationStep('idle');
                setValidationStep('idle');
            } else {
                throw new Error(t('invalidConfig'));
            }
        } catch (e: any) {
            setValidationStep('idle');
            setValidationError(e.message || t('parseFailed'));
        }
    };

    const handleBatchAdd = async () => {
        if (!parsedConfigs) return;
        setValidationError(null);
        setLoading(true);

        try {
            for (const config of parsedConfigs) {
                const configPayload = JSON.stringify(config);
                await window.ipcRenderer.invoke('mcp:add-server', configPayload);
            }

            setValidationStep('done');
            await new Promise(r => setTimeout(r, 500));
            setIsAdding(false);
            setEditingServer(null);
            loadServers();
        } catch (e: any) {
            setValidationError(e.message || t('importFailed'));
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: MCPStatus['status']) => {
        switch (status) {
            case 'connected': return 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-sm';
            case 'connecting': return 'text-blue-700 bg-blue-50 border-blue-200';
            case 'error': return 'text-red-700 bg-red-50 border-red-200';
            case 'stopped': return 'text-stone-500 bg-stone-100 border-stone-200';
            default: return 'text-stone-500 bg-stone-100 border-stone-200';
        }
    };

    const openConfigFolder = () => {
        window.ipcRenderer.invoke('mcp:open-config-folder');
    };

    return (
        <div className="h-full flex flex-col relative">
            {/* Header / Hub Card */}
            <div className="shrink-0">
                {/* Trusted Hub Card - Consistent Premium Style */}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg opacity-80 hover:opacity-100 transition-opacity mb-6 group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
                            <img src={logo} alt="Logo" className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-stone-700 dark:text-zinc-100">{t('openCoworkHub')}</p>
                            <p className="text-xs text-stone-400 dark:text-zinc-500">{t('trustedMCPServices')}</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 px-2 py-0.5 bg-stone-100 dark:bg-zinc-800 rounded border border-transparent dark:border-zinc-700/50">
                        {t('inDevelopment')}
                    </span>
                </div>

                <div className="flex items-center justify-between mb-3 shrink-0">
                    <p className="text-sm text-stone-500 dark:text-muted-foreground">{t('serviceManagement')}</p>
                    <button
                        onClick={startAdd}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                        <Plus size={12} />
                        {t('addService')}
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {servers.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                        <div className="w-16 h-16 rounded-2xl bg-stone-50 dark:bg-zinc-900 border-2 border-dashed border-stone-200 dark:border-zinc-800 flex items-center justify-center text-stone-300 dark:text-zinc-700 mb-4 shadow-sm">
                            <Plus size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-stone-900 dark:text-zinc-200 font-medium text-sm mb-1">{t('noMCPServices')}</h3>
                        <p className="text-stone-400 dark:text-zinc-500 text-xs max-w-[200px] leading-relaxed">
                            {t('addServiceHint')}
                        </p>
                    </div>
                )}

                {/* Custom Servers */}
                {servers
                    .filter(s => s.config.source !== 'builtin')
                    .sort((a, b) => (Number(a.config.disabled || 0) - Number(b.config.disabled || 0)))
                    .map((server) => {
                        const isDisabled = !!server.config.disabled;
                        return (
                            <div
                                key={server.name}
                                onClick={() => handleEdit(server)}
                                className={`group relative p-3 rounded-lg border transition-all duration-300 cursor-pointer ${isDisabled ? 'border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/30' : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-orange-200 dark:hover:border-zinc-600'}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    {/* Left: Icon & Info */}
                                    <div className={`flex items-center gap-3 min-w-0 flex-1 transition-opacity duration-300 ${isDisabled ? 'opacity-60 grayscale' : 'opacity-100'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${server.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : isDisabled ? 'bg-stone-200 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                                            {server.name.substring(0, 1).toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-medium text-stone-700 dark:text-zinc-200 truncate">{server.name}</h4>
                                                {!isDisabled && (
                                                    <div className={`flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${getStatusColor(server.status)}`}>
                                                        {server.status === 'connected' ? t('active') :
                                                            server.status === 'error' ? t('error') :
                                                                server.status === 'connecting' ? t('booting') : t('stopped')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center text-[10px] text-stone-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                                                <Terminal size={10} className="mr-1 shrink-0" />
                                                <span className="truncate opacity-80">{server.config.command} {(server.config.args || []).join(' ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Controls (Stop Propagation) */}
                                    <div className="flex items-center gap-2 pl-2" onClick={(e) => e.stopPropagation()}>
                                        {/* Toggle */}
                                        <label className="flex items-center cursor-pointer relative group/switch tool-tip" title={isDisabled ? t('clickToEnable') : t('clickToDisable')}>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={!isDisabled}
                                                onChange={() => handleToggle(server.name, isDisabled)}
                                            />
                                            <div className={`w-9 h-5 bg-stone-200 dark:bg-zinc-700 rounded-full shadow-inner transition-all duration-300 ${!isDisabled ? 'bg-orange-500 dark:bg-orange-600' : 'bg-stone-200 dark:bg-zinc-700 hover:bg-stone-300 dark:hover:bg-zinc-600'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${!isDisabled ? 'translate-x-[16px]' : 'translate-x-0'}`}>
                                                {!isDisabled && <CheckCircle size={10} className="text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />}
                                            </div>
                                        </label>

                                        {/* Delete (Only for user added) */}
                                        {server.config.source !== 'builtin' && (
                                            <button
                                                onClick={() => handleDelete(server.name)}
                                                className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded transition-all"
                                                title={t('removeService')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Error Details (Only when Active & Error) */}
                                {server.status === 'error' && server.error && !isDisabled && (
                                    <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/20 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                                        <div className="font-semibold flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            <span>{t('startLogicFailed')}</span>
                                        </div>
                                        <code className="font-mono break-all opacity-80">{server.error}</code>

                                        {/* Auto-Guide for Missing Key */}
                                        {server.error.includes("Missing API Key") && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Ideally switch to 'api' tab.
                                                    // But we are inside MCPSettings which is inside SettingsView.
                                                    // We don't have direct control to switch activeTab parent state easily without prop callback.
                                                    // For now, simple alert or if we are clever, find the 'Settings' tab button.
                                                    // Actually, 'config' prop is passed, but no 'setActiveTab'.
                                                    // Let's assume user knows where to go, or we dispatch a custom event.
                                                    document.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'api' }));
                                                }}
                                                className="mt-1 self-start px-2 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 rounded text-[10px] font-medium transition-colors"
                                            >
                                                {'配置API密钥'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                {/* Built-in Servers Section */}
                {servers.some(s => s.config.source === 'builtin') && (
                    <div className="mt-1">
                        {/* Section Header */}
                        <div
                            onClick={() => setShowBuiltin(!showBuiltin)}
                            className="flex items-center gap-2 px-1 py-2 cursor-pointer group select-none"
                        >
                            <div className={`p-0.5 rounded transition-colors text-stone-400 dark:text-zinc-500 group-hover:text-stone-600 dark:group-hover:text-zinc-300 ${!showBuiltin ? '-rotate-90' : 'rotate-0'} transform duration-200`}>
                                <ChevronDown size={14} />
                            </div>
                            <span className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider group-hover:text-stone-600 dark:group-hover:text-zinc-300 transition-colors">
                                {t('builtinServices') || 'Built-in Services'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500 rounded-full ml-auto">
                                {servers.filter(s => s.config.source === 'builtin').length}
                            </span>
                        </div>

                        {showBuiltin && (
                            <div className="space-y-2 mt-2">
                                {servers
                                    .filter(s => s.config.source === 'builtin')
                                    .sort((a, b) => (Number(a.config.disabled || 0) - Number(b.config.disabled || 0)))
                                    .map((server) => {
                                        const isDisabled = !!server.config.disabled;
                                        return (
                                            <div
                                                key={server.name}
                                                onClick={() => handleEdit(server)}
                                                className={`group relative p-3 rounded-lg border transition-all duration-300 cursor-pointer ${isDisabled ? 'border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/30' : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-orange-200 dark:hover:border-zinc-600'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    {/* Left: Icon & Info */}
                                                    <div className={`flex items-center gap-3 min-w-0 flex-1 transition-opacity duration-300 ${isDisabled ? 'opacity-60 grayscale' : 'opacity-100'}`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${server.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : isDisabled ? 'bg-stone-200 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                                                            {server.name.substring(0, 1).toUpperCase()}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-medium text-stone-700 dark:text-zinc-200 truncate">{server.name}</h4>
                                                                {!isDisabled && (
                                                                    <div className={`flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${getStatusColor(server.status)}`}>
                                                                        {server.status === 'connected' ? t('active') :
                                                                            server.status === 'error' ? t('error') :
                                                                                server.status === 'connecting' ? t('booting') : t('stopped')}
                                                                    </div>
                                                                )}
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 rounded-full font-medium shrink-0 ml-auto">{t('builtIn') || 'Built-in'}</span>
                                                            </div>
                                                            <div className="flex items-center text-[10px] text-stone-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                                                                <Terminal size={10} className="mr-1 shrink-0" />
                                                                <span className="truncate opacity-80">{server.config.command} {(server.config.args || []).join(' ')}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Controls (Stop Propagation) */}
                                                    <div className="flex items-center gap-2 pl-2" onClick={(e) => e.stopPropagation()}>
                                                        {/* Toggle */}
                                                        <label className="flex items-center cursor-pointer relative group/switch tool-tip" title={isDisabled ? t('clickToEnable') : t('clickToDisable')}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={!isDisabled}
                                                                onChange={() => handleToggle(server.name, !!server.config.disabled)}
                                                            />
                                                            <div className={`w-9 h-5 rounded-full transition-colors duration-300 ${!isDisabled ? 'bg-orange-500' : 'bg-stone-200 dark:bg-zinc-700'}`}>
                                                                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${!isDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Sticky Config Folder Link */}
            <div className="pt-0 pb-1 shrink-0 flex justify-center border-t border-transparent relative z-10">
                <button
                    onClick={openConfigFolder}
                    className="flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors bg-stone-50 hover:bg-stone-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-full border border-stone-100 hover:border-stone-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                    <FolderOpen size={10} />
                    {t('openMCPConfigFolder')}
                </button>
            </div>

            {
                (isAdding || editingServer) && (
                    <div
                        className="absolute inset-0 z-50 bg-white dark:bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Clean & Minimal */}
                        <div className="px-5 py-3 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-950">
                            <div>
                                <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                                    {editingServer ? <Settings2 size={18} className="text-indigo-600 dark:text-indigo-400" /> : <Plus size={18} className="text-stone-900 dark:text-zinc-100" />}
                                    {editingServer ? t('editService') : t('importNewService')}
                                </h3>
                                <p className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5 leading-relaxed">
                                    {editingServer ? t('modifyServiceParams') : t('mcpConfigHint')}
                                </p>
                            </div>
                            {/* Status / Tools */}
                            <div className="flex items-center gap-3">
                                {parsedConfigs && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 px-2.5 py-1 rounded-full">
                                        <CheckCircle size={10} strokeWidth={3} />
                                        {t('ready')}
                                    </span>
                                )}
                                {jsonInput && (
                                    <button
                                        onClick={() => { setJsonInput(''); setParsedConfigs(null); setValidationError(null); }}
                                        className="text-xs font-medium text-stone-400 hover:text-stone-600 px-2 py-1 hover:bg-stone-50 rounded transition-colors"
                                    >
                                        {t('clear')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content - Spacious Editor */}
                        <div className="flex-1 overflow-hidden flex flex-col">

                            {/* Main Editor Area */}
                            <div className="flex-1 flex flex-col p-3 bg-stone-50/30 dark:bg-zinc-900/50">
                                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-xl border border-stone-200 dark:border-zinc-800 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-stone-900/5 dark:focus-within:ring-white/10 transition-all">
                                    {/* Editor Toolbar */}
                                    <div className="flex items-center justify-between px-4 py-2 bg-stone-50 dark:bg-zinc-900 border-b border-stone-100 dark:border-zinc-800">
                                        <span className="text-[10px] font-mono font-medium text-stone-400 dark:text-muted-foreground">config.json / command</span>
                                        <div className="flex gap-1.5 opacity-50">
                                            <div className="w-2.5 h-2.5 rounded-full bg-stone-300 dark:bg-stone-600"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-stone-300 dark:bg-stone-600"></div>
                                        </div>
                                    </div>

                                    {/* Textarea */}
                                    <div className="flex-1 relative">
                                        <textarea
                                            value={jsonInput}
                                            onChange={(e) => {
                                                setJsonInput(e.target.value);
                                                if (validationStep === 'idle' && (parsedConfigs || validationError)) {
                                                    setParsedConfigs(null);
                                                    setValidationError(null);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none text-stone-700 dark:text-zinc-200 placeholder:text-stone-300 dark:placeholder:text-zinc-600 custom-scrollbar bg-transparent"
                                            placeholder={`// 示例：\n{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]\n    }\n  }\n}`}
                                            spellCheck={false}
                                        />

                                        {/* Floating Status Indications */}
                                        <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-2">
                                            {validationStep === 'validating' && (
                                                <div className="bg-stone-900/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-2">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    <span>{t('parsing')}</span>
                                                </div>
                                            )}
                                            {validationError && (
                                                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100 shadow-sm max-w-xs break-all animate-in slide-in-from-bottom-2 flex items-start gap-2">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                    {validationError}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Parsed Preview */}
                                {parsedConfigs && (
                                    <div className="mt-2 shrink-0 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                            {parsedConfigs.map((config, idx) => (
                                                <div key={idx} className="flex-none flex items-center gap-3 px-3 py-2 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg">
                                                    <div className="w-6 h-6 rounded bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 flex items-center justify-center text-[10px] font-bold">
                                                        MCP
                                                    </div>
                                                    <div className="flex flex-col min-w-[100px]">
                                                        <span className="font-bold text-stone-700 dark:text-zinc-200 text-xs">{config.name}</span>
                                                    </div>
                                                    <CheckCircle size={14} className="text-orange-500 dark:text-orange-400 ml-2" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Footer - Sticky Bottom */}
                        <div className="px-5 py-3 border-t border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-end gap-3 shrink-0">
                            <button
                                onClick={() => { setIsAdding(false); setEditingServer(null); }}
                                className="px-4 py-1.5 text-stone-500 hover:text-stone-800 font-medium text-xs hover:bg-stone-50 rounded-lg transition-colors"
                            >
                                {t('cancel')}
                            </button>

                            {!parsedConfigs ? (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading || !jsonInput.trim()}
                                    className="px-4 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg shadow-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    <RefreshCw size={12} className={loading || validationStep === 'validating' ? "animate-spin" : ""} />
                                    {t('smartParse')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleBatchAdd}
                                    disabled={loading}
                                    className="px-5 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg shadow-sm hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                    {editingServer ? t('saveChanges') : t('confirmAdd')}
                                </button>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}
