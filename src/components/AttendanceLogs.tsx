import { useState, useEffect } from 'react';
import { db, type Attendance, type User } from '../db';
import { motion } from 'framer-motion';
import { Calendar, Clock as ClockIcon, ArrowLeft, User as UserIcon, QrCode } from 'lucide-react';

interface AttendanceLogsProps {
    user?: User;
    onBack: () => void;
}

export function AttendanceLogs({ user, onBack }: AttendanceLogsProps) {
    const [logs, setLogs] = useState<Attendance[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;
            const userLogs = await db.attendance
                .where('userId')
                .equals(user.id!)
                .reverse()
                .sortBy('timestamp');
            setLogs(userLogs);
        };
        fetchLogs();
    }, [user?.id]);

    if (!user) {
        return (
            <div className="glass-card p-16 text-center space-y-8 max-w-2xl mx-auto">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse border border-blue-500/20">
                        <QrCode className="w-12 h-12 text-blue-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white italic tracking-tight underline decoration-blue-500/40">CONSULTA DE MARCAS</h2>
                        <p className="text-white/40 max-w-sm mx-auto font-medium">Acerca el código QR de tu ticket al lector físico del tótem para visualizar tu historial.</p>
                    </div>
                </div>
                <div className="py-4 px-6 glass rounded-full inline-block border-white/5">
                    <p className="text-[10px] text-blue-400 font-bold tracking-[0.3em] uppercase">Esperando señal del lector...</p>
                </div>
                <button
                    onClick={onBack}
                    className="block w-full text-white/20 hover:text-white/60 transition-colors uppercase text-[10px] font-bold tracking-widest pt-4"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="glass-card w-full max-w-2xl mx-auto overflow-hidden">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                    {user.photos?.[0] ? (
                        <img src={user.photos[0]} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-white/40" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-semibold text-white">{user.name}</h2>
                        <p className="text-xs text-white/40 uppercase tracking-widest leading-none">Historial de Marcas</p>
                    </div>
                </div>
                <button onClick={onBack} className="p-2 glass rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white/60" />
                </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-4 space-y-3">
                {logs.length === 0 ? (
                    <div className="py-20 text-center space-y-2 opacity-40">
                        <Calendar className="w-12 h-12 mx-auto" />
                        <p className="font-medium uppercase tracking-widest text-xs">No hay marcas registradas</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={log.id}
                            className="flex items-center justify-between p-4 glass rounded-2xl border-white/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-10 rounded-full ${log.type.includes('Entrada') ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-semibold">{log.type}</p>
                                    <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded text-blue-400">ID: {log.typeId || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-white/40 text-xs">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(log.timestamp)}</span>
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {formatTime(log.timestamp)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-white/5 text-white/40`}>
                                    Local
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div >
    );
}
