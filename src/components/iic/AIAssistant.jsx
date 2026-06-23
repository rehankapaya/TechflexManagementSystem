import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { askAIAssistant } from '../../services/aiService';
import { formatMarkdown } from '../../utils/formatMarkdown';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';

const AIAssistant = () => {
  const { iicData, hasApiKey } = useOutletContext();
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello! I am your Institution Intelligence Center AI Assistant. How can I help you analyze the portal data today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !hasApiKey || !iicData) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askAIAssistant(userMsg.text, iicData.aiContext);
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: `Error: ${error.message || 'Ensure your API key is correct and you have internet access.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = [
    "Why are admissions decreasing?",
    "Which students are at highest risk of dropping out?",
    "What is our revenue projection for next month?",
    "Which courses should we promote more?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="text-purple-500" />
          Natural Language AI Assistant
        </h2>
        <p className="text-slate-500 text-sm mt-1">Ask plain English questions about your institution's data</p>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Bot size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">AI Assistant Offline</h3>
          <p className="text-slate-500 max-w-md">
            Please enter your Groq API Key in the top right header to activate the Natural Language Assistant.
          </p>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex mb-3 gap-4 max-w-[80%] ${msg.type === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                  ${msg.type === 'user' ? 'bg-indigo-100 text-indigo-600' :
                    msg.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'}`}>
                  {msg.type === 'user' ? <User size={20} /> : msg.type === 'error' ? <AlertCircle size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.type === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : msg.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-100 rounded-tl-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm text-sm'
                  }`}>
                  <span
                    className="block"
                    dangerouslySetInnerHTML={formatMarkdown(msg.text, msg.type === 'user')}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 max-w-[80%]">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 rounded-tl-sm flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  Analyzing Data...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about admissions, fees, or student risks..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl flex items-center justify-center transition-colors shadow-sm"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
