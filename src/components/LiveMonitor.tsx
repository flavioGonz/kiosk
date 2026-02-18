import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Clock, ShieldCheck } from 'lucide-react';
import { db, type Attendance } from '../db';

export function LiveMonitor() {
    const [liveAttendances, setLiveAttendances] = useState<Attendance[]>([]);

    useEffect(() => {
        const updateMatches = async () => {
            const now = Date.now();
            const fifteenSecondsAgo = now - 15000;

            const recent = await db.attendance
                .where('timestamp')
                .above(fifteenSecondsAgo)
                .reverse()
                .sortBy('timestamp');

            setLiveAttendances(recent);
        };

        updateMatches();
        const interval = setInterval(updateMatches, 1000);
        return () => clearInterval(interval);
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Entrada': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'Salida': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-4">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 text-blue-600 border border-blue-600/20 mb-4 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Escaneo en Vivo Activado</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Monitor de Actividad</h2>
                <p className="text-slate-500 font-medium">Las marcas aparecen aquí instantáneamente y desaparecen tras 15 segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {liveAttendances.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="col-span-full py-20 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400"
                        >
                            <Clock className="w-12 h-12 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-xs">Esperando nuevas marcas...</p>
                        </motion.div>
                    ) : (
                        liveAttendances.map((attendance) => (
                            <motion.div
                                key={attendance.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: 50 }}
                                className="bg-white rounded-[2rem] p-6 shadow-2xl shadow-blue-900/10 border border-slate-100 flex flex-col gap-5 relative overflow-hidden group"
                            >
                                {/* Timer Progress Bar (15s) */}
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 15, ease: 'linear' }}
                                    className="absolute bottom-0 left-0 h-1.5 bg-blue-500/20"
                                />

                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                                            {attendance.photo ? (
                                                <img src={attendance.photo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-slate-200" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-xl">
                                            <ShieldCheck size={18} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-slate-900 uppercase italic truncate leading-tight tracking-tighter">
                                            {attendance.userName}
                                        </h3>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Identidad Verificada</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora de Marca</span>
                                        <span className="text-xl font-black text-slate-900 font-mono italic">
                                            {new Date(attendance.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 ${getTypeColor(attendance.type)}`}>
                                        {attendance.type}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
