import { useState, useEffect, useRef } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { CoworkView } from './components/CoworkView';
import { SettingsView } from './components/SettingsView';
import { ConfirmDialog, useConfirmations } from './components/ConfirmDialog';
import { FloatingBallPage } from './components/FloatingBallPage';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './services/logger';

function App() {
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { pendingRequest, handleConfirm, handleDeny } = useConfirmations();
  const currentSessionIdRef = useRef<string | null>(null);
  const switchingSessionsRef = useRef<Set<string>>(new Set()); // ⚠️ 优化：使用队列管理多个会话切换
  const historyVersionRef = useRef<Map<string, number>>(new Map()); // ⚠️ 版本号，防止旧数据覆盖新版本数据覆盖新数据
  const lastHistoryHashRef = useRef<Map<string, string>>(new Map()); // ⚠️ 重复更新检测
  const pendingUpdateRef = useRef<{ sessionId: string; timestamp: number } | null>(null); // ⚠️ P2-2: 事件超时检测

  // ⚠️ 优化：环境检测，生产环境减少日志
  const isDevelopment = process.env.NODE_ENV === 'development';

  // ⚠️ 优化：创建日志工具函数
  const log = isDevelopment
    ? (...args: unknown[]) => console.log('[App]', ...args)
    : () => {}; // 生产环境空函数

  const warn = isDevelopment
    ? (...args: unknown[]) => logger.warn('[App]', ...args)
    : () => {};

  const error = (...args: unknown[]) => logger.error('[App]', ...args);

  // ⚠️ 优化：历史哈希计算函数（用于重复更新检测）
  const computeHistoryHash = (data: Anthropic.MessageParam[]): string => {
    // 简单哈希：取长度和前100个字符
    const str = JSON.stringify(data);
    return `${str.length}:${str.slice(0, 100)}`;
  };

  // Check if this is the floating ball window
  const isFloatingBall = window.location.hash === '#/floating-ball' || window.location.hash === '#floating-ball';

  // Listen for history updates with session filtering
  useEffect(() => {
    // Get current session ID on mount
    window.ipcRenderer.invoke('session:current').then((session: any) => {
      currentSessionIdRef.current = session?.id || null;
    });

    const removeUpdateListener = window.ipcRenderer.on('agent:history-update', (_event, ...args) => {
      const eventData = args[0] as { sessionId: string; version?: number; data: Anthropic.MessageParam[] };

      // ⚠️ 优化1：switching 检查（队列机制）- 最快失败
      if (switchingSessionsRef.current.size > 0) {
        if (!switchingSessionsRef.current.has(eventData.sessionId)) {
          log('Switching sessions: ignored history from', eventData.sessionId, 'waiting for:', Array.from(switchingSessionsRef.current));
          return;
        }
      }

      // ⚠️ 优化2：会话检查（第二快失败）
      if (eventData.sessionId !== currentSessionIdRef.current) {
        log('Filtered history update: event sessionId=', eventData.sessionId, 'current=', currentSessionIdRef.current);
        return;
      }

      // ⚠️ 优化3：版本号检查（智能同步）
      if (eventData.version !== undefined) {
        const lastVersion = historyVersionRef.current.get(eventData.sessionId) || 0;

        // 如果是第一个事件（lastVersion = 0），接受任何版本号
        // 这样可以自动同步 Agent 的版本号
        if (lastVersion === 0 || eventData.version > lastVersion) {
          historyVersionRef.current.set(eventData.sessionId, eventData.version);
        } else if (eventData.version <= lastVersion) {
          log('Ignored old version', eventData.version, '(last:', lastVersion, ') for session', eventData.sessionId);
          return;
        }
      }

      // ⚠️ 优化4：重复更新检测（避免不必要的重渲染）
      const newHash = computeHistoryHash(eventData.data);
      const lastHash = lastHistoryHashRef.current.get(eventData.sessionId);

      if (lastHash === newHash) {
        log('⚠️ Skipping duplicate history update for session', eventData.sessionId);
        return; // 数据未变化，跳过更新
      }

      lastHistoryHashRef.current.set(eventData.sessionId, newHash);

      // ⚠️ P2-2 优化：清除超时检测并记录延迟
      if (pendingUpdateRef.current?.sessionId === eventData.sessionId) {
        const latency = Date.now() - pendingUpdateRef.current.timestamp;
        if (isDevelopment) {
          log('✅ agent:history-update received in', latency, 'ms for', eventData.sessionId);
        }
        pendingUpdateRef.current = null;
      }

      log('✅ Updating history for session', eventData.sessionId, ':', eventData.data.length, 'messages');
      setHistory(eventData.data);
    });

    const removeErrorListener = window.ipcRenderer.on('agent:error', (_event, ...args) => {
      const eventData = args[0] as { sessionId: string; data: string };

      // Only show errors for current session
      if (eventData.sessionId === currentSessionIdRef.current) {
        error("Agent Error:", eventData.data);
        const errorMessage: Anthropic.MessageParam = {
          role: 'assistant',
          content: `⚠️ **错误发生**

${eventData.data}

请检查配置后重试。如果问题持续存在，请查看控制台日志获取更多信息。`
        };
        setHistory(prev => [...prev, errorMessage]);
        setIsProcessing(false);
      }
    });

    const removeAbortListener = window.ipcRenderer.on('agent:aborted', (_event, ...args) => {
      const eventData = args[0] as { sessionId: string; data: unknown };

      // Only process abort for current session
      if (eventData.sessionId !== currentSessionIdRef.current) {
        return;
      }

      setIsProcessing(false);
    });

    const removeDoneListener = window.ipcRenderer.on('agent:done', (_event, ...args) => {
      const eventData = args[0] as { sessionId: string; data: unknown };

      // Only process done for current session
      if (eventData.sessionId !== currentSessionIdRef.current) {
        return;
      }

      setIsProcessing(false);
    });

    const removeRunningListener = window.ipcRenderer.on('session:running-changed', (_event, data) => {
      const { sessionId: newSessionId, isRunning } = data as { sessionId: string; isRunning: boolean; count: number };

      // Update isProcessing if it's the current session
      if (newSessionId === currentSessionIdRef.current) {
        setIsProcessing(isRunning);
      }

      // Update session ID if task starts and we don't have one
      if (isRunning && !currentSessionIdRef.current) {
        currentSessionIdRef.current = newSessionId;
      }
    });

    // Listen for session current changed events
    const removeSessionChangedListener = window.ipcRenderer.on('session:current-changed', async (_event, data) => {
      const { sessionId: newSessionId, isRunning } = data as { sessionId: string | null; isRunning?: boolean };
      log('Session changed to:', newSessionId, 'running:', isRunning);

      // ⚠️ 关键修复：使用队列管理多个会话切换
      switchingSessionsRef.current.clear(); // 清空旧的切换标志
      if (newSessionId !== null) {
        switchingSessionsRef.current.add(newSessionId); // 添加新会话到切换队列
      }

      // ⚠️ 关键修复：立即同步更新 ref
      currentSessionIdRef.current = newSessionId;

      // If sessionId is null (new session), clear history and reset processing
      if (newSessionId === null) {
        log('Clearing history for new session');
        setHistory([]);
        setIsProcessing(false);
        switchingSessionsRef.current.clear(); // 新会话不需要等待
      } else {
        // ⚠️ 关键修复：总是加载 SessionStore 的 history（包含用户消息和已保存的AI回复）
        // SessionStore 在发送消息时立即保存了用户消息
        // streamingText 会额外显示当前正在流式的内容
        // 两者结合 = 完整的对话历史
        log(`Loading history for session ${newSessionId}...`);

        try {
          const session = await window.ipcRenderer.invoke('session:get', newSessionId) as { messages: Anthropic.MessageParam[] } | null;
          if (session && session.messages) {
            log('✅ Loaded history for session', newSessionId, ':', session.messages.length, 'messages');
            setHistory(session.messages);
          } else {
            warn('Session', newSessionId, 'not found or has no messages');
            setHistory([]);
          }
        } catch (err) {
          error('Error loading session', newSessionId, ':', err);
          setHistory([]);
        }

        // 更新处理状态
        if (isRunning !== undefined) {
          setIsProcessing(isRunning);
        }

        // ⚠️ P2-2 优化：记录预期的更新，用于超时检测
        pendingUpdateRef.current = {
          sessionId: newSessionId,
          timestamp: Date.now()
        };

        // ⚠️ 延迟清除切换标志，给 agent:history-update 事件足够的时间到达
        // 如果 agent:history-update 在这个期间到达，它会覆盖主动加载的历史（因为有版本号检查）
        setTimeout(() => {
          switchingSessionsRef.current.delete(newSessionId);
          log('✅ Session switch complete for:', newSessionId, ', remaining:', Array.from(switchingSessionsRef.current));
        }, 500); // 优化：增加到 500ms，确保事件到达

        // ⚠️ P2-2 优化：设置超时检测（1秒后检查）
        setTimeout(() => {
          if (pendingUpdateRef.current?.sessionId === newSessionId) {
            warn('⏱️ agent:history-update timeout for session', newSessionId, '- event may be lost');
            pendingUpdateRef.current = null;
          }
        }, 1000);
      }

      log('✅ Session ref and history updated for:', newSessionId);
    });

    // ⚠️ P2-1 优化：内存清理机制 - 定期清理旧会话的版本号和哈希数据
    const cleanupInterval = setInterval(() => {
      const currentSession = currentSessionIdRef.current;
      const versionKeys = Array.from(historyVersionRef.current.keys());
      const hashKeys = Array.from(lastHistoryHashRef.current.keys());

      // 只保留当前会话和最近 3 个活跃会话的数据
      const toKeep = [currentSession, ...versionKeys.slice(0, 3)].filter(Boolean) as string[];

      // 清理版本号 Map
      let versionCleaned = false;
      const newVersionMap = new Map<string, number>();
      toKeep.forEach(id => {
        const version = historyVersionRef.current.get(id);
        if (version !== undefined) {
          newVersionMap.set(id, version);
        }
      });
      if (newVersionMap.size < historyVersionRef.current.size) {
        historyVersionRef.current = newVersionMap;
        versionCleaned = true;
      }

      // 清理哈希 Map
      let hashCleaned = false;
      const newHashMap = new Map<string, string>();
      toKeep.forEach(id => {
        const hash = lastHistoryHashRef.current.get(id);
        if (hash !== undefined) {
          newHashMap.set(id, hash);
        }
      });
      if (newHashMap.size < lastHistoryHashRef.current.size) {
        lastHistoryHashRef.current = newHashMap;
        hashCleaned = true;
      }

      if ((versionCleaned || hashCleaned) && isDevelopment) {
        log('🧹 Memory cleanup: versions', versionKeys.length, '→', newVersionMap.size,
            ', hashes', hashKeys.length, '→', newHashMap.size);
      }
    }, 5 * 60 * 1000); // 每 5 分钟清理一次

    return () => {
      removeUpdateListener?.();
      removeErrorListener?.();
      removeAbortListener?.();
      removeDoneListener?.();
      removeRunningListener?.();
      removeSessionChangedListener?.();
      clearInterval(cleanupInterval); // 清理定时器
    };
  }, []);

  const handleSendMessage = async (msg: string | { content: string, images: string[] }) => {
    // Prevent concurrent message sending
    if (isProcessing) {
      warn('Message send blocked: task already running');
      return;
    }

    // ⚠️ 关键修复：如果是新建会话（sessionId 为 null），先创建会话
    if (currentSessionIdRef.current === null) {
      log('No session ID, creating new session first...');
      try {
        const result = await window.ipcRenderer.invoke('session:create-new') as { success: boolean; sessionId: string };
        if (result.success) {
          currentSessionIdRef.current = result.sessionId;
          log('✅ Created new session:', result.sessionId);
        } else {
          error('Failed to create session');
          return;
        }
      } catch (err) {
        error('Error creating session:', err);
        return;
      }
    }

    // ⚠️ 关键修复：立即将用户消息添加到history，让用户马上看到
    const userMessage: Anthropic.MessageParam = typeof msg === 'string'
      ? { role: 'user', content: msg }
      : {
          role: 'user',
          content: [
            { type: 'text' as const, text: msg.content },
            ...(msg.images || []).map(img => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: img.split(',')[1] }
            }))
          ]
        };

    log('Adding user message to history immediately:', userMessage);
    setHistory(prev => [...prev, userMessage]);

    // Set initial processing state
    setIsProcessing(true);

    // Send message asynchronously
    window.ipcRenderer.invoke('agent:send-message', msg)
      .then((result: any) => {
        if (result?.error) {
          error(result.error);
          // Reset processing state on error
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        error('Failed to send message:', err);
        // Reset processing state on exception
        setIsProcessing(false);
      });

    // Note: isProcessing will be managed by session:running-changed, agent:done, agent:error events
  };

  const handleAbort = () => {
    window.ipcRenderer.invoke('agent:abort');
    setIsProcessing(false);
  };

  // If this is the floating ball window, render only the floating ball
  if (isFloatingBall) {
    return <FloatingBallPage />;
  }

  // Main App - Narrow vertical layout
  return (
    <div className="h-screen w-full bg-[#FAF8F5] dark:bg-zinc-950 flex flex-col overflow-hidden font-sans text-stone-900 dark:text-zinc-100">
      {/* Custom Titlebar */}
      <header
        className={`h-10 border-b border-stone-200/80 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shrink-0 transition-colors ${navigator.userAgent.includes('Mac') ? 'pl-20 pr-3' : 'px-3'
          }`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <img src="./icon.png" alt="Logo" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-medium text-stone-700 dark:text-zinc-200 text-sm">OpenCowork</span>
          </div>
        </div>

        {!navigator.userAgent.includes('Mac') && (
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {/* Window Controls - Windows/Linux Only */}
            <button
              onClick={() => window.ipcRenderer.invoke('window:minimize')}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded transition-colors"
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => window.ipcRenderer.invoke('window:maximize')}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 rounded transition-colors"
              title="Maximize"
            >
              <Square size={12} />
            </button>
            <button
              onClick={() => window.ipcRenderer.invoke('window:close')}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-red-100 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <CoworkView
          history={history}
          onSendMessage={handleSendMessage}
          onAbort={handleAbort}
          isProcessing={isProcessing}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && (
          <div className="absolute inset-0 z-50">
            <SettingsView onClose={() => setShowSettings(false)} />
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        request={pendingRequest}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
      />
    </div>
  );
}

export default App;
