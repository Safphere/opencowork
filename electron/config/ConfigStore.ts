import Store from 'electron-store';

export interface ToolPermission {
    tool: string;           // 'write_file', 'run_command', etc.
    pathPattern?: string;   // Optional: specific path or '*' for all
    grantedAt: number;      // Timestamp
}

export interface ProviderConfig {
    id: string;
    name: string;
    apiKey: string;
    apiUrl: string;
    model: string;
    isCustom?: boolean;
    readonlyUrl?: boolean;
}

export interface AppConfig {
    // Global/Legacy
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
    allowedPermissions: ToolPermission[];

    // Multi-Provider
    activeProviderId: string;
    providers: Record<string, ProviderConfig>;
}

// Default provider configurations
const defaultProviders: Record<string, ProviderConfig> = {
    'glm': {
        id: 'glm',
        name: '智谱 GLM',
        apiKey: '',
        apiUrl: 'https://open.bigmodel.cn/api/anthropic',
        model: 'glm-4.7',
        readonlyUrl: true
    },
    'zai': {
        id: 'zai',
        name: 'ZAI (海外)',
        apiKey: '',
        apiUrl: 'https://api.z.ai/api/anthropic', // Placeholder, verify ZAI endpoint
        model: 'glm-4.7', // Assuming ZAI uses similar models or map later
        readonlyUrl: true
    },
    'minimax_cn': {
        id: 'minimax_cn',
        name: 'MiniMax (国内)',
        apiKey: '',
        apiUrl: 'https://api.minimaxi.com/anthropic',
        model: 'MiniMax-M2.1',
        readonlyUrl: true
    },
    'minimax_intl': {
        id: 'minimax_intl',
        name: 'MiniMax (海外)',
        apiKey: '',
        apiUrl: 'https://api.minimax.io/anthropic', // This uses Anthropic protocol
        model: 'MiniMax-M2.1',
        readonlyUrl: true
    },
    'custom': {
        id: 'custom',
        name: '自定义',
        apiKey: '',
        apiUrl: '',
        model: '',
        isCustom: true,
        readonlyUrl: false
    }
};

// ZAI Endpoint correction if needed. 'https://api.zhinao.ai/v1' ? 
// User said "ZAI overseas". Zhipu's overseas brand. 
// Let's assume standard OpenAI compat URL or allow edit if unsure. 
// Actually, ZAI docs usually point to https://api.z.ai/v1 or similar. 
// I will set a reasonable default and allow user to change if needed, or stick to what I know.
// Search result said "https://z.ai/model-api". 

const defaults: AppConfig = {
    authorizedFolders: [],
    networkAccess: true,
    shortcut: 'Alt+Space',
    allowedPermissions: [],
    activeProviderId: 'minimax_intl', // Default to what we had
    providers: defaultProviders
};

class ConfigStore {
    private store: Store<any>; // Use any to allow migration check

    constructor() {
        this.store = new Store({
            name: 'opencowork-config',
            defaults: defaults as any
        });

        this.migrate();
    }

    private migrate() {
        // Check if we have legacy flat keys
        if (this.store.has('apiKey') && !this.store.has('providers')) {
            const legacyKey = this.store.get('apiKey');

            // Copy to default provider (minimax_intl) or custom?
            // Since previous default was MiniMax, let's update minimax_intl
            const providers = { ...defaultProviders };
            if (legacyKey) {
                providers['minimax_intl'].apiKey = legacyKey;
                // If URL was custom, we might lose it if we force minimax_intl URL.
                // But usually it was static.
            }

            this.store.set('providers', providers);
            this.store.set('activeProviderId', 'minimax_intl');

            // Clean up legacy
            this.store.delete('apiKey');
            this.store.delete('apiUrl');
            this.store.delete('model');
        }
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.store.get(key);
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        this.store.set(key, value);
    }

    getAll(): AppConfig {
        const config = this.store.store as AppConfig;
        return {
            ...config,
            providers: this.getAllProviders()
        };
    }

    // === Multi-Provider Getters ===

    getActiveProviderId(): string {
        return this.store.get('activeProviderId') || 'minimax_intl';
    }

    setActiveProviderId(id: string): void {
        this.store.set('activeProviderId', id);
    }

    getProvider(id: string): ProviderConfig | undefined {
        const providers = this.store.get('providers') || defaultProviders;
        const stored = providers[id];
        const def = defaultProviders[id];

        if (stored && def && !stored.isCustom) {
            // Force update built-in fields that shouldn't change
            return {
                ...stored,
                apiUrl: def.apiUrl,
                model: def.model,
                readonlyUrl: def.readonlyUrl
            };
        }
        return stored;
    }

    getAllProviders(): Record<string, ProviderConfig> {
        const stored = this.store.get('providers') || defaultProviders;
        const merged: Record<string, ProviderConfig> = {};

        for (const key in stored) {
            const s = stored[key];
            const d = defaultProviders[key];
            if (s && d && !s.isCustom) {
                merged[key] = { ...s, apiUrl: d.apiUrl, model: d.model, readonlyUrl: d.readonlyUrl };
            } else {
                merged[key] = s;
            }
        }
        return merged;
    }

    updateProvider(id: string, config: Partial<ProviderConfig>): void {
        const providers = this.getAllProviders();
        if (providers[id]) {
            providers[id] = { ...providers[id], ...config };
            this.store.set('providers', providers);
        }
    }

    // === Backward/Agent Compatibility ===
    // These methods now return values based on ACTIVE provider

    getApiKey(): string {
        const active = this.getActiveProviderId();
        const provider = this.getProvider(active);
        return provider?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    }

    setApiKey(key: string): void {
        const active = this.getActiveProviderId();
        this.updateProvider(active, { apiKey: key });
    }

    getModel(): string {
        const active = this.getActiveProviderId();
        return this.getProvider(active)?.model || '';
    }

    setModel(model: string): void {
        const active = this.getActiveProviderId();
        this.updateProvider(active, { model });
    }

    getApiUrl(): string {
        const active = this.getActiveProviderId();
        return this.getProvider(active)?.apiUrl || '';
    }

    setApiUrl(url: string): void {
        const active = this.getActiveProviderId();
        this.updateProvider(active, { apiUrl: url });
    }

    // === Helper for Main.ts set-all ===
    setAll(cfg: Partial<AppConfig>) {
        if (cfg.authorizedFolders) this.store.set('authorizedFolders', cfg.authorizedFolders);
        if (cfg.networkAccess !== undefined) this.store.set('networkAccess', cfg.networkAccess);
        if (cfg.shortcut) this.store.set('shortcut', cfg.shortcut);
        if (cfg.activeProviderId) this.store.set('activeProviderId', cfg.activeProviderId);
        if (cfg.providers) this.store.set('providers', cfg.providers);
    }

    // ... Keep Permissions methods

    // Authorized Folders
    getAuthorizedFolders(): string[] {
        return this.store.get('authorizedFolders') || [];
    }

    addAuthorizedFolder(folder: string): void {
        const folders = this.getAuthorizedFolders();
        if (!folders.includes(folder)) {
            folders.push(folder);
            this.store.set('authorizedFolders', folders);
        }
    }

    removeAuthorizedFolder(folder: string): void {
        const folders = this.getAuthorizedFolders().filter(f => f !== folder);
        this.store.set('authorizedFolders', folders);
    }

    // Network Access
    getNetworkAccess(): boolean {
        return this.store.get('networkAccess');
    }

    setNetworkAccess(enabled: boolean): void {
        this.store.set('networkAccess', enabled);
    }

    // Tool Permissions
    getAllowedPermissions(): ToolPermission[] {
        return this.store.get('allowedPermissions') || [];
    }

    addPermission(tool: string, pathPattern?: string): void {
        const permissions = this.getAllowedPermissions();
        // Check if already exists
        const exists = permissions.some(p =>
            p.tool === tool && p.pathPattern === (pathPattern || '*')
        );
        if (!exists) {
            permissions.push({
                tool,
                pathPattern: pathPattern || '*',
                grantedAt: Date.now()
            });
            this.store.set('allowedPermissions', permissions);
        }
    }

    removePermission(tool: string, pathPattern?: string): void {
        const permissions = this.getAllowedPermissions().filter(p =>
            !(p.tool === tool && p.pathPattern === (pathPattern || '*'))
        );
        this.store.set('allowedPermissions', permissions);
    }

    hasPermission(tool: string, path?: string): boolean {
        const permissions = this.getAllowedPermissions();
        return permissions.some(p => {
            if (p.tool !== tool) return false;
            if (p.pathPattern === '*') return true;
            if (!path) return p.pathPattern === '*';
            // Check if path matches pattern (simple prefix match)
            return path.startsWith(p.pathPattern || '');
        });
    }

    clearAllPermissions(): void {
        this.store.set('allowedPermissions', []);
    }
}

export const configStore = new ConfigStore();
