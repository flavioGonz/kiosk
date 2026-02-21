import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, User, Search, Download, Plus, Calendar, CheckCircle2, AlertCircle, Pencil, X, Save, MessageSquare, Smartphone } from 'lucide-react';
import { db, type Attendance, type User as UserType } from '../db';
import { Modal } from './Modal';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Upload } from 'lucide-react';

export function AttendanceRecords() {
    const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [dailySummary, setDailySummary] = useState<Record<string, { total: number, active: boolean }>>({});
    const [editForm, setEditForm] = useState<{
        type: string;
        observation: string;
        timestamp: string;
    }>({ type: '', observation: '', timestamp: '' });

    // Manual Entry Form State
    const [manualEntry, setManualEntry] = useState<{
        userId: number;
        type: 'Entrada' | 'Salida' | 'Entrada Descanso' | 'Salida Descanso' | 'Falta';
        timestamp: string;
        notes: string;
    }>({
        userId: 0,
        type: 'Entrada',
        timestamp: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const calculatePermanence = (marks: Attendance[]) => {
        const summary: Record<string, { total: number, active: boolean }> = {};

        // Group by user and day
        const groups: Record<string, Attendance[]> = {};
        marks.forEach(m => {
            const dayKey = `${m.userId}-${new Date(m.timestamp).toLocaleDateString()}`;
            if (!groups[dayKey]) groups[dayKey] = [];
            groups[dayKey].push(m);
        });

        Object.entries(groups).forEach(([key, userMarks]) => {
            const sorted = [...userMarks].sort((a, b) => a.timestamp - b.timestamp);
            let totalMs = 0;
            let currentEntrada: number | null = null;
            let currentDescanso: number | null = null;
            let isActive = false;

            sorted.forEach(m => {
                if (m.type === 'Entrada') {
                    currentEntrada = m.timestamp;
                    isActive = true;
                } else if (m.type === 'Salida' && currentEntrada) {
                    totalMs += (m.timestamp - currentEntrada);
                    currentEntrada = null;
                    isActive = false;
                } else if (m.type === 'Entrada Descanso') {
                    currentDescanso = m.timestamp;
                } else if (m.type === 'Salida Descanso' && currentDescanso) {
                    // We subtract this time from the total work time if we are inside an Entrada phase
                    // Or more simply, work time = Sum(Work segments)
                    // If logic is: Entrada starts a work segment, Salida ends it.
                    // If we have breaks inside: (Salida - Entrada) - (SalidaDescanso - EntradaDescanso)
                    totalMs -= (m.timestamp - currentDescanso);
                    currentDescanso = null;
                }
            });

            // If still "working" (has Entrada but no Salida yet)
            if (currentEntrada && !isActive) {
                // Logic check
            }

            summary[key] = { total: totalMs, active: isActive };
        });

        setDailySummary(summary);
    };

    const loadData = async () => {
        const [att, usr] = await Promise.all([
            db.attendance.reverse().sortBy('timestamp'),
            db.users.toArray()
        ]);
        setAllAttendances(att);
        setUsers(usr);
        calculatePermanence(att);
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const filteredAttendances = allAttendances.filter(a =>
        a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.userDni?.includes(searchTerm) ||
        a.userPhone?.includes(searchTerm)
    );

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (Array.isArray(data)) {
                    await db.attendance.bulkAdd(data);
                    setStatus({ type: 'success', message: `${data.length} registros importados correctamente` });
                    loadData();
                }
            } catch (err) {
                setStatus({ type: 'error', message: 'Error al importar archivo. Formato no válido.' });
            }
        };
        reader.readAsText(file);
    };

    const getTypeColor = (type: string, modified?: boolean) => {
        if (modified) {
            switch (type) {
                case 'Entrada': return 'bg-green-100 text-green-700 border-green-300 border-dashed';
                case 'Salida': return 'bg-red-100 text-red-700 border-red-300 border-dashed';
                case 'Entrada Descanso': return 'bg-orange-100 text-orange-700 border-orange-300 border-dashed';
                case 'Salida Descanso': return 'bg-blue-100 text-blue-700 border-blue-300 border-dashed';
                case 'Falta': return 'bg-purple-100 text-purple-700 border-purple-300 border-dashed';
                default: return 'bg-gray-100 text-gray-700 border-gray-300 border-dashed';
            }
        }
        switch (type) {
            case 'Entrada': return 'bg-green-100 text-green-700 border-green-200';
            case 'Salida': return 'bg-red-100 text-red-700 border-red-200';
            case 'Entrada Descanso': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Salida Descanso': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Falta': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const startEdit = (att: Attendance) => {
        setEditingId(att.id!);
        setEditForm({
            type: att.type,
            observation: att.observation || '',
            timestamp: new Date(att.timestamp).toISOString().slice(0, 16),
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await db.attendance.update(editingId, {
                type: editForm.type as any,
                typeId: { 'Entrada': 1, 'Salida': 2, 'Salida Descanso': 3, 'Entrada Descanso': 4, 'Falta': 5 }[editForm.type] || 1,
                timestamp: new Date(editForm.timestamp).getTime(),
                observation: editForm.observation,
                modifiedAt: Date.now(),
                modifiedBy: 'Admin',
            });
            setEditingId(null);
            loadData();
        } catch (err) {
            console.error('Error saving edit:', err);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedUser = users.find(u => u.id === manualEntry.userId);
        if (!selectedUser) return;

        try {
            const typeIds: Record<string, number> = {
                'Entrada': 1, 'Salida': 2, 'Salida Descanso': 3, 'Entrada Descanso': 4, 'Falta': 5
            };

            await db.attendance.add({
                userId: selectedUser.id!,
                userName: selectedUser.name,
                userDni: selectedUser.dni,
                userPhone: selectedUser.phone,
                type: manualEntry.type,
                typeId: typeIds[manualEntry.type],
                timestamp: new Date(manualEntry.timestamp).getTime(),
                synced: false,
                notes: manualEntry.notes,
                modifiedAt: Date.now(),
                modifiedBy: 'Admin (Manual)',
                kioskId: 'ADMIN-CONSOLE'
            });

            setStatus({ type: 'success', message: 'Registro manual agregado correctamente' });
            setTimeout(() => {
                setStatus(null);
                setShowManualEntry(false);
                setManualEntry({ ...manualEntry, notes: '', userId: 0 });
                loadData();
            }, 2000);
        } catch (err) {
            setStatus({ type: 'error', message: 'Error al guardar el registro' });
        }
    };

    const exportPremiumExcel = async (format: 'xlsx' | 'xls') => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Kiosk Biometric System';
            workbook.lastModifiedBy = 'Admin';
            workbook.created = new Date();

            const sheet = workbook.addWorksheet('Reporte General');

            const headerRow = sheet.addRow(['ID', 'COLABORADOR', 'DOCUMENTO', 'TERMINAL', 'TIPO', 'FECHA', 'HORA', 'NOTAS / ESTADO', 'OBSERVACIÓN', 'MODIFICADO']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
                cell.alignment = { horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            allAttendances.forEach(att => {
                const date = new Date(att.timestamp);
                const row = sheet.addRow([
                    att.id,
                    att.userName.toUpperCase(),
                    att.userDni || 'N/A',
                    att.kioskId || 'N/A',
                    att.type.toUpperCase(),
                    date.toLocaleDateString(),
                    date.toLocaleTimeString(),
                    att.notes || (att.synced ? 'SINCRONIZADO' : 'PENDIENTE'),
                    att.observation || '',
                    att.modifiedAt ? new Date(att.modifiedAt).toLocaleString() : '',
                ]);

                const typeCell = row.getCell(5);
                if (att.type === 'Entrada') typeCell.font = { color: { argb: 'FF059669' }, bold: true };
                if (att.type === 'Salida') typeCell.font = { color: { argb: 'FFDC2626' }, bold: true };
                if (att.type === 'Falta') typeCell.font = { color: { argb: 'FF7C3AED' }, bold: true };

                if (att.modifiedAt) {
                    row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; });
                }
            });

            sheet.columns.forEach(col => {
                col.width = 15;
                if (col.number === 2) col.width = 30;
                if (col.number === 7) col.width = 40;
                if (col.number === 8) col.width = 30;
            });

            sheet.autoFilter = 'A1:J1';

            const usersWithMarks = Array.from(new Set(allAttendances.map(a => a.userId)));
            usersWithMarks.forEach(uid => {
                const userMarks = allAttendances.filter(a => a.userId === uid);
                const userName = userMarks[0].userName.substring(0, 30);
                const userSheet = workbook.addWorksheet(userName);

                userSheet.addRow([`REPORTE INDIVIDUAL: ${userMarks[0].userName.toUpperCase()}`]).font = { bold: true, size: 14 };
                userSheet.addRow([`DNI: ${userMarks[0].userDni || 'N/A'}`]).font = { bold: true };
                userSheet.addRow([]);

                const uHeader = userSheet.addRow(['FECHA', 'HORA', 'TIPO DE MARCA', 'NOTAS', 'OBSERVACIÓN']);
                uHeader.eachCell(c => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
                    c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                });

                userMarks.forEach(m => {
                    const d = new Date(m.timestamp);
                    userSheet.addRow([d.toLocaleDateString(), d.toLocaleTimeString(), m.type, m.notes || '', m.observation || '']);
                });

                userSheet.columns.forEach(c => c.width = 20);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}.${format}`);

        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header and Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Registros de Asistencia</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Gestión completa de marcas y faltas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative mr-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar marcas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 bg-slate-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-2 ring-blue-500/5 outline-none w-48 lg:w-64 transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setShowManualEntry(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Registro
                    </button>

                    <div className="flex gap-1">
                        <button
                            onClick={() => exportPremiumExcel('xlsx')}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" /> XLSX
                        </button>
                        <button
                            onClick={() => exportPremiumExcel('xls')}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                        >
                            XLS
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-2">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-dashed border-amber-400 bg-amber-50" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">= Modificado manualmente</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Pencil className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Clic en el lápiz para editar</span>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Funcionario</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Terminal / DNI</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Fecha & Hora</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-center">Tipo</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-center">Cómputo Diario</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Notas / Observación</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence mode="popLayout">
                                {filteredAttendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center opacity-20">
                                                <Calendar className="w-16 h-16 mb-4" />
                                                <p className="text-sm font-black uppercase tracking-widest">Sin registros encontrados</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAttendances.map((attendance) => {
                                        const isEditing = editingId === attendance.id;
                                        const isModified = !!attendance.modifiedAt;
                                        const dayKey = `${attendance.userId}-${new Date(attendance.timestamp).toLocaleDateString()}`;
                                        const summary = dailySummary[dayKey];

                                        return (
                                            <motion.tr
                                                key={attendance.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`group transition-colors ${isModified ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/50'} ${isEditing ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                            {attendance.photo ? (
                                                                <img src={attendance.photo} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                                    <User className="w-5 h-5 text-slate-200" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic">{attendance.userName}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                                {isModified ? (
                                                                    <span className="text-amber-500">✎ Editado {attendance.modifiedBy && `por ${attendance.modifiedBy}`}</span>
                                                                ) : 'Registro de Sistema'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Smartphone className="w-3 h-3 text-slate-300" />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate w-32" title={attendance.kioskId}>{attendance.kioskId || 'N/A'}</span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-blue-600 font-mono">{attendance.userDni || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <input
                                                            type="datetime-local"
                                                            value={editForm.timestamp}
                                                            onChange={e => setEditForm({ ...editForm, timestamp: e.target.value })}
                                                            className="bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 ring-blue-500/10 outline-none w-44"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-slate-900">{new Date(attendance.timestamp).toLocaleDateString()}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 font-mono">{new Date(attendance.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <select
                                                            value={editForm.type}
                                                            onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                                            className="bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[10px] font-black focus:ring-2 ring-blue-500/10 outline-none"
                                                        >
                                                            <option value="Entrada">Entrada</option>
                                                            <option value="Salida">Salida</option>
                                                            <option value="Entrada Descanso">Entrada Descanso</option>
                                                            <option value="Salida Descanso">Salida Descanso</option>
                                                            <option value="Falta">Falta</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 ${getTypeColor(attendance.type, isModified)}`}>
                                                                {isModified && <span className="mr-1">✎</span>}
                                                                {attendance.type}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {summary && summary.total > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-black text-slate-700 tracking-tight">{formatDuration(summary.total)}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total del día</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 font-mono">--:--</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 max-w-[250px]">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editForm.observation}
                                                            onChange={e => setEditForm({ ...editForm, observation: e.target.value })}
                                                            placeholder="Agregar observación..."
                                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 ring-blue-500/10 outline-none"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-medium text-slate-500 truncate">{attendance.notes || '-'}</p>
                                                            {attendance.observation && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <MessageSquare className="w-3 h-3 text-amber-500" />
                                                                    <p className="text-[9px] font-bold text-amber-600 italic truncate">{attendance.observation}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={saveEdit}
                                                                    className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm"
                                                                    title="Guardar"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => startEdit(attendance)}
                                                                    className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Editar marca"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                {attendance.synced ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                                                ) : (
                                                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MANUAL ENTRY MODAL */}
            <Modal
                isOpen={showManualEntry}
                onClose={() => setShowManualEntry(false)}
                title="AGREGAR REGISTRO MANUAL / FALTA"
            >
                <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleccionar Funcionario</label>
                            <select
                                required
                                value={manualEntry.userId}
                                onChange={e => setManualEntry({ ...manualEntry, userId: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                            >
                                <option value={0}>Elegir funcionario de la lista...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} (DNI: {u.dni})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Marca</label>
                                <select
                                    value={manualEntry.type}
                                    onChange={e => setManualEntry({ ...manualEntry, type: e.target.value as any })}
                                    className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="Entrada">Entrada</option>
                                    <option value="Salida">Salida</option>
                                    <option value="Entrada Descanso">Entrada Descanso</option>
                                    <option value="Salida Descanso">Salida Descanso</option>
                                    <option value="Falta">Falta / Inasistencia</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha y Hora</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={manualEntry.timestamp}
                                    onChange={e => setManualEntry({ ...manualEntry, timestamp: e.target.value })}
                                    className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observaciones (Opcional)</label>
                            <textarea
                                value={manualEntry.notes}
                                onChange={e => setManualEntry({ ...manualEntry, notes: e.target.value })}
                                placeholder="Indique motivo si es una falta o error en marca..."
                                className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                            />
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-lg text-xs font-bold uppercase tracking-tight flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {status.message}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowManualEntry(false)}
                            className="flex-1 px-6 py-4 rounded-lg border border-gray-200 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-gray-900 text-white py-4 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                        >
                            Guardar Registro
                        </button>
                    </div>
                </form>
            </Modal>

            {/* FLOATING ACTION BUTTONS FOR MOBILE/IPHONE */}
            <div className="lg:hidden fixed bottom-24 right-6 flex flex-col gap-4 z-[90]">
                <AnimatePresence>
                    {showExportMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.8 }}
                            className="flex flex-col gap-3 mb-2"
                        >
                            <button
                                onClick={() => exportPremiumExcel('xlsx')}
                                className="w-12 h-12 bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <label className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-pointer">
                                <Upload className="w-5 h-5" />
                                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                            </label>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${showExportMenu ? 'bg-slate-900 rotate-45' : 'bg-blue-600'}`}
                >
                    <Plus className="w-7 h-7 text-white" />
                </button>
            </div>

            {/* FLOATING SEARCH BUTTON FOR MOBILE */}
            <div className="lg:hidden fixed top-20 right-6 z-[90]">
                <button
                    onClick={() => setShowSearchOverlay(true)}
                    className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg flex items-center justify-center"
                >
                    <Search className="w-5 h-5" />
                </button>
            </div>

            {/* MOBILE SEARCH OVERLAY */}
            <AnimatePresence>
                {showSearchOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white p-6 flex flex-col"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={() => setShowSearchOverlay(false)} className="p-2 -ml-2">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">Buscar Registros</h2>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-5 h-5" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nombre, DNI o Teléfono..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-blue-500/20 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto mt-6">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Resultados</p>
                            {filteredAttendances.length === 0 ? (
                                <p className="text-xs text-slate-400 font-bold italic">No se encontraron marcas</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredAttendances.slice(0, 10).map(att => (
                                        <div key={att.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black uppercase italic leading-none">{att.userName}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1">{new Date(att.timestamp).toLocaleString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${getTypeColor(att.type)}`}>{att.type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowSearchOverlay(false)}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs mt-4 shadow-xl shadow-blue-500/20"
                        >
                            Ver Resultados
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
