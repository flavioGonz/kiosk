import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { db, type User } from '../db';

interface IdentityConfirmationProps {
    user: User;
    capturedPhoto: string | null;
    onConfirm: () => void;
    onReject: () => void;
}

export function IdentityConfirmation({ user, capturedPhoto, onConfirm, onReject }: IdentityConfirmationProps) {
    const [showFalsePositive, setShowFalsePositive] = useState(false);
    const [reported, setReported] = useState(false);

    const handleReject = () => {
        setShowFalsePositive(true);
    };

    const handleReportFalsePositive = async () => {
        try {
            // Increment falsePositives counter for this user
            const currentCount = user.falsePositives || 0;
            await db.users.update(user.id!, { falsePositives: currentCount + 1 });
            setReported(true);
            setTimeout(() => {
                onReject();
            }, 2500);
        } catch (err) {
            console.error('Error reporting false positive:', err);
            onReject();
        }
    };

    const handleSkipReport = () => {
        onReject();
    };

    return (
        <AnimatePresence mode="wait">
            {!showFalsePositive ? (
                <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center gap-8 py-2"
                >
                    {/* Identification Badge */}
                    <div className="flex flex-col items-center space-y-6 w-full">
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", damping: 15 }}
                                className="w-40 h-40 rounded-full border-8 border-black/5 p-1 bg-black/5 shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden relative z-10"
                            >
                                {capturedPhoto ? (
                                    <img src={capturedPhoto} className="w-full h-full object-cover rounded-full" alt="Captura actual" />
                                ) : (
                                    <img src={user.photos?.[0]} className="w-full h-full object-cover rounded-full" alt={user.name} />
                                )}
                            </motion.div>

                            {/* Validation Badge */}
                            <motion.div
                                initial={{ scale: 0, x: 20 }}
                                animate={{ scale: 1, x: 0 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="absolute -bottom-1 -right-1 w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl z-20"
                            >
                                <Check className="w-7 h-7 text-white" strokeWidth={3} />
                            </motion.div>
                        </div>

                        <div className="text-center space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Identificación Biométrica</span>
                            <h2 className="text-4xl font-black text-black tracking-tighter uppercase leading-none">{user.name}</h2>
                            <div className="bg-black/5 px-4 py-1.5 rounded-full border border-black/10 inline-block">
                                <span className="text-xs font-bold text-black/40 uppercase tracking-widest">DNI {user.dni}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                        <button
                            onClick={handleReject}
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-black/5 border border-black/10 transition-all active:scale-95 group"
                        >
                            <X className="w-6 h-6 text-black/20 group-active:text-red-500 transition-colors" strokeWidth={2.5} />
                            <span className="text-[11px] font-black text-black/40 group-active:text-red-500 uppercase tracking-widest">No soy yo</span>
                        </button>

                        <button
                            onClick={onConfirm}
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-blue-600 border border-blue-500 shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all active:scale-95"
                        >
                            <Check className="w-6 h-6 text-white" strokeWidth={3} />
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">Sí, confirmar</span>
                        </button>
                    </div>

                    <p className="text-[9px] text-black/20 font-black uppercase tracking-[0.2em] text-center">
                        Confirmación de Veracidad de Identidad • Kiosk OS
                    </p>
                </motion.div>
            ) : (
                /* FALSE POSITIVE REPORT SCREEN */
                <motion.div
                    key="false-positive"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-col items-center gap-6 py-6"
                >
                    {!reported ? (
                        <>
                            {/* Warning Icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center shadow-xl shadow-amber-500/10"
                            >
                                <ShieldAlert className="w-12 h-12 text-amber-500" strokeWidth={2} />
                            </motion.div>

                            <motion.div
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15 }}
                                className="text-center space-y-2"
                            >
                                <h2 className="text-2xl font-black text-gray-900 leading-none">Falso Positivo Detectado</h2>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                    El sistema te identificó como <strong className="text-blue-600">{user.name}</strong> pero no eres esa persona.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="w-full max-w-sm bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-center space-y-2"
                            >
                                <div className="flex items-center justify-center gap-2 text-amber-700">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-wider">Atención</span>
                                </div>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    ¿Desea reportar este error al administrador? Ayudará a la precisión profesional del sistema.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="flex gap-3 w-full max-w-sm"
                            >
                                <button
                                    onClick={handleSkipReport}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 font-bold text-sm transition-all active:scale-95"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Omitir
                                </button>
                                <button
                                    onClick={handleReportFalsePositive}
                                    className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    Reportar Error
                                </button>
                            </motion.div>
                        </>
                    ) : (
                        /* SUCCESS - Reported */
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center"
                            >
                                <Check className="w-12 h-12 text-green-500" strokeWidth={2.5} />
                            </motion.div>
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-center space-y-2"
                            >
                                <h3 className="text-2xl font-black text-green-600">¡Reportado!</h3>
                                <p className="text-sm text-gray-500">
                                    El administrador corregirá su registro biométrico.
                                </p>
                                <p className="text-xs text-gray-400 animate-pulse font-medium mt-3">
                                    Limpiando sesión...
                                </p>
                            </motion.div>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
