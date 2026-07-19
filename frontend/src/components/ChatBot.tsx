import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Camera, Mic, MicOff, Volume2, HelpCircle, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { chatApi } from '../services/api';

interface ChatBotProps {
  userRole: string;
  currentLocation: string;
  preferredLanguage: string;
  onLanguageChange?: (lang: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  image?: string;
  incidentId?: number;
}

export const ChatBot: React.FC<ChatBotProps> = ({
  userRole,
  currentLocation,
  preferredLanguage = 'en',
  onLanguageChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = preferredLanguage === 'es' ? 'es-ES' : 
               preferredLanguage === 'fr' ? 'fr-FR' : 
               preferredLanguage === 'ar' ? 'ar-SA' : 
               preferredLanguage === 'hi' ? 'hi-IN' : 
               preferredLanguage === 'ur' ? 'ur-PK' : 
               preferredLanguage === 'pt' ? 'pt-PT' : 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [preferredLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeTexts: Record<string, string> = {
        en: `Welcome to StadiumIQ! As the ${userRole.toUpperCase()} assistant, how can I help you in ${currentLocation} today?`,
        es: `¡Bienvenido a StadiumIQ! Como asistente de ${userRole.toUpperCase()}, ¿cómo puedo ayudarte en ${currentLocation} hoy?`,
        fr: `Bienvenue sur StadiumIQ ! En tant qu'assistant ${userRole.toUpperCase()}, comment puis-je vous aider à ${currentLocation} aujourd'hui ?`,
        ar: `مرحبًا بك في StadiumIQ! بصفتي مساعد ${userRole.toUpperCase()}، كيف يمكنني مساعدتك في ${currentLocation} اليوم؟`,
        hi: `StadiumIQ में आपका स्वागत है! ${userRole.toUpperCase()} सहायक के रूप में, आज मैं ${currentLocation} में आपकी क्या सहायता कर सकता हूँ?`,
        ur: `StadiumIQ میں خوش آمدید! بطور ${userRole.toUpperCase()} معاون، میں آج ${currentLocation} میں آپ کی کیا مدد کر سکتا ہوں؟`,
        pt: `Bem-vindo ao StadiumIQ! Como assistente de ${userRole.toUpperCase()}, como posso ajudá-lo em ${currentLocation} hoje?`,
      };

      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: welcomeTexts[preferredLanguage] || welcomeTexts['en'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [userRole, currentLocation, preferredLanguage]);

  const handleSend = async () => {
    if (!inputText.trim() && !imagePreview) return;

    const userMsgText = inputText;
    const userImg = imagePreview;
    const currentFile = rawFile;

    const newMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: userImg || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setImagePreview(null);
    setRawFile(null);
    setIsLoading(false);

    setIsLoading(true);
    let cloudImageUrl: string | null = null;
    let base64Fallback: string | null = null;

    // 1. Handle production Cloud Storage upload
    if (userImg && currentFile) {
      try {
        const storageRef = ref(storage, `incidents/${Date.now()}_${currentFile.name}`);
        const uploadResult = await uploadBytes(storageRef, currentFile);
        cloudImageUrl = await getDownloadURL(uploadResult.ref);
      } catch (err) {
        console.warn("Firebase Storage upload failed. Falling back to local base64 pipeline:", err);
        base64Fallback = userImg;
      }
    }

    try {
      // 2. Call backend proxy endpoint
      // Update Axios schema to pass parameters
      const data = await chatApi.sendMessage(
        userMsgText,
        currentLocation,
        base64Fallback || cloudImageUrl // Pass base64 or storage url
      );
      
      const botMessage: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        incidentId: data.incident_created ? data.incident_id : undefined
      };

      setMessages(prev => [...prev, botMessage]);

      if (data.incident_created) {
        speakResponse(`Incident reported and logged on operations dashboard.`);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'bot',
          text: "I'm having trouble connecting to StadiumIQ servers. Please try again shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const cleanText = text.replace(/[#_*\[\]]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = preferredLanguage === 'es' ? 'es-ES' : 
                       preferredLanguage === 'fr' ? 'fr-FR' : 
                       preferredLanguage === 'ar' ? 'ar-SA' : 
                       preferredLanguage === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark rounded-full shadow-lg shadow-fifa-accent/35 flex items-center justify-center z-50 transition-all duration-300 transform hover:scale-110 pulse-green"
          aria-label="Open StadiumIQ assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] md:w-[400px] h-[550px] max-h-[calc(100vh-100px)] glass-card rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden animate-fade-in border border-white/10">
          
          <div className="bg-fifa-card/90 px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-fifa-accent animate-pulse-slow"></div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">StadiumIQ Assistant</h3>
                <span className="text-[10px] text-fifa-textSecondary capitalize">Role: {userRole} • {currentLocation}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={preferredLanguage}
                onChange={(e) => onLanguageChange?.(e.target.value)}
                className="bg-slate-800 text-white border border-white/10 rounded px-1.5 py-0.5 text-[10px]"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="hi">हिन्दी</option>
                <option value="ur">اردو</option>
                <option value="pt">Português</option>
              </select>
              <button
                onClick={() => setIsOpen(false)}
                className="text-fifa-textSecondary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-fifa-accent text-fifa-dark font-medium rounded-tr-none'
                      : 'bg-fifa-card text-white border border-white/5 rounded-tl-none'
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded report"
                      className="rounded-lg max-h-32 object-cover mb-2 border border-black/10"
                    />
                  )}
                  <p>{msg.text}</p>
                  
                  {msg.incidentId && (
                    <div className="mt-2 bg-red-950/40 border border-red-900/60 p-2 rounded-lg text-[10px] text-red-300">
                      🚨 Incident filed automatically: <strong>Incident #{msg.incidentId}</strong>. 
                      Response crew alerted.
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[9px] text-fifa-textSecondary">{msg.timestamp}</span>
                  {msg.sender === 'bot' && (
                    <button
                      onClick={() => speakResponse(msg.text)}
                      className="text-fifa-textSecondary hover:text-white transition-colors"
                      title="Speak response"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-fifa-textSecondary">
                <Loader2 className="w-4 h-4 animate-spin text-fifa-accent" />
                <span className="text-[11px]">Gemini is analyzing context...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div className="bg-slate-900/90 border-t border-white/5 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={imagePreview} className="w-10 h-10 object-cover rounded border border-white/10" alt="upload preview" />
                <span className="text-[10px] text-fifa-textSecondary">Photo attached. Storage sync active.</span>
              </div>
              <button onClick={() => { setImagePreview(null); setRawFile(null); }} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-fifa-card/90 p-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-fifa-textSecondary hover:text-white rounded-lg transition-colors"
              title="Upload stadium CCTV / Photo"
            >
              <Camera className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-slate-800 hover:bg-slate-700 text-fifa-textSecondary hover:text-white'
              }`}
              title="Speak voice command"
            >
              {isRecording ? <MicOff className="w-4.5 h-4.5 animate-pulse" /> : <Mic className="w-4.5 h-4.5" />}
            </button>

            <input
              type="text"
              placeholder={isRecording ? "Listening..." : "Ask Gate C, halal food, dizziness..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder-fifa-textSecondary focus:outline-none focus:border-fifa-accent"
            />

            <button
              onClick={handleSend}
              className="p-2 bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark rounded-lg font-bold transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default ChatBot;
