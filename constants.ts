
import { SyllabusItem, Language } from './types';

export const SYLLABUS: SyllabusItem[] = [
  {
    id: 'u1',
    titleAr: 'الوحدة الأولى: الكميات الفيزيائية ووحدات القياس',
    titleEn: 'Unit 1: Physical Quantities and Units of Measurement',
    type: 'unit',
    children: [
      {
        id: 'c1',
        titleAr: 'الفصل الأول: القياس الفيزيائي',
        titleEn: 'Chapter 1: Physical Measurement',
        type: 'chapter'
      }
    ]
  },
  {
    id: 'u2',
    titleAr: 'الوحدة الثانية: الحركة الخطية',
    titleEn: 'Unit 2: Linear Motion',
    type: 'unit',
    children: [
      {
        id: 'c2',
        titleAr: 'الفصل الثاني: الحركة في خط مستقيم',
        titleEn: 'Chapter 2: Motion in a Straight Line',
        type: 'chapter'
      },
      {
        id: 'c3',
        titleAr: 'الفصل الثالث: القوة والحركة',
        titleEn: 'Chapter 3: Force and Motion',
        type: 'chapter'
      }
    ]
  },
  {
    id: 'u3',
    titleAr: 'الوحدة الثالثة: خواص المادة',
    titleEn: 'Unit 3: Properties of Matter',
    type: 'unit',
    children: [
      {
        id: 'c4',
        titleAr: 'الفصل الرابع: خواص الموائع المتحركة',
        titleEn: 'Chapter 4: Properties of Moving Fluids',
        type: 'chapter'
      },
      {
        id: 'c5',
        titleAr: 'الفصل الخامس: خواص الموائع الساكنة',
        titleEn: 'Chapter 5: Properties of Static Fluids',
        type: 'chapter'
      }
    ]
  },
  {
    id: 'u4',
    titleAr: 'الوحدة الرابعة: الحرارة',
    titleEn: 'Unit 4: Heat',
    type: 'unit',
    children: [
      {
        id: 'c6',
        titleAr: 'الفصل السادس: قوانين الغازات',
        titleEn: 'Chapter 6: Gas Laws',
        type: 'chapter'
      }
    ]
  }
];

export const SYSTEM_PROMPT = (lang: Language) => `
أنتِ معلمة افتراضية ذكية متخصصة في الفيزياء للصف الثاني الثانوي.
اللغة الحالية: ${lang === Language.AR ? 'العربية' : 'الإنجليزية'}.

قواعد صارمة للأسلوب والأداء:
1. رتم الحديث: يجب التحدث برتم طبيعي ومعتدل و"ثابت تماماً" من بداية الشرح لنهايته. يُمنع منعاً باتاً تسريع وتيرة الكلام في النصف الثاني أو نهاية الرد.
2. المنهج: الالتزام الكامل بكتاب الفيزياء دون حذف.
3. الرموز: ممنوع منعاً باتاً استخدام رموز خارج الكتاب مثل ($, *, #, _, **) أو الإيموجي في النص. استخدمي لغة علمية نصية نظيفة جداً.
4. تقسيم المواضيع: أي موضوع طويل يُقسم إلى 4 أجزاء.
5. الأسئلة والتمارين: في نهاية كل فصل، عرض وحل الأسئلة واحداً تلو الآخر مع التعليل برتم ثابت وواضح.
6. الأمثلة: شرح الأمثلة المحلولة خطوة بخطوة بنفس الهدوء والاستقرار الصوتي.
7. الرسوم: توضيح المفاهيم بالرسم (الكتابة داخل الرسم بالإنجليزية فقط).

ملاحظة هامة: حافظي على استقرار صوتك وسرعة حديثك لتكون موحدة طوال الوقت لتجنب تشتيت الطالب.
`;
