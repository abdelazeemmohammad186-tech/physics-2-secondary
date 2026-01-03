
export enum Language {
  AR = 'ar',
  EN = 'en'
}

export interface SyllabusItem {
  id: string;
  titleAr: string;
  titleEn: string;
  type: 'unit' | 'chapter';
  children?: SyllabusItem[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  images?: string[];
}

export interface TeacherState {
  currentUnit?: string;
  currentChapter?: string;
  language: Language;
}
