import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  FileText, 
  Upload, 
  Languages, 
  CheckCircle2, 
  Loader2, 
  Download,
  AlertCircle,
  ArrowRight,
  History,
  Maximize2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument, rgb } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LogOut, User, Mail, Lock, Loader } from 'lucide-react';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Configuração do Worker do PDF.js para react-pdf
console.log('PDF.js version:', pdfjs.version);
const WORKER_URL = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
console.log('Worker URL:', WORKER_URL);
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;

const LANGUAGES = [
  "Portuguese", "English", "Spanish", "French", "German", "Italian", "Japanese", "Chinese"
];

const Login: React.FC<{ onSession: (session: Session | null) => void }> = ({ onSession }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSession(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onSession(data.session);
        } else {
          setError("Check your email for the confirmation link.");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
            <Languages className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Lumina PDF</h1>
          <p className="text-gray-400 text-center">
            {isLogin ? 'Welcome back! Sign in to continue.' : 'Create an account to start translating.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface TextBlock {
  id: string;
  text_original: string;
  text_translated: string;
  tx: number;
  ty: number;
  width: number;
  height: number;
  fontSize: number;
  color: { r: number; g: number; b: number };
  page_num: number;
}

interface EditSession {
  taskId: string;
  filename: string;
  targetLang: string;
  pages: {
    page_num: number;
    width: number;
    height: number;
    blocks: TextBlock[];
    imageUrl: string;
  }[];
  docDNA: any;
  originalArrayBuffer: ArrayBuffer;
}

interface TranslationTask {
  id: string;
  filename: string;
  status: 'idle' | 'uploading' | 'processing' | 'editing' | 'completed' | 'error';
  progress: number;
  message?: string;
  targetLang: string;
  originalUrl?: string;
  resultUrl?: string;
  session?: EditSession;
}

interface EditableBlockProps {
  block: TextBlock;
  onUpdate: (text: string) => void;
  docDNA: any;
  targetLang: string;
  pageHeight: number;
}

const EditableBlock: React.FC<EditableBlockProps> = ({ block, onUpdate, docDNA, targetLang, pageHeight }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }), []);

  const handleAIAction = async (action: 'shorten' | 'tone' | 'original') => {
    setIsProcessing(true);
    setIsMenuOpen(false);
    try {
      let result = "";
      if (action === 'shorten') {
        const maxChars = Math.floor(block.width / (block.fontSize * 0.45));
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Rewrite in ${targetLang} (max ${maxChars} chars): ${block.text_translated}`,
          config: { systemInstruction: `You are a Semantic Compression Editor. Reduce length without losing meaning. Return ONLY text.` }
        });
        result = response.text.trim();
      } else if (action === 'tone') {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Change the tone of this translation to be more ${docDNA.tom === 'Formal' ? 'Informal' : 'Formal'}: ${block.text_translated}`,
          config: { systemInstruction: `You are a Tone Adjustment Expert. Return ONLY the adjusted text.` }
        });
        result = response.text.trim();
      } else if (action === 'original') {
        alert(`Original Text: ${block.text_original}`);
        setIsProcessing(false);
        return;
      }
      onUpdate(result);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  return (
    <div 
      className="absolute group"
      style={{
        left: block.tx,
        top: pageHeight - block.ty - block.height, // Convert bottom-up to top-down
        width: block.width,
        height: block.height,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setIsMenuOpen(true);
      }}
    >
      <textarea
        value={block.text_translated}
        onChange={(e) => onUpdate(e.target.value)}
        className={cn(
          "w-full h-full p-0 m-0 border border-transparent hover:border-blue-400/50 hover:bg-blue-50/20 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden transition-all text-left leading-tight",
          isProcessing && "opacity-50 animate-pulse"
        )}
        style={{
          fontSize: `${block.fontSize}px`,
          color: `rgb(${block.color.r}, ${block.color.g}, ${block.color.b})`,
          backgroundColor: `rgba(${block.color.r}, ${block.color.g}, ${block.color.b}, 0.1)`
        }}
      />
      
      {isMenuOpen && (
        <div className="fixed z-[100] bg-white border border-black shadow-2xl py-2 min-w-[200px] text-[10px] uppercase font-bold tracking-widest" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="px-4 py-1 opacity-40 text-[8px]">AI Maestro Actions</div>
          <button onClick={() => handleAIAction('shorten')} className="w-full text-left px-4 py-2 hover:bg-black hover:text-white flex items-center gap-2">
            ✨ Encurtar para caber
          </button>
          <button onClick={() => handleAIAction('tone')} className="w-full text-left px-4 py-2 hover:bg-black hover:text-white flex items-center gap-2">
            🎭 Mudar tom
          </button>
          <button onClick={() => handleAIAction('original')} className="w-full text-left px-4 py-2 hover:bg-black hover:text-white flex items-center gap-2">
            🔍 Ver original
          </button>
          <div className="border-t border-black/10 my-1" />
          <button onClick={() => setIsMenuOpen(false)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600">
            Fechar Menu
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<TranslationTask[]>([]);
  const [selectedLang, setSelectedLang] = useState("Portuguese");
  const [activeComparison, setActiveComparison] = useState<TranslationTask | null>(null);
  const [activeSession, setActiveSession] = useState<EditSession | null>(null);
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!session) {
    return <Login onSession={setSession} />;
  }

  // WebSocket Listener Effect
  useEffect(() => {
    tasks.forEach(task => {
      if (task.status === 'processing' && !socketsRef.current.has(task.id)) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/${task.id}`);
        
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, progress: data.percentage, message: data.message, status: data.status } : t
          ));
          
          if (data.status === 'completed') {
            socket.close();
            socketsRef.current.delete(task.id);
          }
        };

        socketsRef.current.set(task.id, socket);
      }
    });

    return () => {
      // Cleanup on unmount
      if (tasks.length === 0) {
        socketsRef.current.forEach(s => s.close());
        socketsRef.current.clear();
      }
    };
  }, [tasks]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const newTask: TranslationTask = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      status: 'uploading',
      progress: 0,
      message: "Uploading...",
      targetLang: selectedLang,
      originalUrl: URL.createObjectURL(file)
    };

    setTasks(prev => [newTask, ...prev]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLang', selectedLang);

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      const { taskId } = await response.json();

      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, id: taskId, status: 'processing', message: "Initializing engine..." } : t));
      await processTranslation(taskId, file, selectedLang);

    } catch (error) {
      console.error(error);
      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, status: 'error', message: "Upload failed" } : t));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const cleanJSON = (text: string) => {
    const start = Math.min(
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
      text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
    );
    const end = Math.max(
      text.lastIndexOf('}'),
      text.lastIndexOf(']')
    );
    if (start === Infinity || end === -1) return text;
    return text.slice(start, end + 1);
  };

  // --- FASE 1: ANALISTA DE DNA ---
  const processTranslation = async (taskId: string, file: File, targetLang: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const socket = socketsRef.current.get(taskId);

    const notify = (percentage: number, message: string, status: string = 'processing') => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ percentage, message, status }));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: percentage, message, status: status as any } : t));
      }
    };
    
    try {
      notify(2, "Maestro: Initializing Elite Pipeline...");
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfData = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjs.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      // --- FASE 1: ANALISTA DE DNA ---
      notify(5, "Fase 1: Extracting Document DNA...");
      let sampleText = "";
      for (let i = 1; i <= Math.min(2, totalPages); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        sampleText += content.items.map((item: any) => item.str).join(" ");
      }
      
      const dnaResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this text and return ONLY JSON with: dominio, tom, glossario (10 terms), instrucao_estilo. \n\nText: ${sampleText.slice(0, 3000)}`,
        config: { responseMimeType: "application/json" }
      });
      if (!dnaResponse.text) throw new Error("DNA analysis failed: Empty response");
      const docDNA = JSON.parse(cleanJSON(dnaResponse.text));
      notify(10, `DNA: ${docDNA.dominio} | Tone: ${docDNA.tom}`);

      const sessionPages: EditSession['pages'] = [];

      for (let i = 1; i <= totalPages; i++) {
        const pageProgress = 10 + Math.round((i / totalPages) * 80);
        notify(pageProgress, `Processing Page ${i}: Orchestrating Agents...`);
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Escala maior para melhor OCR
        const textContent = await page.getTextContent();
        const editPage = pdfDoc.getPages()[i - 1];
        const { width: pageWidth, height: pageHeight } = editPage.getSize();

        // Renderiza a página para detecção de cor e OCR multimodal
        const pageCanvas = document.createElement('canvas');
        const pageContext = pageCanvas.getContext('2d', { willReadFrequently: true });
        if (!pageContext) continue;
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;
        await (page as any).render({ canvasContext: pageContext, viewport }).promise;
        const pageImageData = pageContext.getImageData(0, 0, pageCanvas.width, pageCanvas.height);

        let blocks: any[] = [];

        // --- CHECAGEM INTELIGENTE: Texto Nativo vs Scan ---
        const nativeText = textContent.items.map((item: any) => item.str).join("").trim();
        
        if (nativeText.length < 50) {
          notify(pageProgress, `Page ${i}: Scanned image detected. Starting Multimodal OCR...`);
          const base64Image = pageCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          
          const ocrResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
              { text: "Extract all text blocks from this document image. For each block, provide the text and its bounding box in percentages relative to the image size (x, y, width, height). Return ONLY a JSON array of objects: [{\"text\": \"...\", \"x\": 0, \"y\": 0, \"w\": 0, \"h\": 0}]" }
            ],
            config: { responseMimeType: "application/json" }
          });
          
          if (!ocrResponse.text) throw new Error("OCR failed: Empty response");
          const extractedBlocks = JSON.parse(cleanJSON(ocrResponse.text));
          blocks = extractedBlocks.map((b: any, idx: number) => ({
            id: `p${i}_b${idx}`,
            str: b.text,
            tx: (b.x / 100) * pageWidth,
            ty: pageHeight - ((b.y / 100) * pageHeight) - ((b.h / 100) * pageHeight), // Inverte Y para pdf-lib
            width: (b.w / 100) * pageWidth,
            height: (b.h / 100) * pageHeight,
            fontSize: ((b.h / 100) * pageHeight) * 0.8,
            page_num: i
          }));
        } else {
          notify(pageProgress, `Page ${i}: Native text detected.`);
          blocks = (textContent.items as any[]).map((item, idx) => {
            const [scaleX, skewX, skewY, scaleY, tx, ty] = item.transform;
            const fontSize = Math.sqrt(scaleX * scaleX + skewX * skewX);
            return {
              id: `p${i}_b${idx}`,
              str: item.str,
              tx,
              ty,
              width: item.width || (item.str.length * fontSize * 0.5),
              height: fontSize * 1.2,
              fontSize,
              page_num: i
            };
          });
        }

        const pageBlocks: TextBlock[] = [];

        for (const block of blocks) {
          const originalText = block.str.trim();
          if (!originalText) continue;

          // --- FASE 1.5: REVISÃO DE OCR ---
          const correctedText = await reviewOCR(ai, originalText, docDNA.dominio);

          // --- FASE 2: TRADUTOR DE ALTA FIDELIDADE ---
          let translated = await translateText(ai, correctedText, targetLang, docDNA);

          // --- FASE 3: EDITOR DE COMPRESSÃO ---
          const maxChars = Math.floor(block.width / (block.fontSize * 0.45));
          if (translated.length > maxChars && translated.length > originalText.length) {
            translated = await compressText(ai, translated, targetLang, maxChars, docDNA.dominio);
          }

          // --- FASE 4: LIMPEZA (Inpainting/Redação) ---
          let bgColor = { r: 255, g: 255, b: 255 };
          
          const canvasX = Math.floor((block.tx / pageWidth) * pageCanvas.width);
          const canvasY = Math.floor((1 - (block.ty / pageHeight)) * pageCanvas.height) - Math.floor((block.height / pageHeight) * pageCanvas.height);
          const canvasW = Math.floor((block.width / pageWidth) * pageCanvas.width);
          const canvasH = Math.floor((block.height / pageHeight) * pageCanvas.height);

          const colorCounts: Record<string, number> = {};
          let maxCount = 0;

          for (let x = canvasX; x < canvasX + canvasW && x < pageCanvas.width; x++) {
            for (let y = canvasY; y < canvasY + canvasH && y < pageCanvas.height; y++) {
              const idx = (y * pageCanvas.width + x) * 4;
              const r = pageImageData.data[idx];
              const g = pageImageData.data[idx+1];
              const b = pageImageData.data[idx+2];
              const key = `${r},${g},${b}`;
              colorCounts[key] = (colorCounts[key] || 0) + 1;
              if (colorCounts[key] > maxCount) {
                maxCount = colorCounts[key];
                bgColor = { r, g, b };
              }
            }
          }

          pageBlocks.push({
            id: block.id,
            text_original: originalText,
            text_translated: translated,
            tx: block.tx,
            ty: block.ty,
            width: block.width,
            height: block.height,
            fontSize: block.fontSize,
            color: bgColor,
            page_num: i
          });
        }

        sessionPages.push({
          page_num: i,
          width: pageWidth,
          height: pageHeight,
          blocks: pageBlocks,
          imageUrl: pageCanvas.toDataURL('image/jpeg', 0.9)
        });
      }

      const session: EditSession = {
        taskId,
        filename: file.name,
        targetLang,
        pages: sessionPages,
        docDNA,
        originalArrayBuffer: arrayBuffer
      };

      notify(95, "Maestro: Preparing Interactive Editor...");
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'editing', session, progress: 95, message: "Ready for Elite Review" } : t));
      setActiveSession(session);

    } catch (error) {
      console.error("Maestro Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Maestro failed";
      notify(0, `Maestro Error: ${errorMessage}`, 'error');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', message: errorMessage } : t));
    }
  };

  const reviewOCR = async (ai: any, text: string, dominio: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Review and fix potential OCR errors in this text from a ${dominio} document. Return ONLY the corrected text. \n\nText: ${text}`,
      config: {
        systemInstruction: "You are an OCR Correction Expert. Fix typos, broken words, and punctuation while maintaining the original meaning."
      }
    });
    return response.text.trim();
  };

  const translateText = async (ai: any, text: string, targetLang: string, dna: any) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        systemInstruction: `You are an Elite Translator in ${dna.dominio}. Tone: ${dna.tom}. Glossary: ${JSON.stringify(dna.glossario)}. Style: ${dna.instrucao_estilo}. Translate to ${targetLang}. Return ONLY text.`
      }
    });
    return response.text.trim();
  };

  const compressText = async (ai: any, text: string, targetLang: string, maxChars: number, dominio: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite in ${targetLang} (max ${maxChars} chars): ${text}`,
      config: {
        systemInstruction: `You are a Semantic Compression Editor in ${dominio}. Reduce length without losing technical meaning. Return ONLY text.`
      }
    });
    return response.text.trim();
  };

  const finalizePDF = async (session: EditSession) => {
    const taskId = session.taskId;
    const notify = (percentage: number, message: string, status: string = 'processing') => {
      const socket = socketsRef.current.get(taskId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ percentage, message, status }));
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: percentage, message, status: status as any } : t));
    };

    try {
      notify(96, "Finalizing: Reconstructing PDF with your edits...");
      const pdfDoc = await PDFDocument.load(session.originalArrayBuffer);
      
      for (const pageSession of session.pages) {
        const editPage = pdfDoc.getPages()[pageSession.page_num - 1];
        
        for (const block of pageSession.blocks) {
          // Inpainting
          editPage.drawRectangle({
            x: block.tx,
            y: block.ty,
            width: block.width,
            height: block.height,
            color: rgb(block.color.r/255, block.color.g/255, block.color.b/255),
          });

          // Text Reconstruction
          let currentFontSize = block.fontSize;
          let fits = false;
          while (!fits && currentFontSize > 5) {
            try {
              editPage.drawText(block.text_translated, {
                x: block.tx,
                y: block.ty + (block.fontSize - currentFontSize) / 2,
                size: currentFontSize,
                maxWidth: block.width,
                lineHeight: currentFontSize,
              });
              fits = true;
            } catch (e) {
              currentFontSize -= 0.5;
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      notify(100, "Mission Accomplished.", 'completed');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', resultUrl: url, progress: 100, message: "Elite Translation Complete" } : t));
      setActiveSession(null);
      
      await fetch(`/api/complete/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputUrl: url })
      });

    } catch (error) {
      console.error("Finalize Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Finalization failed";
      notify(0, `Finalization Error: ${errorMessage}`, 'error');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', message: errorMessage } : t));
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-black p-8 flex justify-between items-end bg-[#E4E3E0] sticky top-0 z-10">
        <div>
          <h1 className="font-serif italic text-6xl tracking-tighter leading-none">Lumina</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] mt-3 opacity-50 font-mono">Zero Intervention PDF Engine</p>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase opacity-40 font-mono mb-1">Target Language</span>
            <select 
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent border-none font-mono text-sm focus:ring-0 cursor-pointer p-0 text-right"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="h-10 w-[1px] bg-black/10" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase opacity-40 font-mono mb-1">User</span>
              <span className="text-xs font-mono font-bold">{session?.user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-black hover:text-white rounded-full transition-all border border-black/10"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Upload Area (Passo 3 do PDF) */}
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed border-black/20 rounded-2xl p-16 mb-12 transition-all cursor-pointer flex flex-col items-center justify-center gap-4",
            isDragActive ? "bg-black text-white border-black" : "hover:border-black hover:bg-white/50"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn("p-4 rounded-full border border-current", isDragActive && "animate-bounce")}>
            <Upload size={32} />
          </div>
          <div className="text-center">
            <p className="text-xl font-serif italic">
              {isDragActive ? "Drop the PDF here..." : "Drag & drop your PDF or click to browse"}
            </p>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mt-2">Maximum file size: 25MB</p>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-1">
          <div className="grid grid-cols-4 px-4 py-2 opacity-40 text-[10px] uppercase tracking-widest font-mono border-b border-black/10">
            <div>Project</div>
            <div>Language</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="data-row group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black/5 rounded flex items-center justify-center">
                    <FileText size={14} className="opacity-40" />
                  </div>
                  <span className="truncate font-medium text-sm">{task.filename}</span>
                </div>
                <div className="data-value flex items-center gap-2 opacity-60">
                  {task.targetLang}
                </div>
                <div className="flex items-center gap-3">
                  {task.status === 'processing' && (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-black" 
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="data-value text-[10px]">{task.progress}%</span>
                      </div>
                      <span className="text-[9px] uppercase font-mono opacity-50 animate-pulse">
                        {task.message}
                      </span>
                    </div>
                  )}
                  {task.status === 'editing' && (
                    <span className="text-xs uppercase font-bold tracking-tighter flex items-center gap-1 text-blue-600">
                      <History size={12} /> Ready for Review
                    </span>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-xs uppercase font-bold tracking-tighter flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-600" /> Finished
                    </span>
                  )}
                  {task.status === 'error' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase font-bold tracking-tighter text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Error
                      </span>
                      <span className="text-[9px] text-red-400 font-mono truncate max-w-[200px]">
                        {task.message}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4">
                  {task.status === 'editing' && (
                    <button 
                      onClick={() => setActiveSession(task.session!)}
                      className="text-[10px] uppercase font-bold tracking-widest bg-black text-white px-3 py-1 rounded hover:bg-black/80 flex items-center gap-1"
                    >
                      <Maximize2 size={12} /> Edit & Review
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <>
                      <button 
                        onClick={() => setActiveComparison(task)}
                        className="text-[10px] uppercase font-bold tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Maximize2 size={12} /> Compare
                      </button>
                      <a 
                        href={task.resultUrl} 
                        download={`translated_${task.filename}`}
                        className="text-[10px] uppercase font-bold tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Download size={12} /> Save
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Interactive Editor Modal */}
      <AnimatePresence>
        {activeSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#E4E3E0] flex flex-col"
          >
            <div className="p-6 border-b border-black flex justify-between items-center bg-white/80 backdrop-blur">
              <div className="flex items-center gap-4">
                <h2 className="font-serif italic text-2xl">Elite Interactive Editor</h2>
                <span className="text-[10px] uppercase tracking-widest opacity-40 font-mono">
                  {activeSession.filename} — {activeSession.targetLang}
                </span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => finalizePDF(activeSession)}
                  className="bg-black text-white px-6 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest hover:bg-black/80 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> Finalize & Export
                </button>
                <button 
                  onClick={() => setActiveSession(null)}
                  className="p-2 hover:bg-black hover:text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-12 bg-gray-200/50">
              <div className="max-w-4xl mx-auto space-y-12">
                {activeSession.pages.map((page) => (
                  <div key={page.page_num} className="relative mx-auto shadow-2xl bg-white" style={{ width: page.width, height: page.height }}>
                    <img src={page.imageUrl} className="absolute inset-0 w-full h-full pointer-events-none" alt={`Page ${page.page_num}`} />
                    
                    {page.blocks.map((block) => (
                      <EditableBlock 
                        key={block.id} 
                        block={block} 
                        docDNA={activeSession.docDNA}
                        targetLang={activeSession.targetLang}
                        pageHeight={page.height}
                        onUpdate={(newText) => {
                          const updatedSession = { ...activeSession };
                          const pageIdx = updatedSession.pages.findIndex(p => p.page_num === page.page_num);
                          const blockIdx = updatedSession.pages[pageIdx].blocks.findIndex(b => b.id === block.id);
                          updatedSession.pages[pageIdx].blocks[blockIdx].text_translated = newText;
                          setActiveSession(updatedSession);
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal (Side-by-Side Preview) */}
      <AnimatePresence>
        {activeComparison && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#E4E3E0] flex flex-col"
          >
            <div className="p-6 border-b border-black flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="font-serif italic text-2xl">Side-by-Side Analysis</h2>
                <span className="text-[10px] uppercase tracking-widest opacity-40 font-mono">
                  {activeComparison.filename} — {activeComparison.targetLang}
                </span>
              </div>
              <button 
                onClick={() => setActiveComparison(null)}
                className="p-2 hover:bg-black hover:text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Original */}
              <div className="flex-1 border-r border-black overflow-auto p-8 bg-white/30">
                <div className="max-w-2xl mx-auto">
                  <p className="text-[9px] uppercase tracking-widest opacity-40 mb-4 font-mono text-center">Original Source</p>
                  <Document file={activeComparison.originalUrl}>
                    <Page pageNumber={1} width={500} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
              </div>
              
              {/* Translated */}
              <div className="flex-1 overflow-auto p-8 bg-white/50">
                <div className="max-w-2xl mx-auto">
                  <p className="text-[9px] uppercase tracking-widest text-green-600 mb-4 font-mono text-center font-bold">AI Translated (Layout Preserved)</p>
                  <Document file={activeComparison.resultUrl}>
                    <Page pageNumber={1} width={500} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="p-8 border-t border-black flex justify-between items-center text-[9px] uppercase tracking-[0.4em] opacity-30 font-mono">
        <div>Lumina PDF Engine // Build 2026.03</div>
        <div className="flex gap-12">
          <span>Neural Translation</span>
          <span>Semantic Compression</span>
          <span>Layout Preservation</span>
        </div>
      </footer>
    </div>
  );
}
