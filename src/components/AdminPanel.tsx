import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Search, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Crown, UserCog } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    id: string;
    plan_type: string;
    characters_used: number;
    quota_limit: number;
    files_this_month: number;
    is_admin: boolean;
  } | null;
}

interface AdminPanelProps {
  accessToken: string;
  onBack: () => void;
}

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'professional', label: 'Professional' },
  { value: 'elite', label: 'Elite' },
  { value: 'business', label: 'Business' },
];

export default function AdminPanel({ accessToken, onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdate = async (userId: string, updates: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      await fetchUsers();
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen relative text-slate-200">
      <div className="mesh-bg" />
      <BackgroundAtmosphere />

      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl">
        <div className="glass-panel px-8 py-4 rounded-[1.5rem] flex justify-between items-center border-white/10 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter leading-none">PAINEL ADMIN</h2>
              <p className="text-[9px] uppercase tracking-[0.3em] text-primary font-black mt-1">Gerenciamento de Usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-sm font-bold"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-36 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="mb-10">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por email..."
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-12 py-4 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-[1.5rem] p-6 border-white/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 shrink-0">
                        <Users size={20} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{user.email}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          {user.profile?.is_admin && (
                            <span className="ml-2 text-primary">• Admin</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {user.profile ? (
                        <>
                          <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                            {user.profile.plan_type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                            {user.profile.characters_used.toLocaleString()} / {user.profile.quota_limit.toLocaleString()}
                          </span>
                          <button
                            onClick={() => setEditingUser(editingUser?.id === user.id ? null : user)}
                            className="p-3 bg-white/5 hover:bg-primary/20 rounded-xl border border-white/5 transition-all"
                          >
                            <UserCog size={16} className="text-slate-400" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-bold uppercase">Sem perfil</span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {editingUser?.id === user.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <EditForm
                          user={user}
                          saving={saving}
                          onSave={(updates) => handleUpdate(user.id, updates)}
                          onCancel={() => setEditingUser(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers.length === 0 && (
              <div className="py-20 text-center">
                <Users size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EditForm({
  user,
  saving,
  onSave,
  onCancel
}: {
  user: AdminUser;
  saving: boolean;
  onSave: (updates: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [planType, setPlanType] = useState(user.profile?.plan_type || 'free');
  const [quotaLimit, setQuotaLimit] = useState(String(user.profile?.quota_limit || 5000));
  const [charactersUsed, setCharactersUsed] = useState(String(user.profile?.characters_used || 0));
  const [isAdmin, setIsAdmin] = useState(user.profile?.is_admin || false);

  const handleSave = () => {
    const updates: Record<string, any> = {
      plan_type: planType,
      quota_limit: Number(quotaLimit),
      characters_used: Number(charactersUsed),
      is_admin: isAdmin,
    };
    onSave(updates);
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Plano</label>
        <select
          value={planType}
          onChange={e => setPlanType(e.target.value)}
          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
        >
          {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Quota Máxima</label>
        <input
          type="number"
          value={quotaLimit}
          onChange={e => setQuotaLimit(e.target.value)}
          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
        />
      </div>
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Chars Usados</label>
        <input
          type="number"
          value={charactersUsed}
          onChange={e => setCharactersUsed(e.target.value)}
          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
        />
      </div>
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Admin</label>
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition-all ${
            isAdmin
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-black/40 border-white/5 text-slate-500'
          }`}
        >
          {isAdmin ? <Crown size={16} /> : <XCircle size={16} />}
          {isAdmin ? 'Sim' : 'Não'}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-primary/20 text-sm"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
        >
          <XCircle size={16} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function BackgroundAtmosphere() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {['ADMIN', 'CONTROLE', 'GESTÃO', 'USUÁRIOS', 'LUMINA'].map((word, i) => (
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
    </div>
  );
}
