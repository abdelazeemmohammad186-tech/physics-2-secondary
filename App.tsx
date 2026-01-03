
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Language } from './types';
import { GeminiService } from './services/geminiService';
import Sidebar from './components/Sidebar';
import ChatInterface, { ChatInterfaceHandle } from './components/ChatInterface';
import LiveSession from './components/LiveSession';
import { SYLLABUS } from './constants';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.AR);
  const [activeChapter, setActiveChapter] = useState<string | undefined>();
  const [currentPart, setCurrentPart] = useState<number>(1);
  const [exerciseIndex, setExerciseIndex] = useState<number>(0); // 0 means not started
  const [autoMessage, setAutoMessage] = useState<string | undefined>();
  const [showLive, setShowLive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  
  const chatRef = useRef<ChatInterfaceHandle>(null);

  const geminiService = useMemo(() => {
    const service = new GeminiService(language);
    service.initChat();
    return service;
  }, [language]);

  const isRtl = language === Language.AR;

  const handleChapterSelect = (chapterId: string) => {
    if (isBusy) return;
    chatRef.current?.clearMessages();
    setActiveChapter(chapterId);
    setCurrentPart(1);
    setExerciseIndex(0);
  };

  const handleNextPart = () => {
    if (isBusy || !activeChapter || currentPart >= 4) return;
    
    // Clear chat when moving to next part to avoid overlapping text
    chatRef.current?.clearMessages();
    
    const nextPart = currentPart + 1;
    setCurrentPart(nextPart);
    
    const chapter = SYLLABUS.flatMap(u => u.children || []).find(c => c.id === activeChapter);
    if (chapter) {
      const chapterTitle = language === Language.AR ? chapter.titleAr : chapter.titleEn;
      const prompt = language === Language.AR 
        ? `أنا مستعد الآن، من فضلك اشرحي لي الجزء رقم (${nextPart}) من درس: ${chapterTitle}. بنفس الأسلوب الطبيعي والواضح.`
        : `I am ready now, please explain Part (${nextPart}) of the lesson: ${chapterTitle}. Using the same natural and clear pace.`;
      
      setAutoMessage(prompt);
      const timer = setTimeout(() => setAutoMessage(undefined), 500);
    }
  };

  const handleStartExercises = () => {
    if (isBusy || !activeChapter) return;
    
    // Clear chat when moving to exercises
    chatRef.current?.clearMessages();
    
    const nextEx = exerciseIndex + 1;
    setExerciseIndex(nextEx);
    
    const chapter = SYLLABUS.flatMap(u => u.children || []).find(c => c.id === activeChapter);
    if (chapter) {
      const chapterTitle = language === Language.AR ? chapter.titleAr : chapter.titleEn;
      const prompt = language === Language.AR 
        ? `لقد انتهينا من شرح أجزاء الدرس. لنبدأ الآن بحل "الأسئلة والتمارين" الموجودة في نهاية فصل ${chapterTitle}. من فضلك اعرضي السؤال رقم (${nextEx}) وقومي بحله معي وشرح الحل بالتفصيل برتم طبيعي وواضح.`
        : `We finished the lesson parts. Let's start solving the "Questions and Exercises" at the end of ${chapterTitle}. Please present Question (${nextEx}), solve it with me, and explain the solution in detail with a natural and clear pace.`;
      
      setAutoMessage(prompt);
      const timer = setTimeout(() => setAutoMessage(undefined), 500);
    }
  };

  const handleDrawRequest = () => {
    if (isBusy || !activeChapter) return;
    const chapter = SYLLABUS.flatMap(u => u.children || []).find(c => c.id === activeChapter);
    const chapterTitle = language === Language.AR ? chapter?.titleAr : chapter?.titleEn;
    const topic = exerciseIndex > 0 
      ? (language === Language.AR ? `السؤال رقم ${exerciseIndex}` : `Question number ${exerciseIndex}`)
      : `${chapterTitle} - Part ${currentPart}`;
    
    chatRef.current?.requestDrawing(topic);
  };

  useEffect(() => {
    if (activeChapter && currentPart === 1 && exerciseIndex === 0) {
      const chapter = SYLLABUS.flatMap(u => u.children || []).find(c => c.id === activeChapter);
      if (chapter) {
        const chapterTitle = language === Language.AR ? chapter.titleAr : chapter.titleEn;
        const prompt = language === Language.AR 
          ? `من فضلك ابدأي في تحضير وشرح الجزء الأول من: ${chapterTitle}. التزمي بتقسيم الموضوع لـ 4 أجزاء وابدأي فوراً بشرح الجزء الأول بالتفصيل وبأسلوب طبيعي وواضح.`
          : `Please start preparing and explaining Part 1 of: ${chapterTitle}. Remember to split the topic into 4 parts and start with detailed, natural and clear explanation of Part 1 now.`;
        
        setAutoMessage(prompt);
        const timer = setTimeout(() => setAutoMessage(undefined), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeChapter, language]);

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${isRtl ? 'flex-row-reverse' : 'flex-row'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar 
        language={language} 
        activeChapter={activeChapter} 
        onSelectChapter={handleChapterSelect} 
        isBusy={isBusy}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="fas fa-flask text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Physica AI</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block -mt-1">
                {isRtl ? 'الصف الثاني الثانوي' : 'Secondary 2 Teacher'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeChapter && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-indigo-600 uppercase">
                  {exerciseIndex > 0 ? (isRtl ? 'التمارين:' : 'Exercises:') : (isRtl ? 'تقدم الدرس:' : 'Lesson Progress:')}
                </span>
                <div className="flex gap-1">
                  {exerciseIndex > 0 ? (
                    <span className="text-xs font-bold text-emerald-600">Q#{exerciseIndex}</span>
                  ) : (
                    [1, 2, 3, 4].map((p) => (
                      <div key={p} className={`w-3 h-1 rounded-full ${p <= currentPart ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowLive(true)}
              className="hidden md:flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold border border-red-100 hover:bg-red-100 transition-all shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {isRtl ? 'أون إير' : 'On Air'}
            </button>

            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
              <button 
                onClick={() => !isBusy && setLanguage(Language.AR)}
                disabled={isBusy}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === Language.AR ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'} ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                العربية
              </button>
              <button 
                onClick={() => !isBusy && setLanguage(Language.EN)}
                disabled={isBusy}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === Language.EN ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'} ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                English
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
          {activeChapter && (
             <div className="flex justify-center gap-4 flex-shrink-0 animate-in fade-in slide-in-from-top-2">
               {currentPart < 4 && exerciseIndex === 0 && (
                 <button 
                   onClick={handleNextPart}
                   disabled={isBusy}
                   className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black shadow-md transition-all ${
                     isBusy 
                     ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                     : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95'
                   }`}
                 >
                   <i className={`fas ${isRtl ? 'fa-arrow-left' : 'fa-arrow-right'}`}></i>
                   <span>
                     {isRtl ? `الانتقال للجزء التالي (${currentPart + 1}/4)` : `Next Part (${currentPart + 1}/4)`}
                   </span>
                 </button>
               )}

               {(currentPart === 4 || exerciseIndex > 0) && (
                 <button 
                   onClick={handleStartExercises}
                   disabled={isBusy}
                   className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black shadow-md transition-all ${
                     isBusy 
                     ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                     : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95'
                   }`}
                 >
                   <i className="fas fa-tasks"></i>
                   <span>
                     {exerciseIndex === 0 
                       ? (isRtl ? 'بدء الأسئلة والتمارين' : 'Start Exercises') 
                       : (isRtl ? `السؤال التالي (${exerciseIndex + 1})` : `Next Question (${exerciseIndex + 1})`)}
                   </span>
                 </button>
               )}
               
               <button 
                 onClick={handleDrawRequest}
                 disabled={isBusy}
                 className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black shadow-md transition-all ${
                   isBusy 
                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                   : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 active:scale-95'
                 }`}
               >
                 <i className="fas fa-palette"></i>
                 <span>
                   {isRtl ? 'ارسمي لي' : 'Draw for me'}
                 </span>
               </button>
             </div>
          )}

          <div className="flex-1 min-h-0">
            <ChatInterface 
              ref={chatRef}
              language={language} 
              geminiService={geminiService} 
              initialMessage={autoMessage} 
              onStatusChange={setIsBusy}
              isChapterActive={!!activeChapter}
            />
          </div>
        </div>
      </main>

      {showLive && <LiveSession language={language} onClose={() => setShowLive(false)} />}
    </div>
  );
};

export default App;
