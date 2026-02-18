import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { db } from '../db';
import { CheckCircle, Camera, AlertCircle, X, ArrowLeft, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnrollmentProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function Enrollment({ onComplete, onCancel }: EnrollmentProps) {
    const webcamRef = useRef<Webcam>(null);
    const { detectFace, modelsLoaded, refreshFaceMatcher } = useFaceRecognition();

    const [step, setStep] = useState<'capture' | 'details' | 'success'>('capture');
    const [name, setName] = useState('');
    const [dni, setDNI] = useState('');
    const [email, setEmail] = useState('');
    const [phone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [pin, setPin] = useState('');

    // Support for multiple samples
    const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const handleCapture = useCallback(async () => {
        if (!webcamRef.current || !modelsLoaded) return;

        setIsCapturing(true);
        setError(null);

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4) {
            setError('La cámara no está lista.');
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

                    if (capturedDescriptors.length + 1 >= 3) {
                        setStep('details');
                    }
                } else {
                    setError('Error al capturar la imagen de la cámara.');
                }
            } else {
                setError('No se detectó ningún rostro. Asegúrate de estar frente a la cámara en un lugar iluminado.');
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            console.error('Enrollment capture error:', err);
            setError('Error al procesar la imagen facial.');
        } finally {
            setIsCapturing(false);
        }
    }, [detectFace, modelsLoaded, capturedDescriptors]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !dni || capturedDescriptors.length === 0) {
            setError('Por favor completa los campos obligatorios y captura tu rostro.');
            return;
        }

        try {
            await db.users.add({
                name,
                dni,
                email,
                phone,
                whatsapp,
                pin,
                faceDescriptors: capturedDescriptors,
                photos: capturedPhotos,
                createdAt: Date.now(),
            });
            await refreshFaceMatcher();
            setStep('success');
            setTimeout(onComplete, 3000);
        } catch (err) {
            setError('Error al guardar: el DNI ya podría estar registrado en este dispositivo.');
        }
    };

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {step === 'capture' && (
                    <motion.div
                        key="capture"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="space-y-6 flex flex-col items-center"
                    >
                        <div className="relative aspect-[3/4] w-full max-w-[320px] rounded-[2.5rem] overflow-hidden border-4 border-gray-100 shadow-xl bg-slate-50">
                            {!modelsLoaded ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Iniciando IA...</p>
                                </div>
                            ) : null}
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover scale-x-[-1]"
                                videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                                onUserMediaError={() => setError('No se pudo acceder a la cámara.')}
                            />

                            {/* Samples indicators */}
                            <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-4">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className={`h - 1.5 flex - 1 rounded - full transition - all ${i < capturedDescriptors.length ? 'bg-green-500' : 'bg-white/30 backdrop-blur-md'
                                            } `}
                                    />
                                ))}
                            </div>

                            <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                <span className="bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase px-3 py-1 rounded-full border border-white/10 tracking-widest">
                                    Muestras: {capturedDescriptors.length} / 3
                                </span>
                            </div>

                            {isCapturing && (
                                <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[2px] flex items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl w-full border border-red-100"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                            </motion.div>
                        )}

                        <div className="text-center space-y-2 mb-2">
                            <h3 className="text-gray-900 font-black uppercase tracking-tight">Captura Facial</h3>
                            <p className="text-[11px] text-slate-500 font-medium max-w-[280px]">Captura su rostro desde 3 ángulos o distancias para mayor precisión.</p>
                        </div>

                        <div className="flex gap-4 w-full max-w-[320px]">
                            <button
                                onClick={onCancel}
                                className="px-6 py-5 rounded-[1.5rem] border border-gray-200 text-gray-400 hover:bg-gray-50 transition-all font-black uppercase text-[10px] tracking-widest"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleCapture}
                                disabled={isCapturing || !modelsLoaded}
                                className="flex-1 flex items-center justify-center gap-3 bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                            >
                                {capturedDescriptors.length > 0 ? <Check className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                                {isCapturing ? 'Analizando...' : capturedDescriptors.length > 0 ? `Capturar ${capturedDescriptors.length + 1} º` : 'Iniciar Captura'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'details' && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-3xl border border-gray-100">
                            <div className="relative flex -space-x-4">
                                {capturedPhotos.map((photo, i) => (
                                    <img
                                        key={i}
                                        src={photo}
                                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md relative group-hover:z-10 transition-all hover:scale-110"
                                        alt="Capture"
                                    />
                                ))}
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center shadow-lg z-20">
                                    <ShieldCheck size={18} />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 uppercase">Perfil Capturado</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">3 muestras procesadas con éxito</p>
                                <button
                                    onClick={() => {
                                        setCapturedDescriptors([]);
                                        setCapturedPhotos([]);
                                        setStep('capture');
                                    }}
                                    className="text-[10px] text-blue-600 font-black uppercase mt-1 flex items-center gap-1 hover:underline group"
                                >
                                    <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Reiniciar captura
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Documento / DNI</label>
                                <input
                                    type="text"
                                    required
                                    value={dni}
                                    onChange={(e) => setDNI(e.target.value)}
                                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN de Acceso</label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Opcional (6 dígitos)"
                                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                                <input
                                    type="text"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    placeholder="+598..."
                                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="md:col-span-2 pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 px-8 py-5 rounded-[1.5rem] border border-gray-200 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2"
                                >
                                    Finalizar Registro <ArrowRight size={16} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 flex flex-col items-center gap-8 text-center"
                    >
                        <div className="relative">
                            <motion.div
                                initial={{ rotate: -15, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                className="w-24 h-24 rounded-[2rem] bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-500/40 relative z-10"
                            >
                                <CheckCircle size={48} strokeWidth={3} />
                            </motion.div>
                            <div className="absolute inset-0 bg-green-200 blur-2xl opacity-50 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">¡Éxito Total!</h3>
                            <p className="text-slate-500 font-medium">El perfil biométrico ha sido dado de alta correctamente.</p>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado Biometría:</p>
                            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest underline underline-offset-4">Perfil Multicapa OK</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
