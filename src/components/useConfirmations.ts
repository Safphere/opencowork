import { useState, useEffect } from 'react';

interface ConfirmationRequest {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
}

// Hook for managing confirmations
export function useConfirmations() {
    const [pendingRequest, setPendingRequest] = useState<ConfirmationRequest | null>(null);

    useEffect(() => {
        const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
            const request = args[0] as ConfirmationRequest;
            setPendingRequest(request);
        };
        const cleanup = window.ipcRenderer.on('agent:confirm-request', handler);
        return cleanup;
    }, []);

    const handleConfirm = (id: string, remember: boolean, tool: string, path?: string) => {
        window.ipcRenderer.invoke('agent:confirm-response', { id, approved: true, remember, tool, path });
        setPendingRequest(null);
    };

    const handleDeny = (id: string) => {
        window.ipcRenderer.invoke('agent:confirm-response', { id, approved: false });
        setPendingRequest(null);
    };

    return { pendingRequest, handleConfirm, handleDeny };
}

export type { ConfirmationRequest };

