import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Languages, 
  CheckCircle2, 
  Loader2, 
  Download,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  History,
  Maximize2,
  X,
  Layers,
  Table,
  Plus, 
  Trash2, 
  RefreshCcw,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronDown,
  Monitor,
  Activity,
  Globe,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LogOut, User, Mail, Lock, Loader, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const LANGUAGES_MAP: Record<string, string> = {
  "Portuguese": "pt",
  "Japanese": "ja",
  "Chinese": "zh",
  "French": "fr",
  "German": "de",
  "Spanish": "es"
};

const FILE_ICONS: Record<string, any> = {
  'pdf': FileText,
  'docx': FileText,
  'pptx': Layers,
  'xlsx': Table
};

const LANGUAGES = Object.keys(LANGUAGES_MAP);

const TAGLINES = [
  "Tradução Neural Avançada",
  "Conectando Culturas",
  "Inteligência Linguística",
  "Sua Janela para o Mundo",
  "Precisão sem Fronteiras",
  "O Futuro da Tradução"
];

const FLOATING_CHARS = ['A', 'あ', '文', 'Ω', 'ñ', '∑', '?', '汉', 'ẞ', 'Ç'];

const BACKGROUND_WORDS = ["DIVERSIDADE", "CONECTIVIDADE", "PRECISÃO", "INTELIGÊNCIA", "GLOBAL", "CONEXÃO", "LUMINA"];

const FloatingScript = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 mask-fade-edges">
    {FLOATING_CHARS.map((char, i) => (
      <motion.span
        key={i}
        className="absolute text-2xl font-serif text-primary/40 float-slow"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${i * 1.5}s`,
          fontSize: `${Math.random() * 20 + 20}px`
        }}
      >
        {char}
      </motion.span>
    ))}
  </div>
);

const BackgroundAtmosphere = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {/* Atmospheric Words */}
    {BACKGROUND_WORDS.map((word, i) => (
      <motion.div
        key={i}
        className="absolute text-[12vw] font-black tracking-tighter text-outline-subtle slow-drift opacity-60 select-none"
        style={{
          left: `${(i * 30) % 90}%`,
          top: `${(i * 20) % 90}%`,
          animationDelay: `${i * 5}s`,
        }}
      >
        {word}
      </motion.div>
    ))}
    
    {/* Neural Nodes */}
    {Array.from({ length: 15 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-primary/30 rounded-full neural-pulse shadow-[0_0_10px_rgba(139,92,246,0.3)]"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`
        }}
      />
    ))}
  </div>
);

const Login: React.FC<{ onSession: (session: Session | null) => void }> = ({ onSession }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSession(data.session);
      } else if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) onSession(data.session);
        else setSuccessMessage("Verifique seu email para confirmar o cadastro.");
      } else if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMessage("Link de recuperação enviado para seu e-mail.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-dark">
      <div className="mesh-bg" />
      <BackgroundAtmosphere />
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-[2.5rem] p-10 overflow-hidden relative group"
      >
        <FloatingScript />
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30 shadow-2xl shadow-primary/20 relative"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/40 blur-md animate-pulse" />
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Lumina</h1>
          <AnimatePresence mode="wait">
            <motion.p 
              key={taglineIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 0.7, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-slate-400 text-center text-xs font-bold tracking-[0.2em] uppercase h-4"
            >
              {TAGLINES[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none placeholder:text-slate-600"
              placeholder="E-mail profissional"
            />
          </div>

          {view !== 'forgot-password' && (
            <div className="space-y-2">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none placeholder:text-slate-600"
                placeholder="Senha de acesso"
              />
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-emerald-400 text-xs font-bold text-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"
            >
              {successMessage}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : (
              view === 'login' ? 'ENTRAR NO APP' : 
              view === 'signup' ? 'CADASTRAR' : 'REDEFINIR SENHA'
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4 relative z-10">
          <button 
            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
            className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {view === 'login' ? "Criar nova credencial" : "Voltar ao login principal"}
          </button>
          
          {view === 'login' && (
            <button 
              onClick={() => {
                setView('forgot-password');
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-primary/60 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Esqueci minha senha
            </button>
          )}

          {view === 'forgot-password' && (
            <button 
              onClick={() => {
                setView('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Voltar ao login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface TranslationTask {
  id: string;
  filename: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  targetLang: string;
  originalUrl?: string;
  resultUrl?: string;
  extension: string;
  metrics?: {
    characters: number;
    pages?: number;
  };
}

interface UserProfile {
  plan_type: 'free' | 'professional' | 'elite' | 'business';
  characters_used: number;
  quota_limit: number;
  files_this_month: number;
}

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tasks, setTasks] = useState<TranslationTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedLang, setSelectedLang] = useState("Portuguese");
  const [activeComparison, setActiveComparison] = useState<TranslationTask | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Dynamic card reflection logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / card.clientWidth) * 100;
    const y = ((e.clientY - rect.top) / card.clientHeight) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  };

  useEffect(() => {
    console.log("🛠️ LUMINA DASHBOARD V4.5 CARREGADO");
    // alert("SISTEMA ATUALIZADO (v4.3)"); // Desativado para não ser invasivo, mas o console vai logar
    
    const syncHistory = async () => {
      setIsSyncing(true);
      try {
        const response = await fetch("/api/azure/list-outputs");
        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          const baseUrl = import.meta.env.VITE_AZURE_STORAGE_OUTPUT_URL.split('?')[0];
          const sas = import.meta.env.VITE_AZURE_STORAGE_OUTPUT_URL.split('?')[1];
          const historicalTasks: TranslationTask[] = data.files
            .filter((f: string) => f.includes('/') && !f.endsWith('/'))
            .map((f: string) => {
              const parts = f.split('/');
              const filename = parts[parts.length - 1];
              const taskId = parts[parts.length - 2];
              return {
                id: taskId,
                filename: decodeURIComponent(filename),
                targetLang: "Portuguese",
                status: "completed",
                progress: 100,
                resultUrl: `/api/download/standard-user/${taskId}/${filename}`,
                extension: filename.split('.').pop()?.toLowerCase() || 'pdf'
              };
            });
          setTasks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            return [...prev, ...historicalTasks.filter(t => !existingIds.has(t.id))];
          });
        }
      } catch (err) { console.error(err); } finally { setIsSyncing(false); }
    };
    syncHistory();

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [session.user.id]);

  const handleDownload = async (task: TranslationTask) => {
    if (!task.resultUrl) return;
    try {
      const response = await fetch(task.resultUrl);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = task.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Erro ao baixar o arquivo. Verifique sua conexão.");
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const task = tasks.find(t => t.id === taskId);
    if (task?.resultUrl) {
      try { await fetch(task.resultUrl, { method: "DELETE", headers: { "x-ms-version": "2024-11-04" } }); } catch (e) {}
    }
    await supabase.from('translations').delete().eq('id', taskId);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    acceptedFiles.slice(0, 5).forEach(async (file) => {
      const taskId = Math.random().toString(36).substr(2, 9);
      const newTask: TranslationTask = {
        id: taskId, filename: file.name, status: 'uploading', progress: 0, message: "Inicializando...", targetLang: selectedLang, extension: file.name.split('.').pop()?.toLowerCase() || 'pdf'
      };
      setTasks(prev => [newTask, ...prev]);
      try { await processTranslation(taskId, file, selectedLang); } catch (e) {}
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const processTranslation = async (taskId: string, file: File, targetLangName: string) => {
    const notify = (p: number, m: string, s: string = 'processing') => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: p, message: m, status: s as any } : t));
    };
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetLang", targetLangName);
      const response = await fetch("/api/azure/translate-sync", { 
        method: "POST", 
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Falha no servidor");
      
      const { operationLocation, taskId: azureTaskId, userId: azureUserId } = responseData;
      
      let status = "Running";
      let attempts = 0;
      let metrics;
      while (status !== "Succeeded" && status !== "Failed" && attempts < 500) {
        await new Promise(r => setTimeout(r, 4000));
        attempts++;
        const res = await fetch(`/api/azure/status?url=${encodeURIComponent(operationLocation)}`);
        const result = await res.json();
        status = result.status;
        if (status === "Running" || status === "NotStarted") notify(40 + (attempts % 40), `Azure AI: Processando...`);
        if (status === "Failed") throw new Error("Erro na tradução");
        if (status === "Succeeded") {
          metrics = { characters: result.summary?.totalCharacters || 0, pages: result.summary?.totalSuccess || 1 };
          break;
        }
      }

      const finalUrl = `/api/download/${azureUserId}/${azureTaskId}/${encodeURIComponent(file.name)}`;
      notify(100, "Concluído", 'completed');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', resultUrl: finalUrl, progress: 100, metrics } : t));
      await supabase.from('translations').insert([{ 
        id: taskId, user_id: session.user.id, filename: file.name, target_lang: targetLangName, result_url: finalUrl, extension: file.name.split('.').pop()?.toLowerCase(), status: 'completed', metrics 
      }]);
    } catch (e: any) {
      notify(0, e.message, 'error');
    }
  };

  const handleCheckout = async (planType: string) => {
    console.log("🚀 BOTÃO CLICADO! Tipo de Plano:", planType);
    
    const PRICE_IDS: Record<string, string> = {
      'professional': import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL || 'price_1TMyrdJRF8C7GtHgIzYhEozI',
      'elite': import.meta.env.VITE_STRIPE_PRICE_ELITE || 'price_1TMywcJRF8C7GtHgF2ZenDAt',
      'business': import.meta.env.VITE_STRIPE_PRICE_BUSINESS || 'price_1TMz3MJRF8C7GtHgySmEMtow',
      'credits': import.meta.env.VITE_STRIPE_PRICE_CREDITS || 'price_1TMzA3JRF8C7GtHglVvSfuDs',
    };

    try {
      if (!PRICE_IDS[planType] || PRICE_IDS[planType].includes('...')) {
        alert("Erro: ID de Preço (Price ID) não configurado no .env para o plano: " + planType);
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: PRICE_IDS[planType],
          userId: session.user.id,
          planType: planType
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro na comunicação com o servidor");
      
      const { url, error } = data;
      if (error) throw new Error(error);
      if (url) {
        window.location.href = url;
      } else {
        alert("Erro: O servidor não retornou uma URL de checkout.");
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      alert("Houve um erro ao processar o checkout: " + err.message);
    }
  };

  return (
    <div className="min-h-screen relative text-slate-200">
      <div className="mesh-bg" />
      
      {/* Floating Island Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl">
        <div className="glass-panel px-8 py-4 rounded-[1.5rem] flex justify-between items-center border-white/10 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-primary/10 shadow-lg">
              <Zap className="w-5 h-5 text-primary fill-primary/20" />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-xl font-black text-white tracking-tighter leading-none">LUMINA</h2>
              <p className="text-[9px] uppercase tracking-[0.3em] text-primary font-black mt-1">v4.5 ATUALIZADA (STRIPE LIVE)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-8">
            <div className="hidden md:flex items-center gap-4">
              <div className="flex flex-col items-end">
                <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest">Idioma Alvo</p>
                <select 
                  value={selectedLang} 
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-transparent text-sm font-bold focus:ring-0 outline-none cursor-pointer text-white appearance-none hover:text-primary transition-colors text-right"
                >
                  {LANGUAGES.map(l => <option key={l} value={l} className="bg-dark text-white">{l}</option>)}
                </select>
              </div>
              <div className="w-px h-8 bg-white/10" />
            </div>

            <div className="flex items-center gap-4">
              {profile && (
                <div className="flex flex-col items-end mr-2 sm:mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block text-[8px] sm:text-[9px] font-black uppercase text-primary tracking-widest">
                      {profile.plan_type?.toUpperCase() || 'FREE'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-white/40 tabular-nums">
                      {profile.characters_used.toLocaleString()} / {profile.quota_limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-32 sm:w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-primary"
                      animate={{ width: `${Math.min((profile.characters_used / profile.quota_limit) * 100, 100)}%` }}
                    />
                  </div>
                  {profile.plan_type === 'free' && (
                    <span className="inline-block text-[8px] font-bold text-slate-500 mt-1 uppercase">
                      Arq: {profile.files_this_month}/2
                    </span>
                  )}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest">Sessão Ativa</p>
                <p className="text-xs font-bold text-slate-200">{session.user.email?.split('@')[0]}</p>
              </div>
              <button 
                onClick={onLogout} 
                className="w-10 h-10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-white/5 flex items-center justify-center group"
              >
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-44 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <header className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                Nova Geração v4.5
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
              Traduza <br /> <span className="text-gradient">Globally.</span>
            </h1>
            <p className="text-slate-400 max-w-lg text-lg font-medium leading-relaxed">
              Poder computacional de escala industrial. Preserve o design original enquanto nossa rede neural reconstrói o conteúdo em segundos.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 gap-4">
             {[
               { icon: Activity, label: "Live Engine", value: "Ativo" },
               { icon: ShieldCheck, label: "Segurança", value: "AES-256" },
               { icon: Globe, label: "Região", value: "Brazil South" },
               { icon: Cpu, label: "Nodes", value: "Dedicated" }
             ].map((stat, i) => (
               <motion.div 
                 key={i}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
                 className="p-4 glass-card rounded-2xl border-white/5"
               >
                 <stat.icon className="w-5 h-5 text-primary mb-3" />
                 <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">{stat.label}</p>
                 <p className="text-sm font-bold text-white">{stat.value}</p>
               </motion.div>
             ))}
          </div>
        </header>

        {/* High-Tech Upload Zone */}
        <motion.div 
          {...getRootProps()}
          className="gradient-border group mb-20 relative"
        >
          <div className={cn(
            "gradient-border-content min-h-[400px] flex flex-col items-center justify-center gap-8 transition-all relative overflow-hidden",
            isDragActive && "bg-primary/5"
          )}>
            <input {...getInputProps()} />
            
            {/* Laser Scanner Effect */}
            <div className="scanner-line" />
            
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <motion.div 
              animate={isDragActive ? { scale: 1.1 } : {}}
              className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500 relative z-10"
            >
              <Upload className="w-10 h-10 text-primary" />
            </motion.div>
            
            <div className="text-center relative z-10 px-6">
              <h3 className="text-3xl font-black text-white mb-3 tracking-tight">
                {isDragActive ? "Solte para Iniciar Escaneamento" : "Arraste seus documentos aqui"}
              </h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Suporte nativo para PDF, DOCX e PPTX até 25MB
              </p>
            </div>
            
            <div className="flex gap-12 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
               <div className="flex flex-col items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                 <span className="text-[8px] font-black uppercase">Layout</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                 <span className="text-[8px] font-black uppercase">Fontes</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                 <span className="text-[8px] font-black uppercase">Imagens</span>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Grid */}
        <section>
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary group-hover:bg-primary/50 transition-colors rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Activity size={24} className="text-dark" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Pipeline em Tempo Real</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizado com Azure Cloud</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div 
                   key="empty"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30"
                >
                   <History size={48} className="mb-6" />
                   <p className="text-sm font-bold uppercase tracking-widest">Nenhum processamento ativo no momento</p>
                </motion.div>
              ) : tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onMouseMove={handleMouseMove}
                  className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between h-[280px] group relative"
                >
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                    <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 p-2 bg-white/5 rounded-xl border border-white/5">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-[1.25rem] flex items-center justify-center border border-white/5 group-hover:border-primary/40 transition-colors shadow-inner">
                      {(() => {
                        const Icon = FILE_ICONS[task.extension] || FileText;
                        return <Icon size={28} className="text-slate-400 group-hover:text-primary transition-colors" />;
                      })()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-extrabold text-white truncate text-xl pr-6 mb-1">{task.filename}</h4>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{task.targetLang}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {task.status === 'processing' || task.status === 'uploading' ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                           <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">
                             <div className="w-1 h-1 rounded-full bg-primary" />
                             {task.message}
                           </div>
                           <span className="text-2xl font-black text-white tabular-nums">{task.progress}<span className="text-sm opacity-30">%</span></span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <motion.div 
                            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                            animate={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : task.status === 'completed' ? (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                             <CheckCircle2 size={14} className="fill-accent/20" /> Pronto
                           </span>
                           <span className="text-[10px] font-bold text-slate-500">{task.metrics?.characters.toLocaleString()} caracteres analizados</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setActiveComparison(task)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-slate-300">
                             <Maximize2 size={20} />
                          </button>
                          <button 
                            onClick={() => handleDownload(task)} 
                            className="flex items-center gap-3 px-6 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 group/dl"
                          >
                             <Download size={20} className="group-hover/dl:translate-y-0.5 transition-transform" />
                             <span className="text-xs uppercase tracking-widest">Baixar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
                        <AlertCircle size={20} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{task.message}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Pricing Strategy Section */}
        <section className="mt-32 pt-20 border-t border-white/5">
          <div className="text-center mb-20">
            <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Escolha sua Potência de Escala</h3>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Planos Blindados com Tecnologia Azure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              { id: 'free', name: "Free", price: "0,00", quota: "5.000 (p/ arquivo)", pages: "~2 files/mês", color: "slate", perks: ["Azure Neural Engine", "Limite 5k chars/arq", "Máx 2 arquivos/mês"] },
              { id: 'professional', name: "Professional", price: "49,90", quota: "400.000", pages: "~160 páginas", color: "primary", perks: ["Básico para Freelancers", "Margem Blindada", "R$ 0,18 excedente"], active: true },
              { id: 'elite', name: "Elite", price: "99,00", quota: "850.000", pages: "~340 páginas", color: "accent", perks: ["Alta Frequência", "Suporte Prioritário", "R$ 0,15 excedente"] },
              { id: 'business', name: "Business", price: "199,00", quota: "1.8M", pages: "~720 páginas", color: "white", perks: ["Fluxo Corporativo", "Times de Trabalho", "R$ 0,12 excedente"] },
              { id: 'credits', name: "Créditos Avulsos", price: "12,00", quota: "50.000", pages: "Acumulativos", color: "emerald", perks: ["Não expiram nunca", "Uso imediato", "Compra por bloco"], isCredits: true }
            ].map((plan, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className={cn(
                  "glass-card rounded-[2.5rem] p-8 border-white/5 relative overflow-hidden group/plan flex flex-col justify-between",
                  plan.active && "border-primary/30 bg-primary/2",
                  plan.isCredits && "border-emerald-500/20 bg-emerald-500/5 shadow-emerald-500/5 shadow-2xl"
                )}
              >
                {plan.active && (
                  <div className="absolute top-0 right-0 bg-primary text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest text-white shadow-lg">Popular</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.3em]",
                      plan.isCredits ? "text-emerald-400" : "text-slate-500"
                    )}>{plan.name}</p>
                    {plan.isCredits && <Zap size={14} className="text-emerald-400 fill-emerald-400" />}
                  </div>
                  <div className="mb-8">
                    <span className="text-xs font-bold text-slate-400">R$ </span>
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {!plan.isCredits && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">/mês</span>}
                    {plan.isCredits && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">/unid</span>}
                  </div>
                  
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <CheckCircle2 size={14} className={plan.isCredits ? "text-emerald-400" : "text-primary"} /> {plan.quota} caracteres
                    </li>
                    {plan.perks.map((perk, ki) => (
                      <li key={ki} className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <ArrowRight size={10} className="text-slate-700" /> {perk}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.id !== 'free' ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckout(plan.id);
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all relative z-[9999] pointer-events-auto cursor-pointer",
                      plan.active ? "bg-primary text-white shadow-xl shadow-primary/20" : 
                      plan.isCredits ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20" :
                      "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                    )}
                  >
                    {plan.isCredits ? "Comprar Blocos" : "Fazer Upgrade"}
                  </button>
                ) : (
                  <div className="py-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                    Plano Ativo
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Result Discovery Modal */}
      <AnimatePresence>
        {activeComparison && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-dark/95 backdrop-blur-3xl" onClick={() => setActiveComparison(null)} />
            <motion.div 
              initial={{ scale: 0.95, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 40 }}
              className="w-full h-full max-w-7xl glass-panel rounded-[3rem] flex flex-col overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/10"
            >
              <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                <div>
                   <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
                     <Languages size={28} className="text-primary" /> Análise de Tradução
                   </h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 opacity-70">
                     Document Source Control // {activeComparison.filename}
                   </p>
                </div>
                <button onClick={() => setActiveComparison(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-hidden">
                <div className="flex-1 p-10 flex flex-col overflow-auto">
                   <p className="text-center text-[10px] font-black uppercase text-slate-500 tracking-[0.5em] mb-8">Matriz Original</p>
                   <div className="bg-white/2 rounded-[2rem] p-10 border border-white/5 flex-1 flex flex-col items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <FileText size={80} className="text-slate-800 mb-8" />
                      <p className="text-sm font-bold text-slate-500 italic text-center max-w-xs opacity-50">Visualização de alta precisão protegida por políticas de isolamento Azure.</p>
                      <button className="mt-12 px-8 py-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Visualizar Cache</button>
                   </div>
                </div>
                <div className="flex-1 p-10 bg-primary/2 flex flex-col overflow-auto">
                   <p className="text-center text-[10px] font-black uppercase text-primary tracking-[0.5em] mb-8">Reconstrução Neural Target</p>
                   <div className="bg-primary/5 rounded-[2rem] p-10 flex-1 flex flex-col items-center justify-center border border-primary/20 relative group">
                      <div className="absolute inset-0 scanner-line opacity-20" />
                      <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-2xl shadow-primary/20">
                        <Zap size={40} className="fill-primary/20 animate-pulse" />
                      </div>
                      <p className="text-lg font-black text-white text-center tracking-tight mb-2">Processamento Concluído</p>
                      <p className="text-sm font-bold text-slate-400 text-center max-w-xs leading-relaxed opacity-80">Layout, fontes e proporções mantidas via reconstrução geométrica neural.</p>
                      <a href={activeComparison.resultUrl} className="mt-12 px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all text-sm tracking-tighter">Baixar Documento Traduzido</a>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-20 px-8 border-t border-white/5 mt-20">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
               <Sparkles size={24} />
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Engine Matrix // 2026.04</p>
            </div>
            <div className="flex flex-wrap justify-center gap-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
              <span className="hover:text-primary transition-colors cursor-pointer">Protocolo AES-256</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Rede Neural Azure</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Isolamento de Dados</span>
              <span className="hover:text-primary transition-colors cursor-pointer">SLA 99.9%</span>
            </div>
         </div>
      </footer>
    </div>
  );
}

const UpdatePassword = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-dark">
      <div className="mesh-bg" />
      <BackgroundAtmosphere />
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-[2.5rem] p-10 overflow-hidden relative group"
      >
        <FloatingScript />
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30 shadow-2xl shadow-primary/20 relative"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/40 blur-md animate-pulse" />
            <Lock className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">Nova Senha</h1>
          <p className="text-slate-400 text-center text-xs font-bold tracking-widest uppercase">Redefina sua credencial de acesso</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none placeholder:text-slate-600"
              placeholder="Nova senha (min. 6 caracteres)"
            />
          </div>

          <div className="space-y-2">
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none placeholder:text-slate-600"
              placeholder="Confirme a nova senha"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'ATUALIZAR SENHA'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center relative z-10">
          <button 
            onClick={onCancel}
            className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Cancelar e voltar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  if (isRecovering) {
    return <UpdatePassword onSuccess={() => setIsRecovering(false)} onCancel={() => setIsRecovering(false)} />;
  }

  return session ? (
    <Dashboard session={session} onLogout={() => supabase.auth.signOut()} />
  ) : (
    <Login onSession={setSession} />
  );
}
