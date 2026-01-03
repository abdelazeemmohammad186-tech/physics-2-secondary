
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChatMessage, Language } from '../types';
import { GeminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  language: Language;
  geminiService: GeminiService;
  initialMessage?: string;
  onStatusChange?: (isBusy: boolean) => void;
  isChapterActive?: boolean;
}

export interface ChatInterfaceHandle {
  requestDrawing: (topic: string) => Promise<void>;
  clearMessages: () => void;
}

type TeacherStatus = 'idle' | 'preparing' | 'thinking' | 'generating_audio' | 'speaking' | 'drawing';

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(({ language, geminiService, initialMessage, onStatusChange, isChapterActive }, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<TeacherStatus>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const isRtl = language === Language.AR;

  useImperativeHandle(ref, () => ({
    clearMessages: () => {
      setMessages([]);
    },
    requestDrawing: async (topic: string) => {
      if (status !== 'idle') return;
      
      const userMsg: ChatMessage = { 
        role: 'user', 
        text: isRtl ? `ارسمي لي توضيحاً لـ: ${topic}` : `Draw an illustration for: ${topic}`, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, userMsg]);
      setStatus('drawing');

      try {
        const { text, imageUrl } = await geminiService.generatePhysicsDrawing(topic);
        const cleanResponseText = text.replace(/[*#_$~]/g, '');
        const modelMsg: ChatMessage = { 
          role: 'model', 
          text: cleanResponseText, 
          images: imageUrl ? [imageUrl] : [],
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, modelMsg]);
        
        setStatus('generating_audio');
        await geminiService.speak(cleanResponseText, () => {
          setStatus('speaking');
          lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        setStatus('idle');
      } catch (e) {
        console.error(e);
        setStatus('idle');
      }
    }
  }));

  useEffect(() => {
    onStatusChange?.(status !== 'idle');
  }, [status, onStatusChange]);

  useEffect(() => {
    if (status === 'thinking' || status === 'drawing') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [status]);

  useEffect(() => {
    if (initialMessage) {
      handleSend(initialMessage, true);
    }
  }, [initialMessage]);

  const handleSend = async (text: string, isAuto: boolean = false) => {
    if (status !== 'idle') return;

    const messageText = text || inputValue;
    if (!messageText.trim()) return;

    if (!isAuto) {
      const userMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setStatus('thinking');
    } else {
      setStatus('preparing');
    }
    
    setInputValue('');

    try {
      const response = await geminiService.sendMessage(messageText);
      // Remove any annoying markdown symbols before displaying
      const cleanResponse = response.replace(/[*#_$~]/g, '');
      const modelMsg: ChatMessage = { role: 'model', text: cleanResponse, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
      
      setStatus('generating_audio');
      
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      
      await geminiService.speak(cleanResponse, () => {
        setStatus('speaking');
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  const getStatusText = () => {
    if (status === 'preparing') return isRtl ? "المعلمة تحضر محتوى الدرس..." : "Teacher is preparing the lesson...";
    if (status === 'thinking') return isRtl ? "المعلمة تفكر..." : "Teacher is thinking...";
    if (status === 'drawing') return isRtl ? "المعلمة ترسم لك الآن..." : "Teacher is drawing for you...";
    if (status === 'generating_audio') return isRtl ? "جاري تحويل الشرح لصوت..." : "Generating voice explanation...";
    if (status === 'speaking') return isRtl ? "المعلمة تشرح لك الآن بوضوح..." : "Teacher is explaining clearly now...";
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
      
      {status !== 'idle' && (
        <div className={`absolute top-0 inset-x-0 z-20 px-4 py-3 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          status === 'speaking' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-amber-50 text-amber-700 border-b border-amber-100'
        }`}>
          <div className="flex gap-1 items-end h-4">
             <div className={`w-1.5 rounded-full animate-bounce ${status === 'speaking' ? 'bg-white' : 'bg-amber-500'}`}></div>
             <div className={`w-1.5 rounded-full animate-bounce delay-150 ${status === 'speaking' ? 'bg-white' : 'bg-amber-500'}`}></div>
             <div className={`w-1.5 rounded-full animate-bounce delay-300 ${status === 'speaking' ? 'bg-white' : 'bg-amber-500'}`}></div>
          </div>
          <span className="text-sm font-bold tracking-wide">
            {getStatusText()}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 pt-16 space-y-6 custom-scrollbar bg-slate-50/30">
        {messages.length === 0 && !status && isChapterActive && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
            <i className="fas fa-chalkboard-teacher text-5xl"></i>
            <p className="font-bold">{isRtl ? 'المعلمة جاهزة لبدء الجزء الجديد' : 'Teacher ready to start the new part'}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            ref={i === messages.length - 1 && msg.role === 'model' ? lastMessageRef : null}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img src={msg.images[0]} alt="Physics Diagram" className="w-full h-auto object-contain max-h-80" />
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 opacity-60">
                {msg.role === 'model' && (
                   <button 
                     disabled={status !== 'idle'}
                     onClick={() => {
                        setStatus('generating_audio');
                        geminiService.speak(msg.text, () => setStatus('speaking')).then(() => setStatus('idle'));
                     }} 
                     className="text-indigo-600 hover:text-indigo-800 p-1 flex items-center gap-1 disabled:opacity-30"
                   >
                     <i className="fas fa-volume-up text-xs"></i>
                     <span className="text-[10px] font-bold">{isRtl ? 'إعادة الاستماع' : 'Listen again'}</span>
                   </button>
                )}
                <span className={`text-[10px] ${msg.role === 'user' ? 'text-right w-full' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className={`flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border transition-all ${
          status !== 'idle' ? 'opacity-50 border-slate-100' : 'border-slate-200 focus-within:ring-2 focus-within:ring-indigo-200'
        }`}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={status !== 'idle'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(inputValue);
              }
            }}
            placeholder={status !== 'idle' ? (isRtl ? 'المعلمة مشغولة...' : 'Teacher is busy...') : (isRtl ? 'اسألي معلمتك هنا...' : 'Ask your teacher here...')}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-sm max-h-32 disabled:cursor-not-allowed"
            rows={1}
          />
          <button 
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || status !== 'idle'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              inputValue.trim() && status === 'idle' ? 'bg-indigo-600 text-white shadow-md hover:scale-105' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatInterface;
