import { useState, useEffect, useRef } from 'react';
import { X, Settings, FolderOpen, Server, Check, Plus, Trash2, Edit2, Zap, Eye, EyeOff, ExternalLink, AlertTriangle, ChevronDown, Loader2, Activity, Info, Shield } from 'lucide-react';

import logo from '../assets/logo.png';
import logoGlm from '../assets/logo-glm.png';
import logoZai from '../assets/logo-zai.svg';
import logoMinimaxCn from '../assets/logo-minimax-cn.png';
import logoMinimaxIntl from '../assets/logo-minimax-intl.png';
import { SkillEditor } from './SkillEditor';
import { MCPSettings } from './MCPSettings';
import { MemorySettings } from './MemorySettings';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { logger } from '../services/logger';

interface SettingsViewProps {
    onClose: () => void;
}

interface ProviderConfig {
    id: string;
    name: string;
    apiKey: string;
    apiUrl: string;
    model: string;
    maxTokens?: number;
    isCustom?: boolean;
    readonlyUrl?: boolean;
}

interface Config {
    // Multi-Provider
    activeProviderId: string;
    providers: Record<string, ProviderConfig>;

    // Global
    authorizedFolders: FolderAuth[];
    networkAccess: boolean;
    shortcut: string;
}

interface FolderAuth {
    path: string;
    trustLevel: 'strict' | 'standard' | 'trust';
    addedAt: number;
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
    className?: string; // Support custom spacing
}

const TrustedHubPlaceholder = ({ title, description, icon, className }: TrustedHubProps) => (
    <div className={`flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg opacity-80 hover:opacity-100 transition-opacity mb-6 group ${className || ''}`}>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
                {icon ? (
                    <div className="text-stone-500 dark:text-zinc-400">{icon}</div>
                ) : (
                    <img src={logo} alt="Logo" className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-stone-700 dark:text-zinc-100">{title}</p>
                <p className="text-xs text-stone-400 dark:text-zinc-500">{description}</p>
            </div>
        </div>
        <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 px-2 py-0.5 bg-stone-100 dark:bg-zinc-800 rounded border border-transparent dark:border-zinc-700/50">
            开发中
        </span>
    </div>
);

const PROVIDER_MODELS: Record<string, string[]> = {
    'glm': ['glm-4.7', 'glm-4.6'],
    'zai': ['glm-4.7', 'glm-4.6'],
    'minimax_cn': ['MiniMax-M2.1'],
    'minimax_intl': ['MiniMax-M2.1'],
    'custom': []
};

const OFFICIAL_URLS: Record<string, string> = {
    'glm': 'https://www.bigmodel.cn/glm-coding?ic=QBPPSNQ5JT',
    'zai': 'https://z.ai/subscribe?ic=9GTHAGUUX1',
    'minimax_cn': 'https://platform.minimaxi.com/subscribe/coding-plan?code=HhNfBTQDNq&source=link',
    'minimax_intl': 'https://platform.minimax.io/subscribe/coding-plan?code=DQlmOtIjX6&source=link'
};

const ProviderLogo = ({ id, name }: { id: string, name: string }) => {
    if (id === 'custom') {
        return <img src={logo} alt="Custom" className="w-5 h-5 object-contain" />;
    }

    const logos: Record<string, string> = {
        'glm': logoGlm,
        'zai': logoZai,
        'minimax_cn': logoMinimaxCn,
        'minimax_intl': logoMinimaxIntl
    };

    if (logos[id]) {
        return <img src={logos[id]} alt={name} className="w-5 h-5 object-cover rounded-sm" />;
    }

    // Fallback
    const colors: Record<string, string> = {
        'glm': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        'zai': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        'minimax_cn': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        'minimax_intl': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    };
    return (
        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${colors[id] || 'bg-stone-100 text-stone-500 dark:bg-muted dark:text-muted-foreground'}`}>
            {name.substring(0, 1)}
        </div>
    );
};

export function SettingsView({ onClose }: SettingsViewProps) {
    const [isProviderOpen, setIsProviderOpen] = useState(false);

    const [config, setConfig] = useState<Config>({
        activeProviderId: 'minimax_intl',
        providers: {},
        authorizedFolders: [],
        networkAccess: false,
        shortcut: 'Alt+Space'
    });

    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const isFirstRender = useRef(true);
    // Track previous config to prevent redundant saves
    const prevConfigRef = useRef<string>('');
    const [activeTab, setActiveTab] = useState<'api' | 'folders' | 'memory' | 'mcp' | 'skills' | 'advanced' | 'about'>('api');
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [appInfo, setAppInfo] = useState<{ name: string; version: string; author: string; homepage: string } | null>(null);
    const [checkingUpdate, setCheckingUpdate] = useState(false);

    const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean, latestVersion: string, releaseUrl: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch app info
        window.ipcRenderer?.invoke('app:info').then(info => {
            setAppInfo(info as any);
        });

        // Removed silent update check on mount to improve performance
        // Updates should be checked in the About tab or manually
    }, []);

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        setUpdateInfo(null);
        try {
            const result = await window.ipcRenderer?.invoke('app:check-update') as any;
            if (result && result.success) {
                setUpdateInfo({
                    hasUpdate: result.hasUpdate,
                    latestVersion: result.latestVersion,
                    releaseUrl: result.releaseUrl
                });
            }
        } catch (error) {
            logger.error('Check update failed', error);
        } finally {
            setCheckingUpdate(false);
        }
    };

    // Reset test result when provider changes
    useEffect(() => {
        setTestResult(null);
    }, [config.activeProviderId]);

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        const providerId = config.activeProviderId;
        const providerConfig = config.providers[providerId];
        try {
            const result = await window.ipcRenderer.invoke('config:test-connection', {
                apiKey: providerConfig.apiKey,
                apiUrl: providerConfig.apiUrl,
                model: providerConfig.model
            });
            setTestResult(result as { success: boolean; message: string });
        } catch (e: any) {
            setTestResult({ success: false, message: e.message });
        } finally {
            setTesting(false);
        }
    };

    // Skills State
    const [skills, setSkills] = useState<SkillInfo[]>([]);
    const [editingSkill, setEditingSkill] = useState<string | null>(null);
    const [viewingSkill, setViewingSkill] = useState<boolean>(false);
    const [showSkillEditor, setShowSkillEditor] = useState(false);
    const [showBuiltinSkills, setShowBuiltinSkills] = useState(true);

    // Context Hooks
    const { theme: mode, setTheme: setMode } = useTheme();
    const { languageMode, setLanguageMode, t } = useI18n();

    // Permissions State
    const [permissions, setPermissions] = useState<ToolPermission[]>([]);

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

    // Listen for tab switch events
    useEffect(() => {
        const handleSwitch = (e: CustomEvent) => {
            const validTabs = ['api', 'folders', 'mcp', 'skills', 'advanced', 'about'];
            if (e.detail && validTabs.includes(e.detail)) {
                setActiveTab(e.detail as any);
            }
        };
        document.addEventListener('switch-settings-tab', handleSwitch as EventListener);
        return () => document.removeEventListener('switch-settings-tab', handleSwitch as EventListener);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            if (cfg) {
                const config = cfg as Config;
                // Ensure all providers are initialized, including custom
                const initializedProviders = { ...config.providers };
                if (!initializedProviders['custom']) {
                    initializedProviders['custom'] = {
                        id: 'custom',
                        name: '自定义',
                        apiKey: '',
                        apiUrl: '',
                        model: '',
                        isCustom: true
                    };
                }
                setConfig({ ...config, providers: initializedProviders });
                // Initialize baseline reference to avoid saving what we just loaded
                prevConfigRef.current = JSON.stringify({ ...config, providers: initializedProviders });
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        if (activeTab === 'skills') {
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

    // Initialize prevConfigRef when config is first loaded
    useEffect(() => {
        if (config && prevConfigRef.current === '') {
            prevConfigRef.current = JSON.stringify(config);
        }
    }, [config]);

    // Reusable save function with force option
    const saveConfig = async (cfg: Config, force: boolean = false) => {
        // Prevent saving if still loading or if config is empty/default
        if (isLoading) return;

        const currentConfigStr = JSON.stringify(cfg);
        if (!force && currentConfigStr === prevConfigRef.current) return;

        setIsSaving(true);
        setSaved(false);

        try {
            await window.ipcRenderer.invoke('config:set-all', cfg);
            prevConfigRef.current = currentConfigStr;
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            logger.error('Save failed:', err);
            setIsSaving(false);
        }
    };

    // Auto-save effect with reduced debounce
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            saveConfig(config);
        }, 500);

        return () => clearTimeout(timer);
    }, [config]);

    // Force save on blur/close - saves immediately
    const handleForceSave = async () => {
        await saveConfig(config, true);
    };

    // Force save when switching tabs
    useEffect(() => {
        handleForceSave();
    }, [activeTab]);

    const handleClose = async () => {
        // Force save before closing if pending
        if (JSON.stringify(config) !== prevConfigRef.current) {
            await saveConfig(config);
        }
        onClose();
    };

    const deleteSkill = async (filename: string) => {
        if (confirm(`确定要删除技能 "${filename}" 吗？`)) {
            await window.ipcRenderer.invoke('skills:delete', filename);
            refreshSkills();
        }
    };

    const addFolder = async () => {
        const result = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        if (result && !config.authorizedFolders.some(f => f.path === result)) {
            setConfig({
                ...config,
                authorizedFolders: [
                    ...config.authorizedFolders,
                    { path: result, trustLevel: 'strict', addedAt: Date.now() }
                ]
            });
        }
    };

    const removeFolder = (folderPath: string) => {
        setConfig({ ...config, authorizedFolders: config.authorizedFolders.filter(f => f.path !== folderPath) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-stone-200 dark:border-zinc-800 relative">

                {/* Loading Shield */}
                {isLoading && (
                    <div className="absolute inset-0 z-[60] bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                )}
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-zinc-800 shrink-0">
                    <h2 className="text-lg font-semibold text-stone-800 dark:text-zinc-100">{t('settings')}</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-2">
                            {isSaving && (
                                <span className="text-xs text-stone-400 dark:text-zinc-500 flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                                    <Loader2 size={12} className="animate-spin" />
                                    {t('saving') || 'Saving...'}
                                </span>
                            )}
                            {saved && !isSaving && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-1 duration-300 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                    <Check size={12} />
                                    {t('saved')}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-stone-100 dark:border-zinc-800 overflow-x-auto shrink-0">
                    {[
                        { id: 'api' as const, label: t('tabGeneral'), icon: <Settings size={14} /> },
                        { id: 'folders' as const, label: t('tabPermissions'), icon: <FolderOpen size={14} /> },
                        { id: 'memory' as const, label: t('memory'), icon: <Activity size={14} /> },
                        { id: 'mcp' as const, label: t('tabMCP'), icon: <Server size={14} /> },
                        { id: 'skills' as const, label: t('tabSkills'), icon: <Zap size={14} /> },
                        { id: 'advanced' as const, label: t('tabAdvanced'), icon: <Settings size={14} /> },
                        { id: 'about' as const, label: t('tabAbout'), icon: <Info size={14} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50 dark:bg-orange-500/10'
                                : 'text-stone-500 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-900/50'
                                }`}
                        >
                            {/*tab.icon*/}
                            {tab.label}
                            {tab.id === 'about' && updateInfo?.hasUpdate && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-0.5" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-0 overflow-y-auto flex-1 bg-stone-50/30 dark:bg-zinc-900/50 flex flex-col">
                    <div className={`min-h-0 ${['mcp', 'skills'].includes(activeTab) ? 'px-5 pt-5 pb-1 flex-1 flex flex-col' : 'p-5 space-y-5'}`}>
                        {activeTab === 'api' && (
                            <>
                                {/* Appearance Settings */}
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5">{t('language')}</label>
                                            <div className="relative">
                                                <select
                                                    value={languageMode}
                                                    onChange={(e) => setLanguageMode(e.target.value as any)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none"
                                                >
                                                    <option value="system">{t('system')}</option>
                                                    <option value="zh">{t('simplifiedChinese')}</option>
                                                    <option value="en">{t('english')}</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 dark:text-zinc-500">
                                                    <Settings size={14} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5">{t('theme')}</label>
                                            <div className="relative">
                                                <select
                                                    value={mode}
                                                    onChange={(e) => setMode(e.target.value as any)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none"
                                                >
                                                    <option value="system">{t('system')}</option>
                                                    <option value="light">{t('light')}</option>
                                                    <option value="dark">{t('dark')}</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 dark:text-zinc-500">
                                                    <Settings size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Provider Selection Custom Dropdown */}
                                <div className="mb-4 relative z-10">
                                    <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5">{t('providerSelection')}</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsProviderOpen(!isProviderOpen)}
                                            className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 flex items-center gap-2 text-left"
                                        >
                                            <ProviderLogo
                                                id={config.activeProviderId}
                                                name={config.providers[config.activeProviderId]?.name || 'Unknown'}
                                            />
                                            <span className="truncate">{config.providers[config.activeProviderId]?.name}</span>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 dark:text-zinc-500">
                                                <Server size={14} />
                                            </div>
                                        </button>

                                        {isProviderOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsProviderOpen(false)}
                                                />
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto py-1">
                                                    {Object.values(config.providers).map((provider) => (
                                                        <button
                                                            key={provider.id}
                                                            onClick={async () => {
                                                                // Force save current provider config before switching
                                                                await handleForceSave();
                                                                setConfig({ ...config, activeProviderId: provider.id });
                                                                setIsProviderOpen(false);
                                                            }}
                                                            className={`w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors ${config.activeProviderId === provider.id ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10' : 'text-stone-700 dark:text-zinc-300'}`}
                                                        >
                                                            <ProviderLogo id={provider.id} name={provider.name} />
                                                            <span className="truncate">{provider.name}</span>
                                                            {config.activeProviderId === provider.id && (
                                                                <Check size={14} className="ml-auto" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Config Form */}
                                {config.providers[config.activeProviderId] && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5">
                                                {t('apiUrl')}
                                            </label>
                                            <input
                                                type="text"
                                                value={config.providers[config.activeProviderId].apiUrl}
                                                onChange={(e) => {
                                                    const newProviders = { ...config.providers };
                                                    newProviders[config.activeProviderId] = {
                                                        ...newProviders[config.activeProviderId],
                                                        apiUrl: e.target.value
                                                    };
                                                    setConfig({ ...config, providers: newProviders });
                                                }}
                                                readOnly={config.providers[config.activeProviderId].readonlyUrl}
                                                onBlur={handleForceSave}
                                                className={`w-full border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${config.providers[config.activeProviderId].readonlyUrl ? 'bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-500 cursor-not-allowed' : 'bg-white dark:bg-zinc-900'}`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-1.5">{t('modelSelection')}</label>
                                            {config.activeProviderId === 'custom' ? (
                                                // Custom: Text Input
                                                <input
                                                    type="text"
                                                    value={config.providers[config.activeProviderId].model}
                                                    onChange={(e) => {
                                                        const newProviders = { ...config.providers };
                                                        newProviders[config.activeProviderId] = {
                                                            ...newProviders[config.activeProviderId],
                                                            model: e.target.value
                                                        };
                                                        setConfig({ ...config, providers: newProviders });
                                                    }}
                                                    placeholder={t('inputModelName')}
                                                    onBlur={handleForceSave}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                                />
                                            ) : (
                                                // Built-in: Dropdown
                                                <div className="relative">
                                                    <select
                                                        value={config.providers[config.activeProviderId].model}
                                                        onChange={(e) => {
                                                            const newProviders = { ...config.providers };
                                                            newProviders[config.activeProviderId] = {
                                                                ...newProviders[config.activeProviderId],
                                                                model: e.target.value
                                                            };
                                                            setConfig({ ...config, providers: newProviders });
                                                        }}
                                                        className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none"
                                                    >
                                                        {(PROVIDER_MODELS[config.activeProviderId] || []).map(model => (
                                                            <option key={model} value={model}>
                                                                {model}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 dark:text-zinc-500">
                                                        <Settings size={14} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-medium text-stone-500 dark:text-zinc-400">{t('apiKey')}</label>
                                                {OFFICIAL_URLS[config.activeProviderId] ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(OFFICIAL_URLS[config.activeProviderId], '_blank')}
                                                        className="flex items-center gap-1 text-[10px] text-orange-500 hover:text-orange-600 hover:underline transition-colors"
                                                    >
                                                        <span>{t('getApiKey') || '获取 Key'}</span>
                                                        <ExternalLink size={10} />
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400">
                                                        <AlertTriangle size={12} />
                                                        <span>{t('customKeyRisk') || '请确保使用可信的 API 服务'}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showApiKey ? "text" : "password"}
                                                    value={config.providers[config.activeProviderId].apiKey}
                                                    onChange={(e) => {
                                                        const newProviders = { ...config.providers };
                                                        newProviders[config.activeProviderId] = {
                                                            ...newProviders[config.activeProviderId],
                                                            apiKey: e.target.value
                                                        };
                                                        setConfig({ ...config, providers: newProviders });
                                                    }}
                                                    placeholder={t('apiKeyPlaceholder')}
                                                    onBlur={handleForceSave}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-9"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                    title={showApiKey ? t('hide') : t('show')}
                                                >
                                                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                                                        {t('maxTokens') || '最大 Token 数'}
                                                    </label>
                                                    <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                                                        {t('maxTokensDesc') || '默认 131072，根据 API 限制调整'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="200000"
                                                    value={config.providers[config.activeProviderId].maxTokens || 131072}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value) || 131072;
                                                        const newProviders = { ...config.providers };
                                                        newProviders[config.activeProviderId] = {
                                                            ...newProviders[config.activeProviderId],
                                                            maxTokens: value
                                                        };
                                                        setConfig({ ...config, providers: newProviders });
                                                    }}
                                                    onBlur={handleForceSave}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                                />
                                            </div>

                                            <div className="flex justify-end items-center gap-2 mt-2">
                                                {testResult && (
                                                    <span className={`text-xs ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {testResult.success
                                                            ? t('connectionSuccess')
                                                            : `${t('connectionFailed')}: ${testResult.message}`
                                                        }
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleTestConnection}
                                                    disabled={testing || !config.providers[config.activeProviderId].apiKey}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                                                    {t('testConnection') || '测试连接'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'folders' && (
                            <>
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg p-3 text-xs">
                                    {t('folderPermissionDesc') || 'AI can only access authorized folders for security.'}
                                </div>

                                {/* Trust Level Info Section - 3 Column Grid */}
                                <div className="mb-3">
                                    <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-2">{t('trustLevelInfo')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Strict Column */}
                                        <div className="p-3 bg-stone-50 dark:bg-zinc-800/50 rounded-lg border border-stone-200 dark:border-zinc-700">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Shield size={14} className="text-stone-400" />
                                                <span className="text-xs font-medium text-stone-600 dark:text-zinc-300">{t('trustStrict')}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-stone-400">{t('trustColRead')}/{t('trustColList')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-stone-400">{t('trustColWrite')}</span>
                                                    <span className="text-red-500 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-stone-400">{t('trustColSafeCmd')}</span>
                                                    <span className="text-red-500 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-stone-400">{t('trustColDangerCmd')}</span>
                                                    <span className="text-red-500 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Standard Column */}
                                        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-700/50">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Check size={14} className="text-amber-500" />
                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('trustStandard')}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-amber-600/70 dark:text-amber-400/70">{t('trustColRead')}/{t('trustColList')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-amber-600/70 dark:text-amber-400/70">{t('trustColWrite')}</span>
                                                    <span className="text-amber-600 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-amber-600/70 dark:text-amber-400/70">{t('trustColSafeCmd')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-amber-600/70 dark:text-amber-400/70">{t('trustColDangerCmd')}</span>
                                                    <span className="text-red-500 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trust Column */}
                                        <div className="p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-700/50">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Zap size={14} className="text-green-500" />
                                                <span className="text-xs font-medium text-green-700 dark:text-green-400">{t('trustTrust')}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-green-600/70 dark:text-green-400/70">{t('trustColRead')}/{t('trustColList')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-green-600/70 dark:text-green-400/70">{t('trustColWrite')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-green-600/70 dark:text-green-400/70">{t('trustColSafeCmd')}</span>
                                                    <span className="text-green-500 font-medium">{t('trustColAuto')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-green-600/70 dark:text-green-400/70">{t('trustColDangerCmd')}</span>
                                                    <span className="text-red-500 font-medium">{t('trustColConfirm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danger Warning */}
                                    <div className="mt-2 flex items-start gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                                        <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed">
                                            {t('trustDangerWarning')}
                                        </p>
                                    </div>
                                </div>

                                {config.authorizedFolders.length === 0 ? (
                                    <div className="text-center py-8 text-stone-400 dark:text-muted-foreground border-2 border-dashed border-stone-200 dark:border-border rounded-xl">
                                        <p className="text-sm">{t('noAuthorizedFolders') || 'No authorized folders'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {config.authorizedFolders.map((folder, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 bg-white dark:bg-zinc-900 border rounded-lg group transition-all ${
                                                    folder.trustLevel === 'trust'
                                                        ? 'border-green-300 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10'
                                                        : folder.trustLevel === 'strict'
                                                            ? 'border-stone-300 dark:border-zinc-600'
                                                            : 'border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FolderOpen size={16} className={
                                                            folder.trustLevel === 'trust' ? 'text-green-500 shrink-0' :
                                                            folder.trustLevel === 'strict' ? 'text-stone-400 shrink-0' :
                                                            'text-amber-500 shrink-0'
                                                        } />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-mono text-stone-600 dark:text-zinc-200 truncate block">
                                                                {folder.path}
                                                            </span>
                                                            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                                                                folder.trustLevel === 'trust' ? 'text-green-600 dark:text-green-400' :
                                                                folder.trustLevel === 'strict' ? 'text-stone-500 dark:text-zinc-400' :
                                                                'text-amber-600 dark:text-amber-400'
                                                            }`}>
                                                                {folder.trustLevel === 'trust' && <Zap size={10} />}
                                                                {folder.trustLevel === 'strict' && <Shield size={10} />}
                                                                {folder.trustLevel === 'standard' && <Check size={10} />}
                                                                {folder.trustLevel === 'trust' ? t('trustTrust') :
                                                                 folder.trustLevel === 'strict' ? t('trustStrict') :
                                                                 t('trustStandard')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Trust Level Pills */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {(['strict', 'standard', 'trust'] as const).map((level) => (
                                                            <button
                                                                key={level}
                                                                onClick={() => {
                                                                    const newFolders = [...config.authorizedFolders];
                                                                    newFolders[idx] = { ...folder, trustLevel: level };
                                                                    setConfig({ ...config, authorizedFolders: newFolders });
                                                                    window.ipcRenderer.invoke('folder:trust:set', {
                                                                        folderPath: folder.path,
                                                                        level
                                                                    });
                                                                }}
                                                                className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                                                                    folder.trustLevel === level
                                                                        ? level === 'trust' ? 'bg-green-500 text-white' :
                                                                          level === 'strict' ? 'bg-stone-500 text-white' :
                                                                          'bg-amber-500 text-white'
                                                                        : level === 'trust' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                                                          level === 'strict' ? 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400' :
                                                                          'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                                }`}
                                                            >
                                                                {level === 'strict' && <Shield size={10} className="inline mr-0.5" />}
                                                                {level === 'standard' && <Check size={10} className="inline mr-0.5" />}
                                                                {level === 'trust' && <Zap size={10} className="inline mr-0.5" />}
                                                                {level === 'strict' ? t('trustStrict') :
                                                                 level === 'standard' ? t('trustStandard') :
                                                                 t('trustTrust')}
                                                            </button>
                                                        ))}
                                                        <div className="w-px h-4 bg-stone-200 dark:bg-zinc-700 mx-1" />
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={() => removeFolder(folder.path)}
                                                            className="p-1.5 text-stone-300 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                            title={t('removeFolder') || 'Remove folder'}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={addFolder}
                                    className="w-full py-2.5 border border-dashed border-stone-300 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={16} />
                                    {t('addAuthorizedFolder')}
                                </button>
                            </>
                        )}

                        {activeTab === 'mcp' && (
                            <div className="h-full flex flex-col">
                                <MCPSettings config={config} />
                            </div>
                        )}

                        {activeTab === 'memory' && (
                            <div className="h-full flex flex-col overflow-hidden">
                                <MemorySettings onClose={onClose} />
                            </div>
                        )}

                        {activeTab === 'skills' && (
                            <div className="h-full flex flex-col">
                                <TrustedHubPlaceholder
                                    title={t('openCoworkHub')}
                                    description={t('trustedSkills')}
                                />
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <p className="text-sm text-stone-500 dark:text-muted-foreground">{t('customSkills')}</p>
                                    <button
                                        onClick={() => {
                                            setEditingSkill(null);
                                            setShowSkillEditor(true);
                                        }}
                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                    >
                                        <Plus size={12} />
                                        {t('newSkill')}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar space-y-2">
                                    {skills.length === 0 ? (
                                        <div className="text-center py-8 text-stone-400 dark:text-muted-foreground border-2 border-dashed border-stone-200 dark:border-border rounded-xl">
                                            <p className="text-sm">{t('noSkills')}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="grid grid-cols-1 gap-2">
                                                {/* Custom Skills */}
                                                {skills.filter(s => !s.isBuiltin).map((skill) => (
                                                    <div
                                                        key={skill.id}
                                                        className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg group hover:border-orange-200 dark:hover:border-zinc-700 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 flex items-center justify-center p-2 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 rounded-lg shrink-0">
                                                                <Zap size={16} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-medium text-stone-700 dark:text-zinc-100 truncate">{skill.name}</p>
                                                                </div>
                                                                <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono truncate max-w-xs">{skill.path}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSkill(skill.id);
                                                                    setViewingSkill(false);
                                                                    setShowSkillEditor(true);
                                                                }}
                                                                className="p-1.5 text-stone-400 dark:text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                                title={t('edit')}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteSkill(skill.id)}
                                                                className="p-1.5 text-stone-400 dark:text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                title={t('delete')}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Built-in Skills Section */}
                                                {skills.some(s => s.isBuiltin) && (
                                                    <div className="mt-1 border-t border-transparent">
                                                        <div
                                                            onClick={() => setShowBuiltinSkills(!showBuiltinSkills)}
                                                            className="flex items-center gap-2 px-1 py-2 cursor-pointer group select-none"
                                                        >
                                                            <div className={`p-0.5 rounded transition-colors text-stone-400 dark:text-zinc-500 group-hover:text-stone-600 dark:group-hover:text-zinc-300 ${!showBuiltinSkills ? '-rotate-90' : 'rotate-0'} transform duration-200`}>
                                                                <ChevronDown size={14} />
                                                            </div>
                                                            <span className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider group-hover:text-stone-600 dark:group-hover:text-zinc-300 transition-colors">
                                                                {t('builtinSkills') || 'Built-in Skills'}
                                                            </span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500 rounded-full ml-auto">
                                                                {skills.filter(s => s.isBuiltin).length}
                                                            </span>
                                                        </div>

                                                        {showBuiltinSkills && (
                                                            <div className="space-y-2 mt-1">
                                                                {skills.filter(s => s.isBuiltin).map((skill) => (
                                                                    <div
                                                                        key={skill.id}
                                                                        className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg group hover:border-orange-200 dark:hover:border-zinc-700 transition-colors grayscale opacity-80 hover:opacity-100"
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className="w-8 h-8 flex items-center justify-center p-2 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 rounded-lg shrink-0">
                                                                                <Zap size={16} />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="text-sm font-medium text-stone-700 dark:text-zinc-100 truncate">{skill.name}</p>
                                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 rounded-full font-medium shrink-0">{t('builtIn')}</span>
                                                                                </div>
                                                                                <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono truncate max-w-xs">{skill.path}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingSkill(skill.id);
                                                                                    setViewingSkill(true); // View only
                                                                                    setShowSkillEditor(true);
                                                                                }}
                                                                                className="p-1.5 text-stone-400 dark:text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                                                title={t('view')}
                                                                            >
                                                                                <Eye size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Open Folder Button */}
                                <div className="pt-0 pb-1 shrink-0 flex justify-center border-t border-transparent relative z-10">
                                    <button
                                        onClick={() => window.ipcRenderer.invoke('skills:open-folder')}
                                        className="flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors bg-stone-50 hover:bg-stone-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-full border border-stone-100 hover:border-stone-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                                    >
                                        <FolderOpen size={10} />
                                        {t('openSkillsFolder')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg transition-all hover:border-orange-200 dark:hover:border-zinc-700 opacity-60 hover:opacity-100 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
                                            <img src={logo} alt="Logo" className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-stone-700 dark:text-zinc-100">{t('browserAutomation')}</p>
                                            <p className="text-xs text-stone-400 dark:text-zinc-500">{t('browserAutomationDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        disabled
                                        className="w-10 h-6 rounded-full bg-stone-200 dark:bg-zinc-800 cursor-not-allowed border border-transparent dark:border-zinc-700"
                                    >
                                        <div className="w-4 h-4 rounded-full bg-white dark:bg-zinc-500 shadow mx-1 translate-x-0" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg transition-all hover:border-orange-200 dark:hover:border-zinc-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center p-2 bg-stone-100 dark:bg-zinc-800 rounded-lg text-stone-500 dark:text-zinc-400 shrink-0">
                                            <Settings size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-stone-700 dark:text-zinc-100">{t('shortcut')}</p>
                                            <p className="text-xs text-stone-400 dark:text-zinc-500">{config.shortcut} {t('shortcutDesc')}</p>
                                        </div>
                                    </div>
                                    {isRecordingShortcut ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            className="px-3 py-1.5 text-sm border border-orange-400 rounded-lg bg-orange-50 text-orange-600 font-medium outline-none animate-pulse text-center min-w-[100px]"
                                            placeholder={t('pressShortcut')}
                                            onKeyDown={handleShortcutKeyDown}
                                            onBlur={() => setIsRecordingShortcut(false)}
                                            readOnly
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setIsRecordingShortcut(true)}
                                            className="px-3 py-1.5 text-sm border border-stone-200 dark:border-zinc-700 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-mono transition-colors min-w-[80px]"
                                        >
                                            {config.shortcut}
                                        </button>
                                    )}
                                </div>

                                {/* Permissions Management */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-stone-700 dark:text-foreground">{t('grantedPermissions')}</p>
                                    {permissions.length === 0 ? (
                                        <p className="text-xs text-stone-400 dark:text-muted-foreground p-3 bg-stone-50 dark:bg-muted/50 rounded-lg">{t('noPermissions')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {permissions.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-mono text-stone-700 dark:text-zinc-100">{p.tool}</p>
                                                        <p className="text-xs text-stone-400 dark:text-zinc-500">{p.pathPattern === '*' ? t('allPaths') : p.pathPattern}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => revokePermission(p.tool, p.pathPattern)}
                                                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                    >
                                                        {t('revoke')}
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={clearAllPermissions}
                                                className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                                            >
                                                {t('clearAllPermissions')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'about' && (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-700">
                                    <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-stone-800 dark:text-zinc-100">
                                        {appInfo?.name || 'OpenCowork'}
                                    </h3>
                                    <p className="text-sm font-mono text-stone-500 dark:text-zinc-500">
                                        v{appInfo?.version || '1.0.0'}
                                    </p>
                                </div>

                                <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-stone-100 dark:divide-zinc-800">
                                    <a
                                        href="https://github.com/Safphere"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors group"
                                    >
                                        <span className="text-sm text-stone-500 dark:text-zinc-400">{t('author') || 'Author'}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-stone-700 dark:text-zinc-200 group-hover:text-orange-500 transition-colors">{appInfo?.author || 'Safphere'}</span>
                                            <ExternalLink size={14} className="text-stone-400 dark:text-zinc-500 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    </a>
                                    <a
                                        href={appInfo?.homepage || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors group"
                                    >
                                        <span className="text-sm text-stone-500 dark:text-zinc-400">{t('homepage') || 'Homepage'}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-stone-700 dark:text-zinc-200 group-hover:text-orange-500 transition-colors">Safphere/opencowork</span>
                                            <ExternalLink size={14} className="text-stone-400 dark:text-zinc-500 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    </a>
                                </div>
                                <div className="space-y-4">
                                    <button
                                        onClick={handleCheckUpdate}
                                        disabled={checkingUpdate}
                                        className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {checkingUpdate && <Loader2 size={14} className="animate-spin" />}
                                        {checkingUpdate ? t('checking') : t('checkUpdate')}
                                    </button>

                                    {updateInfo && (
                                        <div className={`text-sm ${updateInfo.hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'} animate-in fade-in slide-in-from-top-2`}>
                                            {updateInfo.hasUpdate ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <p>{t('newVersion')} v{updateInfo.latestVersion}</p>
                                                    <a
                                                        href={updateInfo.releaseUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-orange-500 hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        {t('download')} <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <p>{t('upToDate')}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-stone-400 dark:text-zinc-600 max-w-xs leading-relaxed">
                                    {t('aboutDesc') || 'Your Digital Coworker for specialized tasks.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Modals */}
            {
                showSkillEditor && (
                    <SkillEditor
                        filename={editingSkill}
                        readOnly={viewingSkill}
                        onClose={() => {
                            setShowSkillEditor(false);
                            setEditingSkill(null);
                            setViewingSkill(false);
                        }}
                        onSave={() => refreshSkills()}
                    />
                )
            }
        </div >
    );
}
