import { useState, useEffect } from 'react';
import { db, type Shift } from '../db';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Plus, Trash2, Save, X, Edit2,
    AlertCircle, Layers, Settings2, BarChart2
} from 'lucide-react';

export function ShiftsManagement() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [active, setActive] = useState(true);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
    const [sector, setSector] = useState('');
    const [shiftType, setShiftType] = useState<'fijo' | 'rotativo' | 'abierto'>('fijo');
    const [codes, setCodes] = useState<{ id: string; name: string }[]>([]);

    // For adding codes
    const [newCodeId, setNewCodeId] = useState('');
    const [newCodeName, setNewCodeName] = useState('');

    const daysOfWeek = [
        { id: 1, label: 'L' },
        { id: 2, label: 'M' },
        { id: 3, label: 'X' },
        { id: 4, label: 'J' },
        { id: 5, label: 'V' },
        { id: 6, label: 'S' },
        { id: 0, label: 'D' },
    ];

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setLoading(true);
        const allShifts = await db.shifts.toArray();
        setShifts(allShifts);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!name) return;

        const shiftData = {
            name,
            type: shiftType,
            startTime,
            endTime,
            days: selectedDays,
            active,
            sector,
            codes
        };

        if (editingId) {
            await db.shifts.update(editingId, shiftData);
        } else {
            // @ts-ignore - codes and type were added to the interface
            await db.shifts.add(shiftData);
        }

        resetForm();
        loadShifts();
    };

    const handleAddCode = () => {
        if (newCodeId.trim() && newCodeName.trim()) {
            setCodes([...codes, { id: newCodeId.trim(), name: newCodeName.trim() }]);
            setNewCodeId('');
            setNewCodeName('');
        }
    };

    const handleRemoveCode = (idToRemove: string) => {
        setCodes(codes.filter(c => c.id !== idToRemove));
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar este turno?')) {
            await db.shifts.delete(id);
            loadShifts();
        }
    };

    const startEditing = (shift: Shift) => {
        setEditingId(shift.id!);
        setName(shift.name);
        setShiftType(shift.type || 'fijo');
        setStartTime(shift.startTime);
        setEndTime(shift.endTime);
        setSelectedDays(shift.days);
        setActive(shift.active);
        setSector(shift.sector || '');
        setCodes(shift.codes || []);
        setIsAdding(true);
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setName('');
        setShiftType('fijo');
        setStartTime('09:00');
        setEndTime('18:00');
        setSelectedDays([1, 2, 3, 4, 5]);
        setActive(true);
        setSector('');
        setCodes([]);
        setNewCodeId('');
        setNewCodeName('');
    };

    const toggleDay = (dayId: number) => {
        setSelectedDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId].sort()
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Gestión de Turnos</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Configuración de horarios laborales</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={16} /> Crear Turno
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white p-8 rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-500/5 mb-8"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                    <Clock className="text-blue-600 w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">
                                    {editingId ? 'Editar Hoarario' : 'Nuevo Horario Labroal'}
                                </h3>
                            </div>
                            <button onClick={resetForm} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <InputField
                                    label="Nombre del Horario"
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                    placeholder="Ej. Mañana, Administrativo"
                                />
                                <div className="space-y-1.5 w-full">
                                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        <Settings2 className="w-3 h-3 text-blue-500" />
                                        Tipo de Turno
                                    </label>
                                    <select
                                        value={shiftType}
                                        onChange={(e: any) => setShiftType(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all uppercase tracking-wider"
                                    >
                                        <option value="fijo">Turno Fijo (Mismo horario)</option>
                                        <option value="rotativo">Turno Rotativo</option>
                                        <option value="abierto">Turno Abierto / Flexible</option>
                                    </select>
                                </div>
                                <InputField
                                    label="Sector (Opcional)"
                                    value={sector}
                                    onChange={(e: any) => setSector(e.target.value)}
                                    placeholder="Ej. Administración"
                                    icon={Layers}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Desde"
                                        type="time"
                                        value={startTime}
                                        onChange={(e: any) => setStartTime(e.target.value)}
                                    />
                                    <InputField
                                        label="Hasta"
                                        type="time"
                                        value={endTime}
                                        onChange={(e: any) => setEndTime(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={(e) => setActive(e.target.checked)}
                                        className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                                    />
                                    <span className="text-xs font-black uppercase text-slate-600 tracking-widest">Turno Activo</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Días de la Semana</label>
                                <div className="flex flex-wrap gap-2">
                                    {daysOfWeek.map(day => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${selectedDays.includes(day.id)
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CODES SECTION */}
                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <BarChart2 className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Códigos de Tareas</h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ej: "10: Fiambrería" o "20: Caja"</p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-start">
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Código (ej. 10)"
                                        value={newCodeId}
                                        onChange={e => setNewCodeId(e.target.value)}
                                        className="w-1/3 px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all placeholder:text-gray-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Nombre de la tarea (ej. Fiambrería)"
                                        value={newCodeName}
                                        onChange={e => setNewCodeName(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all placeholder:text-gray-400"
                                    />
                                    <button
                                        onClick={handleAddCode}
                                        className="px-6 py-3 bg-blue-100 text-blue-600 rounded-xl font-black text-xs uppercase hover:bg-blue-200 transition-all shadow-sm shrink-0"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div className="flex-1 w-full bg-slate-50 rounded-xl p-4 min-h-[50px] flex flex-col gap-2 border border-slate-100">
                                    {codes.length === 0 ? (
                                        <span className="text-xs text-slate-400 font-bold italic tracking-widest uppercase m-auto">Sin códigos asociados</span>
                                    ) : (
                                        codes.map(c => (
                                            <div key={c.id} className="flex flex-row items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black font-mono text-slate-600">{c.id}</span>
                                                    <span className="text-[11px] font-bold text-slate-700 uppercase">{c.name}</span>
                                                </div>
                                                <button onClick={() => handleRemoveCode(c.id)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={resetForm}
                                className="px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name}
                                className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-gray-900/10 disabled:opacity-50"
                            >
                                <Save size={16} className="inline-block mr-2" />
                                {editingId ? 'Actualizar' : 'Guardar Horario'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {shifts.map(shift => (
                    <motion.div
                        layout
                        key={shift.id}
                        className={`bg-white p-6 rounded-[2rem] border transition-all hover:shadow-xl group ${shift.active ? 'border-slate-200' : 'border-slate-100 opacity-60 grayscale'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${shift.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase tracking-tighter italic leading-none">{shift.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] text-white bg-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{shift.type || 'Fijo'}</span>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{shift.sector || 'Sín Sector'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditing(shift)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(shift.id!)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Entrada</span>
                                <span className="text-sm font-black text-slate-700 italic">{shift.startTime}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Salida</span>
                                <span className="text-sm font-black text-slate-700 italic">{shift.endTime}</span>
                            </div>
                        </div>

                        {shift.codes && shift.codes.length > 0 && (
                            <div className="mb-4">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Códigos de Tareas Asignados</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {shift.codes.map(c => (
                                        <div key={c.id} className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1.5">
                                            <span className="text-[9px] font-black text-slate-500 font-mono">{c.id}</span>
                                            <span className="text-[9px] font-bold text-slate-700 uppercase">{c.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-4 border-t border-slate-100">
                            {daysOfWeek.map(day => (
                                <div
                                    key={day.id}
                                    title={day.label}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${shift.days.includes(day.id)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-300'
                                        }`}
                                >
                                    {day.label}
                                </div>
                            ))}
                            <div className="flex-1" />
                            <div className={`w-2 h-2 rounded-full ${shift.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                        </div>
                    </motion.div>
                ))}

                {!loading && shifts.length === 0 && !isAdding && (
                    <div className="md:col-span-2 xl:col-span-3 py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="text-slate-200 w-8 h-8" />
                        </div>
                        <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Sin turnos configurados</h5>
                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">Haga clic en el botón superior para crear el primer turno</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const InputField = ({ label, icon: Icon = null, ...props }: any) => (
    <div className="space-y-1.5 w-full">
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            {Icon && <Icon className="w-3 h-3 text-blue-500" />}
            {label}
        </label>
        <input
            {...props}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
        />
    </div>
);
