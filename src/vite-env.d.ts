/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />
/// <reference types="vite-plugin-electron-renderer/client" />

export interface IpcRendererApi {
    on(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): () => void;
    off(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): void;
    send(channel: string, ...args: unknown[]): void;
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

declare global {
    interface Window {
        ipcRenderer: IpcRendererApi
    }
}
