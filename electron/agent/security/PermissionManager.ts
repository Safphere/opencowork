import path from 'path';
import { configStore } from '../../config/ConfigStore';

export class PermissionManager {
    private authorizedFolders: Set<string> = new Set();
    private networkAccess: boolean = false;

    constructor() {
        // Load from persisted config
        const savedFolders = configStore.getAuthorizedFolders();
        savedFolders.forEach((f: string) => this.authorizedFolders.add(path.resolve(f)));
    }

    authorizeFolder(folderPath: string): boolean {
        const normalized = path.resolve(folderPath);
        // Security check: never allow root directories
        if (normalized === '/' || normalized === 'C:\\' || normalized.match(/^[A-Z]:\\$/)) {
            console.warn('Attempted to authorize root directory, denied.');
            return false;
        }
        this.authorizedFolders.add(normalized);
        console.log(`Authorized folder: ${normalized}`);
        return true;
    }

    revokeFolder(folderPath: string): void {
        const normalized = path.resolve(folderPath);
        this.authorizedFolders.delete(normalized);
    }

    isPathAuthorized(filePath: string): boolean {
        const normalized = path.resolve(filePath);
        for (const folder of this.authorizedFolders) {
            if (normalized.startsWith(folder)) {
                return true;
            }
        }
        return false;
    }

    getAuthorizedFolders(): string[] {
        return Array.from(this.authorizedFolders);
    }

    setNetworkAccess(enabled: boolean): void {
        this.networkAccess = enabled;
    }

    isNetworkAccessEnabled(): boolean {
        return this.networkAccess;
    }
}

export const permissionManager = new PermissionManager();
