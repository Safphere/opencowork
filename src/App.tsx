import { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { CoworkView } from './components/CoworkView';
import { SettingsView } from './components/SettingsView';
import { ConfirmDialog, useConfirmations } from './components/ConfirmDialog';
import { FloatingBallPage } from './components/FloatingBallPage';
import Anthropic from '@anthropic-ai/sdk';

function App() {
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { pendingRequest, handleConfirm, handleDeny } = useConfirmations();

  // Check if this is the floating ball window
  const isFloatingBall = window.location.hash === '#/floating-ball' || window.location.hash === '#floating-ball';

  useEffect(() => {
    // Listen for history updates (don't reset isProcessing here - wait for agent:done)
    const removeListener = window.ipcRenderer.on('agent:history-update', (_event, ...args) => {
      const updatedHistory = args[0] as Anthropic.MessageParam[];
      setHistory(updatedHistory);
    });

    const removeErrorListener = window.ipcRenderer.on('agent:error', (_event, ...args) => {
      const err = args[0] as string;
      console.error("Agent Error:", err);
      setIsProcessing(false);
    });

    const removeAbortListener = window.ipcRenderer.on('agent:aborted', () => {
      setIsProcessing(false);
    });

    // Only reset isProcessing when processing is truly done
    const removeDoneListener = window.ipcRenderer.on('agent:done', () => {
      setIsProcessing(false);
    });

    return () => {
      removeListener();
      removeErrorListener();
      removeAbortListener();
      removeDoneListener();
    };
  }, []);

  const handleSendMessage = async (msg: string | { content: string, images: string[] }) => {
    setIsProcessing(true);
    try {
      const result = await window.ipcRenderer.invoke('agent:send-message', msg) as { error?: string } | undefined;
      if (result?.error) {
        console.error(result.error);
        alert(`Error: ${result.error}`); // Simple alert for now
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // If it's the "Agent not initialized" error, give a helpful message
      if (errorMsg.includes('Agent not initialized')) {
        alert('Please configure your API Key in Settings first.');
        setShowSettings(true);
      } else {
        alert(`Error: ${errorMsg}`);
      }
      
      setIsProcessing(false);
    }
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
    <div className="h-screen w-full bg-[#FAF8F5] flex flex-col overflow-hidden font-sans">
      {/* Custom Titlebar */}
      <header
        className="h-10 border-b border-stone-200/80 flex items-center justify-between px-3 bg-white/80 backdrop-blur-sm shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <img src="./icon.png" alt="Logo" className="w-6 h-6 rounded-md object-cover" />
          <span className="font-medium text-stone-700 text-sm">OpenCowork</span>
        </div>

        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Window Controls */}
          <button
            onClick={() => window.ipcRenderer.invoke('window:minimize')}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => window.ipcRenderer.invoke('window:maximize')}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            onClick={() => window.ipcRenderer.invoke('window:close')}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-red-100 hover:text-red-500 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showSettings ? (
          <SettingsView onClose={() => setShowSettings(false)} />
        ) : (
          <CoworkView
            history={history}
            onSendMessage={handleSendMessage}
            onAbort={handleAbort}
            isProcessing={isProcessing}
            onOpenSettings={() => setShowSettings(true)}
          />
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
