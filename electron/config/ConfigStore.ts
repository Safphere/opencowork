import Store from 'electron-store';

export interface ToolPermission {
    tool: string;           // 'write_file', 'run_command', etc.
    pathPattern?: string;   // Optional: specific path or '*' for all
    grantedAt: number;      // Timestamp
}

export interface AppConfig {
    apiKey: string;
    apiUrl: string;
    model: string;
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
    allowedPermissions: ToolPermission[];
}

const defaults: AppConfig = {
    apiKey: '',
    apiUrl: 'https://api.minimaxi.com/anthropic',
    model: 'MiniMax-M2.1',
    authorizedFolders: [],
    networkAccess: true, // "Open and use" implies network should be on
    shortcut: 'Alt+Space',
    allowedPermissions: []
};

class ConfigStore {
    private store: Store<AppConfig>;

    constructor() {
        this.store = new Store<AppConfig>({
            name: 'opencowork-config',
            defaults
        });
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.store.get(key);
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        this.store.set(key, value);
    }

    getAll(): AppConfig {
        return this.store.store;
    }

    // API Key
    getApiKey(): string {
        return this.store.get('apiKey') || process.env.ANTHROPIC_API_KEY || '';
    }

    setApiKey(key: string): void {
        this.store.set('apiKey', key);
    }

    // Model
    getModel(): string {
        return this.store.get('model');
    }

    setModel(model: string): void {
        this.store.set('model', model);
    }

    // API URL
    getApiUrl(): string {
        return this.store.get('apiUrl');
    }

    setApiUrl(url: string): void {
        this.store.set('apiUrl', url);
    }

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
