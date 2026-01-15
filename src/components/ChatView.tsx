import { useState } from 'react';
import { Send } from 'lucide-react';

export function ChatView() {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hello! I am your chat assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', content: input }]);
        setInput('');
        // Simulate reply
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', content: 'This is a mock response from the Chat mode. For real agent tasks, please use Cowork mode.' }]);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-border">
                <div className="relative">
                    <input
                        className="w-full bg-secondary border border-border rounded-lg py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Type a message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} className="absolute right-2 top-2 text-primary hover:text-primary/80">
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
