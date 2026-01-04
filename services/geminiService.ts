
import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
import { Language, ChatMessage } from "../types";
import { SYSTEM_PROMPT } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;
  private chatInstance: Chat | null = null;
  private language: Language;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(lang: Language) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.language = lang;
  }

  public initChat() {
    this.chatInstance = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_PROMPT(this.language),
        temperature: 0.7,
      },
    });
  }

  public async sendMessage(message: string, images?: string[]): Promise<string> {
    if (!this.chatInstance) this.initChat();
    const result = await this.chatInstance!.sendMessage({ message });
    return result.text || "Error communicating with teacher.";
  }

  public async generatePhysicsDrawing(prompt: string): Promise<{ text: string, imageUrl?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `المطلوب: رسم توضيحي لموضوع: ${prompt}. 
      1. قدم شرحاً نصياً مختصراً عما سيعرضه الرسم.
      2. سأقوم باستخدام موديل لتوليد الصورة بناءً على وصفك.`,
      config: { systemInstruction: SYSTEM_PROMPT(this.language) }
    });

    const text = response.text || "";

    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clear, high-quality educational physics diagram showing ${prompt}. White background, professional textbook style. IMPORTANT: All text, labels, and symbols inside the drawing MUST be in English only. Do NOT use any Arabic characters or text inside the drawing.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    let imageUrl: string | undefined;
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    return { text, imageUrl };
  }

  public stopSpeech() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }
  }

  public async speak(text: string, onAudioStart?: () => void): Promise<void> {
    try {
      this.stopSpeech();

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const cleanText = text.replace(/[*#_$~]/g, '').trim();

      // CRITICAL UPDATE: Explicit instruction for constant speed and preventing acceleration.
      const ttsInstruction = `
        أنتِ معلمة فيزياء وقورة. 
        المهمة: قراءة النص برتم "طبيعي ومعتدل وثابت تماماً" (Strictly Constant and Balanced Pace). 
        قاعدة صارمة: يُمنع منعاً باتاً زيادة سرعة الكلام في منتصف النص أو نهايته. 
        يجب أن تكون السرعة في أول جملة هي نفس السرعة في آخر جملة دون أي انحراف. 
        تحدثي بوضوح تام وهدوء مستمر دون تسرع.
        النص هو: ${cleanText}
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsInstruction }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBuffer = await this.decodeAudioData(this.decodeBase64(base64Audio));
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        this.currentSource = source;
        
        if (onAudioStart) onAudioStart();
        
        source.start();
        
        return new Promise((resolve) => {
          source.onended = () => {
            this.currentSource = null;
            resolve();
          };
        });
      }
    } catch (error) {
      console.error("Speech synthesis failed:", error);
    }
  }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array): Promise<AudioBuffer> {
    const numChannels = 1;
    const sampleRate = 24000;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = this.audioContext!.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  public async getQuiz(topic: string): Promise<string> {
    const prompt = `Generate a quiz for ${topic} including MCQ, True/False with reasoning, and a critical thinking question. Provide it in ${this.language === Language.AR ? 'Arabic' : 'English'}.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT(this.language) }
    });
    return response.text || "";
  }
}
