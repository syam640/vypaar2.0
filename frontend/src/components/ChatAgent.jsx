import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/supabase';
import { MessageSquare, Send, X, Loader2, Mic, MicOff, Volume2, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Namaste! I am your Vyapaar AI Agent. You can type or talk to me about your business.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- 🎙️ VOICE INPUT (SPEECH TO TEXT) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Optimized for Indian accents

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      setIsListening(false);
      handleSend(transcript); // Automatically send after voice capture
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Voice recognition failed. Check mic permissions.");
    };
  }

  // --- 🔊 VOICE OUTPUT (TEXT TO SPEECH) ---
  const speak = (text) => {
    // Stop any existing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (manualPrompt) => {
    const textToSend = manualPrompt || prompt;
    if (!textToSend.trim()) return;

    // 1. Add User Message to Chat
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);
    setPrompt('');

    try {
      // 2. Call the Backend API
      const res = await api.post('/chat/ask', { prompt: textToSend });
      const aiResponse = res.data.answer;

      // 3. Add AI Message and Speak it
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      speak(aiResponse);

    } catch (err) {
      console.error(err);
      toast.error("Agent is currently busy.");
    } finally {
      setLoading(false);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast("Listening...", { icon: '👂' });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen ? (
        <div className="card w-80 md:w-96 h-[500px] flex flex-col shadow-2xl border-[#1f1f1f] bg-[#0a0a0a] animate-in fade-in slide-in-from-bottom-4 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#1f1f1f] flex justify-between items-center bg-[#111]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bot size={20} className="text-orange-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-[#111] rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">AI Business Agent</p>
                <p className="text-[8px] text-gray-500 uppercase">Always Active</p>
              </div>
            </div>
            <X size={18} className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsOpen(false)} />
          </div>
          
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-[11px] p-3 rounded-2xl ${
                  m.role === 'user' 
                  ? 'bg-orange-600 text-white rounded-tr-none' 
                  : 'bg-[#1a1a1a] text-gray-200 rounded-tl-none border border-[#222]'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-tl-none border border-[#222]">
                  <Loader2 size={12} className="animate-spin text-orange-500" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#1f1f1f] bg-[#0d0d0d] flex gap-2 items-center">
            <button 
              onClick={toggleListen}
              className={`p-2.5 rounded-xl transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#1a1a1a] text-gray-400 hover:text-orange-500'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            
            <input 
              className="bg-[#141414] text-[11px] flex-1 p-2.5 rounded-xl outline-none border border-[#1f1f1f] focus:border-orange-500/50 text-white"
              placeholder={isListening ? "Listening to you..." : "Ask your assistant..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            
            <button 
              onClick={() => handleSend()} 
              disabled={loading || !prompt.trim()}
              className="bg-orange-500 p-2.5 rounded-xl text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)} 
          className="group relative w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-110 active:scale-95 transition-all"
        >
          <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-20" />
          <MessageSquare size={28} color="white" className="group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}