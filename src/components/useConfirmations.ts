import { useState, useEffect } from 'react';

interface ConfirmationRequest {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
}

const STORAGE_KEY = 'confirmations_memory';

function getCommandKey(tool: string, args: Record<string, unknown>): string {
    return `${tool}:${JSON.stringify(args)}`;
}

function getStoredDecision(tool: string, args: Record<string, unknown>): boolean | null {
    const key = getCommandKey(tool, args);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const memory = JSON.parse(stored) as Record<string, boolean>;
    return memory[key] ?? null;
}

function saveDecision(tool: string, args: Record<string, unknown>, approved: boolean) {
    const key = getCommandKey(tool, args);
    const stored = localStorage.getItem(STORAGE_KEY);
    const memory = stored ? JSON.parse(stored) as Record<string, boolean> : {};
    memory[key] = approved;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

// Hook for managing confirmations
export function useConfirmations() {
    const [pendingRequest, setPendingRequest] = useState<ConfirmationRequest | null>(null);

    useEffect(() => {
        const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
            const request = args[0] as ConfirmationRequest;
            const storedDecision = getStoredDecision(request.tool, request.args);
            if (storedDecision !== null) {
                window.ipcRenderer.invoke('agent:confirm-response', {
                    id: request.id,
                    approved: storedDecision,
                    remember: true,
                    tool: request.tool,
                    path: (request.args?.path || request.args?.cwd) as string | undefined,
                });
            } else {
                setPendingRequest(request);
            }
        };
        const cleanup = window.ipcRenderer.on('agent:confirm-request', handler);
        return cleanup;
    }, []);

    const handleConfirm = (id: string, remember: boolean, tool: string, path?: string) => {
        if (remember) {
            saveDecision(tool, { path }, true);
        }
        window.ipcRenderer.invoke('agent:confirm-response', {
            id,
            approved: true,
            remember,
            tool,
            path
        });
        setPendingRequest(null);
    };

    const handleDeny = (id: string) => {
        window.ipcRenderer.invoke('agent:confirm-response', { id, approved: false });
        setPendingRequest(null);
    };

    return {
        pendingRequest,
        handleConfirm,
        handleDeny
    };
}

export type { ConfirmationRequest };

