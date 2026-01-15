/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Custom IpcRenderer API exposed via preload.ts
interface IpcRendererApi {
  on(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): () => void;
  off(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): void;
  send(channel: string, ...args: unknown[]): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: IpcRendererApi
}
