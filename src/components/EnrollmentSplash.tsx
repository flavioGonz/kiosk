import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus, Shield, X, Key, Fingerprint, Camera,
    Save, Check, AlertCircle, ScanFace,
    Mail, Phone, CreditCard, ChevronRight, Loader2
} from 'lucide-react';
import Webcam from 'react-webcam';
import { db } from '../db';
import { syncService } from '../services/syncService';
import { useFaceRecognition } from '../hooks/useFaceRecognition';

interface EnrollmentSplashProps {
    onClose: () => void;
    skipLogin?: boolean;
}

type EnrollmentStep = 'login' | 'welcome' | 'data' | 'capture' | 'saving' | 'success';

export function EnrollmentSplash({ onClose, skipLogin }: EnrollmentSplashProps) {
    const [step, setStep] = useState<EnrollmentStep>(skipLogin ? 'welcome' : 'login');
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
            // Loop until we have 3 photos
            let localDescriptors: any[] = [];
            let localPhotos: string[] = [];
            let attempts = 0;
            const maxAttempts = 30; // ~6-10 seconds of searching

            for (let i = 0; i < 3; i++) {
                attempts++;
                if (attempts > maxAttempts) {
                    setError('Tiempo de detección agotado. Asegúrese de que su rostro esté centrado y bien iluminado.');
                    break;
                }

                const detection = await detectFace(video);
                if (detection) {
                    const screenshot = webcamRef.current.getScreenshot();
                    if (screenshot) {
                        localDescriptors.push(detection.descriptor);
                        localPhotos.push(screenshot);
                        // Update state for visual feedback
                        setCapturedDescriptors([...localDescriptors]);
                        setCapturedPhotos([...localPhotos]);

                        // Small delay between burst captures
                        if (i < 2) await new Promise(r => setTimeout(r, 400));
                    }
                } else {
                    i--; // Retry this sample if no face detected
                    // But prevent infinite loop if person leaves
                    await new Promise(r => setTimeout(r, 200));
                }
            }
        } catch (err) {
            setError('Error de captura');
        } finally {
            setIsCapturing(false);
        }
    }, [detectFace, modelsLoaded, capturedPhotos.length]);

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

            {step !== 'login' && step !== 'success' && (
                <div className="absolute top-12 left-0 right-0 flex justify-center z-50">
                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 shadow-2xl">
                        {[
                            { id: 'data', label: 'Datos', icon: CreditCard },
                            { id: 'capture', label: 'Biometría', icon: ScanFace },
                            { id: 'success', label: 'Finalizado', icon: Check }
                        ].map((s, i, arr) => (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex items-center gap-3 transition-all duration-300 ${step === s.id ? 'opacity-100 scale-100' : 'opacity-30 scale-90'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${step === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-white/10 text-white'
                                        }`}>
                                        <s.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white hidden sm:block">{s.label}</span>
                                </div>
                                {i < arr.length - 1 && (
                                    <div className="mx-4 w-8 h-[2px] bg-white/10 rounded-full" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(step === 'login' || step === 'welcome' || step === 'data') && (
                <button
                    onClick={onClose}
                    className="absolute top-10 right-10 p-5 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all active:scale-95 z-[60] border border-white/5"
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
                        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30 group">
                                <Shield className="text-white w-10 h-10 group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">BioCloud Secure</h2>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2">Acceso Administrativo Requerido</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoFocus
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-6 py-5 text-center text-lg font-bold focus:ring-4 ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                                />
                                <Key className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ y: -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-center text-rose-500 text-[10px] font-black uppercase tracking-widest"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button className="w-full bg-blue-600 text-white rounded-2xl py-5 font-black uppercase tracking-widest text-[11px] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                                <Fingerprint className="w-4 h-4" />
                                Validar Identidad
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
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -30 }}
                        className="w-full max-w-2xl bg-white rounded-[3.5rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 animate-pulse" />

                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center shadow-inner">
                                <CreditCard className="text-blue-600 w-10 h-10" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 uppercase italic leading-none tracking-tighter">Ficha de Registro</h3>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Paso 1: Identificación del Personal</p>
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
                        className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[3rem] p-8 shadow-2xl flex flex-col md:flex-row gap-10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                        {/* Internal Close */}
                        <button
                            onClick={() => setStep('data')}
                            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-20"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex-1 flex flex-col gap-8">
                            <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border-4 border-slate-800 group">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                {/* Scanning Overlay */}
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500 shadow-[0_0_25px_rgba(59,130,246,1)] animate-scan z-10" />
                                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />

                                <AnimatePresence>
                                    {isCapturing && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-blue-600/20 backdrop-blur-md flex flex-col items-center justify-center z-20"
                                        >
                                            <div className="relative">
                                                <Loader2 className="w-16 h-16 text-white animate-spin" />
                                                <ScanFace className="absolute inset-0 m-auto w-6 h-6 text-white" />
                                            </div>
                                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white">Analizando Biometría...</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={handleCapture}
                                disabled={isCapturing || capturedPhotos.length >= 3}
                                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 transition-all shadow-xl group ${capturedPhotos.length >= 3
                                    ? 'bg-emerald-500 text-white cursor-default'
                                    : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                                    }`}
                            >
                                <Camera className={`w-6 h-6 ${isCapturing ? 'animate-pulse' : ''}`} />
                                {capturedPhotos.length >= 3 ? 'Perfiles Completados' : `Capturar Bio-Muestra ${capturedPhotos.length + 1}/3`}
                            </button>
                        </div>

                        <div className="w-full md:w-80 flex flex-col gap-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <ScanFace className="text-blue-500 w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Biometría</h3>
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Capturamos 3 muestras para garantizar un <span className="text-blue-400">99.9% de precisión</span>.
                                </p>
                            </div>

                            <div className="flex-1 grid grid-cols-1 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className={`h-24 rounded-2xl border-2 transition-all overflow-hidden bg-slate-950 relative flex items-center justify-center ${capturedPhotos[i] ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-dashed border-slate-800'
                                        }`}>
                                        {capturedPhotos[i] ? (
                                            <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0">
                                                <img src={capturedPhotos[i]} className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={10} strokeWidth={4} className="text-white" /></div>
                                                    <span className="text-[10px] font-black text-white uppercase">Muestra {i + 1} OK</span>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div className="text-slate-700 flex flex-col items-center gap-2">
                                                <ScanFace className="w-6 h-6 opacity-30" />
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Esperando...</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2">
                                {capturedPhotos.length === 3 && (
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-50 transition-all active:scale-95"
                                    >
                                        <Save className="w-4 h-4 text-blue-600" />
                                        Finalizar y Sincronizar
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
