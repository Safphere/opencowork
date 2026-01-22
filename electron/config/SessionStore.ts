import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

export interface Session {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: Anthropic.MessageParam[];
}

interface SessionStoreSchema {
    sessions: Session[];
    currentSessionId: string | null;
    currentFloatingBallSessionId: string | null; // Separate session tracking for floating ball
}

const defaults: SessionStoreSchema = {
    sessions: [],
    currentSessionId: null,
    currentFloatingBallSessionId: null
};

class SessionStore {
    private store: Store<SessionStoreSchema>;

    constructor() {
        this.store = new Store<SessionStoreSchema>({
            name: 'opencowork-sessions',
            defaults
        });
    }

    // Get all sessions (summary only, without full messages for list view)
    getSessions(): Omit<Session, 'messages'>[] {
        const sessions = this.store.get('sessions') || [];
        return sessions.map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }));
    }

    // Get full session by ID
    getSession(id: string): Session | null {
        const sessions = this.store.get('sessions') || [];
        return sessions.find(s => s.id === id) || null;
    }

    // Create new session
    createSession(title?: string): Session {
        const session: Session = {
            id: uuidv4(),
            title: title || '新会话',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
        const sessions = this.store.get('sessions') || [];
        sessions.unshift(session); // Add to beginning
        this.store.set('sessions', sessions);
        this.store.set('currentSessionId', session.id);
        return session;
    }

    // Update session messages
    updateSession(id: string, messages: Anthropic.MessageParam[], title?: string): void {
        const sessions = this.store.get('sessions') || [];
        const index = sessions.findIndex(s => s.id === id);
        if (index >= 0) {
            sessions[index].messages = messages;
            sessions[index].updatedAt = Date.now();
            if (title) {
                sessions[index].title = title;
            } else if (sessions[index].title === '新会话' && messages.length > 0) {
                // Auto-generate title from first user message
                const firstUserMsg = messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    const text = typeof firstUserMsg.content === 'string'
                        ? firstUserMsg.content
                        : (Array.isArray(firstUserMsg.content)
                            ? (firstUserMsg.content as Array<{ type: string; text?: string }>).find(b => b.type === 'text')?.text
                            : '');
                    if (text) {
                        sessions[index].title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
                    }
                }
            }
            this.store.set('sessions', sessions);
        }
    }

    // Create or update session only if it has meaningful content
    saveSession(id: string | null, messages: Anthropic.MessageParam[]): string {
        // Check if there's real content (user or assistant messages with actual text)
        const hasRealContent = messages.some(m => {
            const content = m.content;
            if (typeof content === 'string') {
                return content.trim().length > 0;
            } else if (Array.isArray(content)) {
                return content.some(block =>
                    block.type === 'text' ? (block.text || '').trim().length > 0 : true
                );
            }
            return false;
        });

        // If no meaningful messages, don't save
        if (!hasRealContent) {
            console.log('[SessionStore] Skipping empty session');
            return this.getCurrentSessionId() || '';
        }

        let sessionId = id;
        if (!sessionId) {
            // Create new session only when we have actual content
            const session = this.createSession();
            sessionId = session.id;
            console.log(`[SessionStore] Created new session: ${sessionId}`);
        }

        try {
            this.updateSession(sessionId, messages);
            console.log(`[SessionStore] Successfully saved session ${sessionId} with ${messages.length} messages`);
        } catch (error) {
            console.error(`[SessionStore] Error updating session ${sessionId}:`, error);
            // Try to recover by creating a new session
            if (id) {
                console.log('[SessionStore] Attempting recovery by creating new session...');
                const newSession = this.createSession();
                sessionId = newSession.id;
                this.updateSession(sessionId, messages);
                console.log(`[SessionStore] Recovery successful, new session: ${sessionId}`);
            } else {
                throw error; // Re-throw if we can't recover
            }
        }

        return sessionId;
    }

    // Clean up empty sessions (can be called periodically)
    cleanupEmptySessions(): void {
        const sessions = this.store.get('sessions') || [];
        const validSessions = sessions.filter(session => {
            // Keep sessions that have meaningful messages
            return session.messages.some(msg => {
                const content = msg.content;
                if (typeof content === 'string') {
                    return content.trim().length > 0;
                } else if (Array.isArray(content)) {
                    return content.some(block =>
                        block.type === 'text' ? (block.text || '').trim().length > 0 : true
                    );
                }
                return false;
            });
        });

        if (validSessions.length !== sessions.length) {
            console.log(`[SessionStore] Cleaned up ${sessions.length - validSessions.length} empty sessions`);
            this.store.set('sessions', validSessions);
        }
    }

    // Delete session
    deleteSession(id: string): void {
        const sessions = (this.store.get('sessions') || []).filter(s => s.id !== id);
        this.store.set('sessions', sessions);
        if (this.store.get('currentSessionId') === id) {
            this.store.set('currentSessionId', sessions.length > 0 ? sessions[0].id : null);
        }
    }

    // Get current session ID
    getCurrentSessionId(): string | null {
        return this.store.get('currentSessionId');
    }

    // Set current session
    setCurrentSession(id: string): void {
        this.store.set('currentSessionId', id);
    }

    // Get floating ball's current session ID
    getFloatingBallSessionId(): string | null {
        return this.store.get('currentFloatingBallSessionId');
    }

    // Set floating ball's current session
    setFloatingBallSession(id: string): void {
        this.store.set('currentFloatingBallSessionId', id);
    }

    // Get appropriate session ID based on context
    getSessionId(isFloatingBall: boolean = false): string | null {
        return isFloatingBall
            ? this.getFloatingBallSessionId()
            : this.getCurrentSessionId();
    }

    // Set appropriate session based on context
    setSessionId(id: string, isFloatingBall: boolean = false): void {
        if (isFloatingBall) {
            this.setFloatingBallSession(id);
        } else {
            this.setCurrentSession(id);
        }
    }
}

export const sessionStore = new SessionStore();
