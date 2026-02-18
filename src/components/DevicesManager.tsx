import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, XCircle, Clock, RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { syncService } from '../services/syncService';
import { motion, AnimatePresence } from 'framer-motion';

interface Device {
    id: number;
    kiosk_id: string;
    name: string;
    status: 'pending' | 'approved' | 'blocked';
    last_seen: string;
    created_at: string;
}

export function DevicesManager() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDevices = async () => {
        setLoading(true);
        try {
            const data = await syncService.getDevices();
            setDevices(data);
        } catch (e) {
            console.error('Error loading devices:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
        const interval = setInterval(loadDevices, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await syncService.updateDeviceStatus(id, status);
            loadDevices();
        } catch (e) {
            alert('Error al actualizar estado');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Gestión de Dispositivos</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Modificación y acceso de terminales Kiosko</p>
                    </div>
                </div>
                <button
                    onClick={loadDevices}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                >
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {devices.map((device) => (
                        <motion.div
                            key={device.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${device.status === 'approved' ? 'bg-emerald-50 text-emerald-500' :
                                        device.status === 'blocked' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
                                    }`}>
                                    {device.status === 'approved' ? <ShieldCheck className="w-7 h-7" /> :
                                        device.status === 'blocked' ? <ShieldX className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-sm font-black text-slate-900 uppercase">{device.name || 'Terminal Desconocido'}</h3>
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${device.status === 'approved' ? 'bg-emerald-500 text-white' :
                                                device.status === 'blocked' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                            {device.status === 'approved' ? 'Autorizado' :
                                                device.status === 'blocked' ? 'Bloqueado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono font-bold leading-none mb-2">{device.kiosk_id}</p>
                                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            Visto: {new Date(device.last_seen).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {device.status !== 'approved' && (
                                    <button
                                        onClick={() => handleUpdateStatus(device.id, 'approved')}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
                                    >
                                        Adoptar
                                    </button>
                                )}
                                {device.status !== 'blocked' && (
                                    <button
                                        onClick={() => handleUpdateStatus(device.id, 'blocked')}
                                        className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/10"
                                    >
                                        Bloquear
                                    </button>
                                )}
                                {device.status === 'blocked' && (
                                    <button
                                        onClick={() => handleUpdateStatus(device.id, 'pending')}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                                    >
                                        Pendiente
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {devices.length === 0 && (
                        <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay terminales registrados todavía</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
