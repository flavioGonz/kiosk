import { useState, useEffect } from 'react';
import { db, type User, type Attendance } from '../db';
import { LogIn, LogOut, Coffee, Timer, UserCheck, X, Cloud, RefreshCw } from 'lucide-react';
import { syncService } from '../services/syncService';
import { brandingService } from '../services/brandingService';

interface AttendanceSelectionProps {
    user: User;
    photo: string | null;
    onComplete: (type: string) => void;
    onBack?: () => void;
}

export function AttendanceSelection({ user, photo, onComplete, onBack }: AttendanceSelectionProps) {
    const [lastMark, setLastMark] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);

    useEffect(() => {
        const unsubscribe = syncService.subscribe((syncing) => {
            setIsCloudSyncing(syncing);
        });
        return () => unsubscribe();
    }, []);




    useEffect(() => {
        loadLastMark();
    }, [user.id]);

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

    if (loading) return null;

    const brand = brandingService.getConfig();

    // Map logic to the radial layout positions
    // Configuration for the 4 cardinal points
    const actions = [
        {
            id: 'Entrada',
            typeId: 1,
            label: 'Entrada',
            icon: LogIn,
            colorClass: 'bg-emerald-500', // Success
            positionClass: 'top-0 left-1/2 -translate-x-1/2 -translate-y-[15%]', // Top - Closer to center
            shadowClass: 'shadow-emerald-500/40' // Stronger shadow
        },
        {
            id: 'Entrada Descanso',
            typeId: 4,
            label: 'Inicio Descanso',
            icon: Coffee,
            colorClass: 'bg-amber-500', // Warning
            positionClass: 'top-1/2 right-0 translate-x-[15%] -translate-y-1/2', // Right - Closer to center
            shadowClass: 'shadow-amber-500/40'
        },
        {
            id: 'Salida Descanso',
            typeId: 3,
            label: 'Fin Descanso',
            icon: Timer,
            colorClass: 'bg-blue-500', // Primary
            positionClass: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[15%]', // Bottom - Closer to center
            shadowClass: 'shadow-blue-500/40'
        },
        {
            id: 'Salida',
            typeId: 2,
            label: 'Salida',
            icon: LogOut,
            colorClass: 'bg-rose-500', // Danger
            positionClass: 'top-1/2 left-0 -translate-x-[15%] -translate-y-1/2', // Left - Closer to center
            shadowClass: 'shadow-rose-500/40'
        }
    ];

    return (
        <div className="flex flex-col items-center justify-between min-h-screen w-full max-w-[800px] mx-auto px-6 py-12 relative overflow-hidden">

            {/* Header Area - Larger for Kiosk */}
            <div className="flex flex-col items-center gap-4 mt-8 z-50">
                <h2 className="text-5xl font-black tracking-tight text-slate-900 drop-shadow-sm text-center">
                    Hola, {user.name.split(' ')[0]}
                </h2>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-slate-200/60">
                    <UserCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-600">Identidad Verificada</span>
                </div>
            </div>

            {/* Radial Layout Container - SCALED UP for 1080x1920 */}
            <div className="relative w-[640px] h-[640px] flex items-center justify-center my-8 scale-90 md:scale-100 transition-transform">

                {/* Central Photo - Larger (320px) */}
                <div className="relative z-20 w-80 h-80 rounded-full border-[8px] border-white shadow-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-900/5">
                    {user.photos?.[0] ? (
                        <img src={user.photos[0]} className="w-full h-full object-cover" alt={user.name} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <UserCheck className="w-32 h-32 text-slate-300" />
                        </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>

                    {/* User DNI Badge - Clearer */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                        <span className="bg-white/95 backdrop-blur text-slate-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border border-slate-100">
                            {user.dni}
                        </span>
                    </div>
                </div>

                {/* Satellite Buttons - Larger (160px) */}
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => handleSelect(action.id, action.typeId)}
                        className={`absolute w-40 h-40 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all active:scale-95 group z-30 ${action.colorClass} ${action.positionClass} ${action.shadowClass} border-4 border-white/10 overflow-hidden ring-1 ring-black/5`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <action.icon className="w-14 h-14 mb-2 drop-shadow-md group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />

                        <span className="text-xs font-black uppercase tracking-widest leading-tight text-center max-w-[120px] drop-shadow-sm">
                            {action.label.includes(' ') ? (
                                <>
                                    {action.label.split(' ')[0]}<br />{action.label.split(' ')[1]}
                                </>
                            ) : action.label}
                        </span>
                    </button>
                ))}

                {/* Decorative Orbit Rings - Scaled */}
                <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 pointer-events-none opacity-40 scale-75 border-dashed"></div>
                <div className="absolute inset-0 rounded-full border-2 border-slate-100 pointer-events-none opacity-60 scale-90"></div>
                <div className="absolute inset-0 rounded-full border border-slate-50 pointer-events-none opacity-30 scale-110"></div>
            </div>

            {/* Helper Text - Bottom focused */}
            <div className="flex flex-col items-center gap-8 mb-8 z-50 w-full">
                <p className="text-slate-400 text-base font-medium text-center max-w-sm">
                    Toque una opción para registrar su marca de asistencia ahora.
                </p>

                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-full max-w-xs py-5 rounded-2xl bg-white border border-slate-200 text-slate-500 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 hover:shadow-lg transition-all active:scale-95 shadow-sm"
                    >
                        <X className="w-5 h-5" />
                        Cancelar Operación
                    </button>
                )}

                <div className="flex flex-col items-center gap-1 opacity-40 mt-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.4em] font-black">
                        {brand.clientName}
                    </p>
                    <p className="text-[8px] text-slate-300 font-bold tracking-widest">SECURE BIOMETRIC ACCESS</p>
                </div>
            </div>

            {/* Cloud Sync Status Indicator - Bottom Right */}
            {isCloudSyncing && (
                <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100/50 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative">
                        <Cloud className="w-5 h-5 text-blue-500" />
                        <RefreshCw className="w-2.5 h-2.5 text-blue-600 absolute -top-1 -right-1 animate-spin" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/80 animate-pulse">
                        Sincronizando con cloud
                    </span>
                </div>
            )}
        </div>
    );
}
