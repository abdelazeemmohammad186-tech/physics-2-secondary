
import React from 'react';
import { SYLLABUS } from '../constants';
import { Language, SyllabusItem } from '../types';

interface SidebarProps {
  language: Language;
  onSelectChapter: (chapterId: string) => void;
  activeChapter?: string;
  isBusy?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ language, onSelectChapter, activeChapter, isBusy }) => {
  const isRtl = language === Language.AR;

  return (
    <aside className={`w-80 bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar flex flex-col ${isRtl ? 'order-last border-l border-r-0' : ''}`}>
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          <i className="fas fa-book-open"></i>
          {isRtl ? 'منهج الفيزياء' : 'Physics Syllabus'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isRtl ? 'الصف الثاني الثانوي' : '2nd Secondary Grade'}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-4">
        {SYLLABUS.map((unit) => (
          <div key={unit.id} className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              {language === Language.AR ? unit.titleAr : unit.titleEn}
            </h3>
            <div className="space-y-1">
              {unit.children?.map((chapter) => (
                <button
                  key={chapter.id}
                  disabled={isBusy}
                  onClick={() => onSelectChapter(chapter.id)}
                  className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 ${
                    activeChapter === chapter.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                      : isBusy ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fas fa-atom ${activeChapter === chapter.id ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                  <span>{language === Language.AR ? chapter.titleAr : chapter.titleEn}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 bg-slate-50 m-4 rounded-xl border border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 mb-2">{isRtl ? 'تقدمك الدراسي' : 'Study Progress'}</h4>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full w-1/4"></div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">{isRtl ? 'أكملت فصل واحد من 6 فصول' : '1 of 6 chapters completed'}</p>
      </div>
    </aside>
  );
};

export default Sidebar;
