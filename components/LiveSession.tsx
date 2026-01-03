
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Language } from '../types';

interface LiveSessionProps {
  language: Language;
  onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ language, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const isRtl = language === Language.AR;

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const toggleSession = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsActive(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setTranscriptions(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.length < 100) {
                    const newArr = [...prev];
                    newArr[newArr.length - 1] = last + " " + text;
                    return newArr;
                  }
                  return [...prev, text];
                });
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error(e),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `أنتِ معلمة فيزياء صبورة وواضحة جداً. الجلسة الآن بث مباشر. تحدثي برتم "طبيعي ومعتدل" وواضح لمساعدة الطالب. اللغة: ${language}.`,
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
    }
  };

  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function createBlob(data: Float32Array): { data: string, mimeType: string } {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh] max-h-[800px] border border-white/20 animate-in zoom-in duration-300">
        
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight">
                {isRtl ? 'بث مباشر: أون إير' : 'Live: On Air'}
              </h3>
              <p className="text-xs text-slate-400">
                {isActive ? (isRtl ? 'المعلمة تستمع إليك...' : 'Listening...') : (isRtl ? 'جاهز للبدء؟' : 'Ready?')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-rose-500 w-10 h-10 rounded-full flex items-center justify-center transition-all group"
          >
            <i className="fas fa-times text-lg group-hover:scale-110"></i>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center relative border-b border-slate-100 p-8">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-white shadow-xl border-4 transition-all duration-500 ${isActive ? 'border-indigo-500 scale-110' : 'border-slate-200'}`}>
              <i className={`fas fa-microphone-lines text-5xl ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}></i>
            </div>
            
            <div className="mt-8 text-center px-6">
              <h4 className={`text-lg font-bold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {isActive 
                  ? (isRtl ? 'أنا أسمعك الآن، تفضل بسؤالك' : 'I hear you, ask away')
                  : (isRtl ? 'اضغط على الزر بالأسفل لبدء التحدث' : 'Press button below to start')}
              </h4>
            </div>
          </div>

          <div className="h-48 bg-white p-6 border-t border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">Captions</span>
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar italic text-slate-600 text-sm leading-relaxed"
            >
              {transcriptions.length === 0 ? (
                <p className="text-slate-300 text-center mt-4">
                  {isActive ? (isRtl ? "جاري الاستماع..." : "Listening...") : (isRtl ? "في انتظار بدء الجلسة" : "Waiting...")}
                </p>
              ) : (
                transcriptions.map((t, idx) => (
                  <p key={idx} className="mb-2 p-2 bg-slate-50 rounded-lg border-l-2 border-indigo-400">{t}</p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex justify-center border-t border-slate-200 flex-shrink-0">
          <button 
            onClick={toggleSession}
            className={`px-12 py-4 rounded-full font-black text-lg shadow-xl transition-all flex items-center gap-3 ${
              isActive 
                ? 'bg-rose-500 text-white hover:bg-rose-600' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
            }`}
          >
            <i className={`fas ${isActive ? 'fa-phone-slash' : 'fa-headset'}`}></i>
            <span>
              {isActive ? (isRtl ? 'إنهاء الجلسة' : 'End Session') : (isRtl ? 'ابدأ التحدث الآن' : 'Start Talking')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
