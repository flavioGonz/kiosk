import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus, Shield, X, Key, Fingerprint, Camera,
    Save, RotateCcw, Check, AlertCircle, ScanFace,
    Mail, Phone, CreditCard, ChevronRight, Loader2
} from 'lucide-react';
import Webcam from 'react-webcam';
import { db, type User } from '../db';
import { syncService } from '../services/syncService';
import { useFaceRecognition } from '../hooks/useFaceRecognition';

interface EnrollmentSplashProps {
    onClose: () => void;
}

type EnrollmentStep = 'login' | 'welcome' | 'data' | 'capture' | 'saving' | 'success';

export function EnrollmentSplash({ onClose }: EnrollmentSplashProps) {
    const [step, setStep] = useState<EnrollmentStep>('login');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Employee Data
    const [name, setName] = useState('');
    const [dni, setDni] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Biometric Data
    const webcamRef = useRef<Webcam>(null);
    const { modelsLoaded, detectFace, refreshFaceMatcher } = useFaceRecognition();
    const [capturedDescriptors, setCapturedDescriptors] = useState<any[]>([]);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'flavio20') {
            setStep('welcome');
            setError(null);
        } else {
            setError('Credencial Incorrecta');
            setTimeout(() => setError(null), 2000);
        }
    };

    const handleCapture = useCallback(async () => {
        if (!webcamRef.current || !modelsLoaded || capturedPhotos.length >= 3) return;

        setIsCapturing(true);
        setError(null);

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4) {
            setError('Cámara no lista');
            setIsCapturing(false);
            return;
        }

        try {
            const detection = await detectFace(video);
            if (detection) {
                const screenshot = webcamRef.current.getScreenshot();
                if (screenshot) {
                    setCapturedDescriptors(prev => [...prev, detection.descriptor]);
                    setCapturedPhotos(prev => [...prev, screenshot]);

                    // Automatically move to saving if 3 photos captured
                    if (capturedPhotos.length === 2) {
                        // We will let the user trigger the save or do it auto?
                        // Better to let them see the 3 photos first.
                    }
                }
            } else {
                setError('No se detectó rostro');
            }
        } catch (err) {
            setError('Error de captura');
        } finally {
            setIsCapturing(false);
        }
    }, [detectFace, modelsLoaded, capturedPhotos]);

    const handleSave = async () => {
        setStep('saving');
        try {
            await db.users.add({
                name,
                dni,
                email,
                phone,
                faceDescriptors: capturedDescriptors,
                photos: capturedPhotos,
                createdAt: Date.now()
            });

            await refreshFaceMatcher();
            await syncService.fullSync();

            setStep('success');
        } catch (err) {
            setError('DNI ya registrado o error de base de datos');
            setStep('data');
        }
    };

    const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text" }: any) => (
        <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Icon className="w-3 h-3 text-blue-500" />
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 outline-none transition-all"
            />
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-hidden no-print"
        >
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan" />
            </div>

            {(step === 'login' || step === 'welcome') && (
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95 z-50"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            <AnimatePresence mode="wait">
                {step === 'login' && (
                    <motion.div
                        key="login"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl"
                    >
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
                                <Key className="text-white w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Admin Auth</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Enrolamiento Moderado</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoFocus
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-center text-lg font-bold focus:ring-4 ring-blue-500/10 outline-none transition-all"
                            />
                            {error && <p className="text-center text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}
                            <button className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all">
                                Acceder
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center space-y-8"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="w-40 h-40 rounded-[3rem] border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto"
                        >
                            <UserPlus className="w-16 h-16 text-blue-500" />
                        </motion.div>
                        <div className="space-y-2">
                            <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">Nuevo Enrolamiento</h1>
                            <p className="text-blue-400 font-black uppercase tracking-widest text-xs">Paso 1: Datos Personales</p>
                        </div>
                        <button
                            onClick={() => setStep('data')}
                            className="bg-white text-slate-900 px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all"
                        >
                            Comenzar
                        </button>
                    </motion.div>
                )}

                {step === 'data' && (
                    <motion.div
                        key="data"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <CreditCard className="text-blue-600 w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic">Ficha de Datos</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Información del Funcionario</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField icon={UserPlus} label="Nombre Completo" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ej. Juan Pérez" />
                            <InputField icon={Fingerprint} label="Documento (DNI)" value={dni} onChange={(e: any) => setDni(e.target.value)} placeholder="Sin puntos ni guiones" />
                            <InputField icon={Mail} label="Email Institucional" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="usuario@anep.edu.uy" />
                            <InputField icon={Phone} label="Teléfono / Celular" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="+598..." />
                        </div>

                        {error && <p className="mt-6 text-rose-500 text-[10px] font-black uppercase text-center">{error}</p>}

                        <div className="mt-10 flex gap-4">
                            <button
                                onClick={() => setStep('welcome')}
                                className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={() => {
                                    if (name && dni) setStep('capture');
                                    else setError('Nombre y DNI obligatorios');
                                }}
                                className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
                            >
                                Siguiente Paso
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'capture' && (
                    <motion.div
                        key="capture"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-4xl bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col md:flex-row gap-8 relative"
                    >
                        {/* Internal Back for Capture Step */}
                        <button
                            onClick={() => setStep('data')}
                            className="absolute top-8 right-8 p-3 text-slate-300 hover:text-rose-500 transition-colors z-10"
                            title="Volver a los datos"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex-1 space-y-6">
                            <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-slate-900 shadow-2xl border-8 border-slate-50">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <div className="absolute inset-x-0 top-0 h-2 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan" />
                                {isCapturing && (
                                    <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleCapture}
                                disabled={isCapturing || capturedPhotos.length >= 3}
                                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 transition-all shadow-xl ${capturedPhotos.length >= 3 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                <Camera className="w-5 h-5" />
                                {capturedPhotos.length >= 3 ? 'Capturas Completas' : `Capturar Muestra ${capturedPhotos.length + 1}/3`}
                            </button>
                        </div>

                        <div className="w-full md:w-64 space-y-6 flex flex-col">
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-slate-900 uppercase italic">Biometría</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                                    Capture 3 ángulos para máxima precisión
                                </p>
                            </div>

                            <div className="flex-1 grid grid-cols-1 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className={`h-28 rounded-2xl border-2 overflow-hidden bg-slate-50 relative flex items-center justify-center ${capturedPhotos[i] ? 'border-emerald-500/50' : 'border-dashed border-slate-200'}`}>
                                        {capturedPhotos[i] ? (
                                            <>
                                                <img src={capturedPhotos[i]} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full"><Check size={10} strokeWidth={4} /></div>
                                            </>
                                        ) : (
                                            <ScanFace className="text-slate-200 w-8 h-8" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 space-y-3">
                                {capturedPhotos.length === 3 && (
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4 text-emerald-400" />
                                        Finalizar Registro
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'saving' && (
                    <motion.div
                        key="saving"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center space-y-6"
                    >
                        <Loader2 className="w-20 h-20 text-blue-500 animate-spin mx-auto" />
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Guardando y Sincronizando</h2>
                            <p className="text-blue-400 font-black uppercase tracking-widest text-[10px]">Cifrando vectores biométricos...</p>
                        </div>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-sm bg-white rounded-[3rem] p-12 text-center shadow-2xl"
                    >
                        <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10 border-4 border-emerald-50">
                            <Check className="text-emerald-500 w-12 h-12" strokeWidth={3} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-4">¡Enrolado!</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed mb-10">
                            El funcionario ya puede registrar su asistencia biométrica localmente y en la nube.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl"
                        >
                            Listo, volver
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && step !== 'login' && step !== 'capture' && (
                <div className="fixed bottom-12 left-0 right-0 flex justify-center">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-rose-500 text-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-2xl"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
