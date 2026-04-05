import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function SupportChat() {
    const { token, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'model', text: 'Hello! I am your SmartHealth Assistant. How can I help you navigate the system today?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [chatHistory, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;

        const userMsg = message;
        setMessage('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const response = await axios.post('/api/ai/support', 
                { message: userMsg, history: chatHistory },
                config
            );

            setChatHistory(prev => [...prev, { role: 'model', text: response.data.response }]);
        } catch (error) {
            console.error('Chat Error:', error);
            setChatHistory(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again or visit our Contact page." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            {/* Chat Bubble */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 animate-in zoom-in-50 duration-300"
                >
                    <MessageCircle className="w-6 h-6" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Need Help?
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[380px] h-[550px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">SmartHealth AI</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-indigo-100 font-medium tracking-wider uppercase">Online Support</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                        {chatHistory.map((item, index) => (
                            <div key={index} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                <div className={`flex gap-3 max-w-[85%] ${item.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`p-2 rounded-xl h-fit ${item.role === 'user' ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                                        {item.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-slate-600" />}
                                    </div>
                                    <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                                        item.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100' 
                                            : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                                    }`}>
                                        {item.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="p-2 rounded-xl bg-slate-100">
                                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                    </div>
                                    <div className="p-4 rounded-3xl bg-slate-50 text-slate-400 text-sm italic rounded-tl-none border border-slate-100">
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                        <form onSubmit={handleSend} className="relative">
                            <input
                                type="text"
                                placeholder="How do I book an appointment?"
                                className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all text-sm font-medium"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                        <p className="mt-3 text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Powered by SmartHealth Gemini AI
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
