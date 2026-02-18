import { motion, AnimatePresence } from 'framer-motion';
import { Scan, UserX } from 'lucide-react';

interface ProcessingSplashProps {
    type: 'processing' | 'not-recognized';
    onClose?: () => void;
}

export function ProcessingSplash({ type, onClose }: ProcessingSplashProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-3xl"
            >
                {type === 'processing' ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="flex flex-col items-center gap-8"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="relative"
                        >
                            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                                <Scan className="w-16 h-16 text-white" strokeWidth={2.5} />
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-[2.5rem] bg-blue-400"
                            />
                        </motion.div>

                        <div className="text-center space-y-3">
                            <motion.h2
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-4xl font-black text-slate-900 uppercase tracking-tighter"
                            >
                                Identificando...
                            </motion.h2>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                                Posiciónate frente al sensor
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="flex flex-col items-center gap-8 max-w-md px-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-32 h-32 rounded-[2.5rem] bg-red-600 flex items-center justify-center shadow-2xl"
                        >
                            <UserX className="w-16 h-16 text-white" strokeWidth={3} />
                        </motion.div>

                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                Usuario No Registrado
                            </h2>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                                No se encontró una coincidencia biométrica
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center">
                            <p className="text-xs text-red-600 font-black uppercase tracking-widest">
                                Contacte a Administración
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full px-8 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all"
                        >
                            Intentar de Nuevo
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
