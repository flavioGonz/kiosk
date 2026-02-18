import { useState, useEffect } from 'react';
import { db, type User, type Attendance } from '../db';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Coffee, Timer, UserCheck, Clock, ArrowRightCircle, Activity, AlertCircle } from 'lucide-react';
import { syncService } from '../services/syncService';

interface AttendanceSelectionProps {
    user: User;
    photo: string | null;
    onComplete: (type: string) => void;
}

export function AttendanceSelection({ user, photo, onComplete }: AttendanceSelectionProps) {
    const [lastMark, setLastMark] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(true);
    const [elapsedTime, setElapsedTime] = useState<string | null>(null);

    const options = [
        {
            id: 'Entrada',
            typeId: 1,
            label: 'Inicio Jornada',
            sub: 'Entrada principal',
            icon: LogIn,
            color: 'emerald',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            iconBg: 'bg-emerald-500'
        },
        {
            id: 'Salida',
            typeId: 2,
            label: 'Fin Jornada',
            sub: 'Salida definitiva',
            icon: LogOut,
            color: 'rose',
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            text: 'text-rose-700',
            iconBg: 'bg-rose-500'
        },
        {
            id: 'Entrada Descanso',
            typeId: 4,
            label: 'Inicia Descanso',
            sub: 'Pausa intermedia',
            icon: Coffee,
            color: 'amber',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            iconBg: 'bg-amber-500'
        },
        {
            id: 'Salida Descanso',
            typeId: 3,
            label: 'Finaliza Descanso',
            sub: 'Retorno a tareas',
            icon: Timer,
            color: 'blue',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            iconBg: 'bg-blue-500'
        },
    ];

    useEffect(() => {
        loadLastMark();
    }, [user.id]);

    useEffect(() => {
        let timer: any;
        if (lastMark && (lastMark.typeId === 1 || lastMark.typeId === 4)) {
            timer = setInterval(() => {
                const diff = Date.now() - lastMark.timestamp;
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
        } else {
            setElapsedTime(null);
        }
        return () => clearInterval(timer);
    }, [lastMark]);

    const loadLastMark = async () => {
        if (!user.id) return;
        const marks = await db.attendance
            .where('userId')
            .equals(user.id)
            .reverse()
            .limit(1)
            .toArray();

        setLastMark(marks[0] || null);
        setLoading(false);
    };

    const handleSelect = async (type: string, typeId: number) => {
        if (lastMark && Date.now() - lastMark.timestamp < 10000) {
            alert('Marca muy reciente. Por favor espera unos segundos.');
            return;
        }

        let finalNotes = '';
        const now = Date.now();

        if (typeId === 2 && lastMark?.typeId === 4) {
            if (confirm('Atención: No has registrado el FIN DE DESCANSO. El sistema cerrará el descanso automáticamente ahora. ¿Deseas continuar?')) {
                await db.attendance.add({
                    userId: user.id!,
                    userName: user.name,
                    userDni: user.dni,
                    userPhone: user.phone,
                    type: 'Salida Descanso',
                    typeId: 3,
                    timestamp: now,
                    photo: photo || undefined,
                    synced: false,
                    notes: 'AUTOCERRADO POR SALIDA DEFINITIVA',
                    kioskId: syncService.getKioskId()
                });
                finalNotes = 'AVISO: EL USUARIO NO MARCÓ SALIDA DESCANSO. CIERRE AUTOMÁTICO.';
            } else {
                return;
            }
        }

        try {
            await db.attendance.add({
                userId: user.id!,
                userName: user.name,
                userDni: user.dni,
                userPhone: user.phone,
                type: type as any,
                typeId: typeId,
                timestamp: now,
                photo: photo || undefined,
                synced: false,
                notes: finalNotes,
                kioskId: syncService.getKioskId()
            });
            onComplete(type);
        } catch (err) {
            console.error('Error saving attendance:', err);
        }
    };

    const getTimerIcon = () => {
        if (!lastMark) return Activity;
        const opt = options.find(o => o.id === lastMark.type);
        return opt ? opt.icon : Activity;
    };

    const TimerIcon = getTimerIcon();

    if (loading) return null;

    return (
        <div className="space-y-4 w-full max-w-6xl mx-auto px-4">
            {/* Header: Proportional Layout */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl flex flex-col md:flex-row items-center gap-10">
                {/* User Photo LARGER MORE PROMINENT */}
                <div className="relative shrink-0">
                    <div className="w-64 h-64 rounded-2xl border-4 border-slate-100 p-1 bg-slate-50 overflow-hidden shadow-inner">
                        {user.photos?.[0] ? (
                            <img src={user.photos[0]} className="w-full h-full object-cover rounded-xl" alt={user.name} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <UserCheck className="w-24 h-24 text-slate-300" />
                            </div>
                        )}
                    </div>
                </div>

                {/* User Info & Counter - Better aligned and sized */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none italic">
                            {user.name}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="flex items-center gap-2 bg-slate-900 px-5 py-2 rounded-xl text-white">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">DNI</span>
                                <span className="text-base font-mono font-bold leading-none">{user.dni}</span>
                            </div>
                            {lastMark && (
                                <div className="flex items-center gap-3 bg-blue-50 px-5 py-2 rounded-xl border border-blue-100 italic">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-black uppercase tracking-widest text-blue-700 leading-none">
                                        ÚLTIMA: {lastMark.type}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Counter - Professional Solid Design */}
                    <div className="w-full mt-2">
                        <AnimatePresence mode="wait">
                            {elapsedTime ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-emerald-600 rounded-2xl p-5 shadow-2xl shadow-emerald-600/20 flex items-center gap-6"
                                >
                                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                        <TimerIcon className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-1 leading-none italic">
                                            Tiempo desde {lastMark?.type}
                                        </span>
                                        <span className="text-6xl font-mono font-black text-white tabular-nums leading-none tracking-tighter italic">
                                            {elapsedTime}
                                        </span>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left flex items-center gap-4 opacity-40">
                                    <Activity className="w-6 h-6 text-slate-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 italic">
                                        Sin jornada laboral activa
                                    </span>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Selection Grid: Solid 2-column layout - FLATTER */}
            <div className="grid grid-cols-2 gap-4">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => handleSelect(opt.id, opt.typeId)}
                        className={`group relative flex items-center gap-5 p-2 ${opt.bg} border-2 ${opt.border} rounded-2xl transition-all active:scale-[0.98] shadow-sm`}
                    >
                        <div className={`w-1.5 h-16 rounded-full ${opt.iconBg} ml-1`} />

                        <div className="flex-1 flex flex-col items-start py-8 pr-4">
                            <div className="flex items-center justify-between w-full">
                                <div className="space-y-2">
                                    <span className={`block text-3xl font-black ${opt.text} uppercase tracking-tighter leading-none italic`}>
                                        {opt.label}
                                    </span>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        {opt.sub}
                                    </span>
                                </div>
                                <div className={`w-16 h-16 rounded-xl ${opt.iconBg} flex items-center justify-center shadow-lg shrink-0`}>
                                    <opt.icon className="w-9 h-9 text-white" strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Professional Legal Footer */}
            <div className="pt-6 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                    ANEP • TERMINAL DE ACCESO BIOMÉTRICO • OS v2.5
                </span>
            </div>
        </div>
    );
}
