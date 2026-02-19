import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Shield, X, Key, Fingerprint, Camera, Save, RotateCcw } from 'lucide-react';
import { db, type User } from '../db';
import { syncService } from '../services/syncService';
import { UserFormModal } from './UserFormModal';

interface EnrollmentSplashProps {
    onClose: () => void;
}

export function EnrollmentSplash({ onClose }: EnrollmentSplashProps) {
    const [step, setStep] = useState<'login' | 'welcome' | 'form'>('login');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // The user specified admin credentials /admin -> flavio20
        if (password === 'flavio20') {
            setStep('welcome');
        } else {
            setError('Credencial Incorrecta');
            setTimeout(() => setError(''), 2000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-hidden"
        >
            {/* Background Scanline Flair */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan" />
            </div>

            <button
                onClick={onClose}
                className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
            >
                <X className="w-6 h-6" />
            </button>

            <AnimatePresence mode="wait">
                {step === 'login' && (
                    <motion.div
                        key="login"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Shield className="w-32 h-32 text-blue-600" />
                        </div>

                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                                <Key className="text-white w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none italic">Acceso Restringido</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Modo Enrolamiento Local</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Clave de Administrador"
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-center text-lg font-bold focus:ring-4 ring-blue-500/10 outline-none transition-all"
                                />
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center text-rose-500 text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-[11px] active:scale-95 transition-all shadow-xl"
                            >
                                Validar Acceso
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="text-center space-y-10"
                    >
                        <div className="relative inline-block">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/40"
                            >
                                <UserPlus className="text-white w-16 h-16" />
                            </motion.div>
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                                <Shield className="text-white w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
                                Enrolar Nuevo<br />Funcionario
                            </h2>
                            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px]">
                                El proceso capturará biometría facial localmente
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('form')}
                            className="px-12 py-6 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-2xl flex items-center gap-3 mx-auto"
                        >
                            Comenzar Registro
                            <Fingerprint className="w-5 h-5 text-blue-600" />
                        </button>
                    </motion.div>
                )}

                {step === 'form' && (
                    <div className="w-full max-w-4xl bg-white rounded-[3rem] p-4 relative overflow-hidden shadow-2xl">
                        <div className="p-8 pb-0">
                            <button
                                onClick={() => setStep('welcome')}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Atrás</span>
                            </button>
                        </div>
                        <UserFormModal
                            onComplete={() => {
                                syncService.fullSync(); // Immediate sync
                                onClose();
                            }}
                            onCancel={() => setStep('welcome')}
                        />
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
