import { useState, useEffect, cloneElement } from 'react';
import type { ReactElement } from 'react';
import { db, type User } from '../db';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Trash2,
    UserPlus,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    Server,
    ShieldCheck,
    Monitor,
    LogOut,
    ChevronDown,
    ShieldAlert,
    Settings,
    Activity,
    Smartphone,
    Search,
    Download,
    Upload,
    Plus,
    LayoutGrid,
    Layout,
    Folder,
    Clock
} from 'lucide-react';
import { UserFormModal } from './UserFormModal';
import { LiveMonitor } from './LiveMonitor';
import { AttendanceRecords } from './AttendanceRecords';
import { SyncSettings } from './SyncSettings';
import { UnknownFaces } from './UnknownFaces';
import { DevicesManager } from './DevicesManager';
import { EnrollmentSplash } from './EnrollmentSplash';
import { ShiftsManagement } from './ShiftsManagement';
import { Modal } from './Modal';
import { brandingService } from '../services/brandingService';

interface AdminPanelProps {
    onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
    const brand = brandingService.getConfig();
    const [users, setUsers] = useState<User[]>([]);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'records' | 'settings' | 'unknown' | 'devices' | 'shifts'>('records');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState<string | 'ALL'>('ALL');
    const [showExportMenu, setShowExportMenu] = useState(false);


    const loadData = async () => {
        const allUsers = await db.users.toArray();
        setUsers(allUsers);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, []);

    const deleteUser = async (id: number) => {
        if (confirm('¿CONFIRMAR ELIMINACIÓN? Esta acción es irreversible y purgará los datos biométricos.')) {
            await db.users.delete(id);
            await db.attendance.where('userId').equals(id).delete();
            loadData();
        }
    };

    const handleExportUsers = () => {
        const data = JSON.stringify(users, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Funcionarios_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const handleImportUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (Array.isArray(data)) {
                    await db.users.bulkPut(data);
                    alert(`${data.length} funcionarios importados/actualizados`);
                    loadData();
                }
            } catch (err) {
                console.error('Error importing:', err);
                alert('Error al importar funcionarios');
            }
        };
        reader.readAsText(file);
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.dni.includes(searchTerm);
        const matchesSector = selectedSector === 'ALL' || u.sector === selectedSector;
        return matchesSearch && matchesSector;
    });

    const sectors = Array.from(new Set(users.map(u => u.sector).filter(Boolean))) as string[];



    return (
        <div className="flex h-screen w-full font-sans overflow-hidden transition-colors duration-300 bg-slate-50 text-slate-900 border-gray-200">
            {/* LIGHT PROFESSIONAL SIDEBAR */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 80 : 280 }}
                className="bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl relative"
            >
                <div className="p-8 flex items-center gap-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                        <Server className="w-6 h-6 text-white" />
                    </div>
                    {!isSidebarCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="overflow-hidden whitespace-nowrap"
                        >
                            <h2 className="font-black tracking-tighter text-xl leading-none text-slate-900 italic">{brand.clientName} ADMIN</h2>
                            <p className="text-[9px] text-blue-600 font-mono tracking-widest uppercase font-black mt-1">Console v3.0</p>
                        </motion.div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-6">
                    <SidebarLink
                        icon={<Activity />}
                        label="Registros"
                        active={activeTab === 'records'}
                        collapsed={isSidebarCollapsed}
                        onClick={() => setActiveTab('records')}
                    />
                    <SidebarLink
                        icon={<Monitor />}
                        label="Tiempo Real"
                        active={activeTab === 'monitor'}
                        collapsed={isSidebarCollapsed}
                        onClick={() => setActiveTab('monitor')}
                    />
                    <SidebarLink
                        icon={<Users />}
                        label="Funcionarios"
                        active={activeTab === 'users'}
                        collapsed={isSidebarCollapsed}
                        onClick={() => setActiveTab('users')}
                    />
                    <SidebarLink
                        icon={<ShieldAlert />}
                        label="Desconocidos"
                        active={activeTab === 'unknown'}
                        collapsed={isSidebarCollapsed}
                        onClick={() => setActiveTab('unknown')}
                    />
                    <SidebarLink
                        icon={<Clock />}
                        label="Turnos"
                        active={activeTab === 'shifts'}
                        collapsed={isSidebarCollapsed}
                        onClick={() => setActiveTab('shifts')}
                    />

                    <div className="pt-8 mb-4">
                        {!isSidebarCollapsed && <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-3 px-4 font-black">Sistema</p>}
                        <SidebarLink
                            icon={<Settings />}
                            label="Configuración"
                            active={activeTab === 'settings'}
                            collapsed={isSidebarCollapsed}
                            onClick={() => setActiveTab('settings')}
                        />
                        <SidebarLink
                            icon={<Smartphone />}
                            label="Dispositivos"
                            active={activeTab === 'devices'}
                            collapsed={isSidebarCollapsed}
                            onClick={() => setActiveTab('devices')}
                        />
                    </div>
                </nav>

                {/* BOTTOM SIDEBAR: GENERIC ID & USER PROFILE */}
                <div className="p-4 border-t border-slate-100 space-y-4">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-2 px-4 text-slate-400 mb-2">
                            <Monitor size={12} className="text-green-500" />
                            <span className="text-[9px] font-mono font-bold">ID: KIOSK-SYS-01</span>
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border group ${showUserMenu ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50'}`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center relative shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                <ShieldCheck className="text-blue-600 w-6 h-6" />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="text-left flex-1">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 leading-none">Flavio</p>
                                    <p className="text-[9px] text-slate-400 font-mono mt-1 font-bold">ADMIN</p>
                                </div>
                            )}
                            {!isSidebarCollapsed && <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />}
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <button
                                        onClick={onBack}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-rose-50 transition-colors text-xs font-black uppercase tracking-widest"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Cerrar Sesión
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute top-24 -right-3 w-6 h-6 bg-white rounded flex items-center justify-center border border-slate-200 text-slate-300 hover:text-blue-500 hover:border-blue-500 transition-all shadow-md z-30"
                >
                    {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </motion.aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
                    <AnimatePresence mode="wait">
                        {activeTab === 'monitor' && (
                            <motion.div
                                key="monitor"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <LiveMonitor />
                            </motion.div>
                        )}

                        {activeTab === 'users' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Directorio de Funcionarios</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestión de personal y biometría por sectores</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="hidden md:flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Layout size={18} /></button>
                                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
                                        </div>
                                        <button onClick={() => setShowEnrollment(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg shadow-gray-900/10"><UserPlus size={16} /> Agregar Nuevo</button>
                                    </div>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* SECTOR SIDEBAR / FOLDERS */}
                                    <div className="w-full lg:w-64 space-y-4">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                                <Folder className="w-4 h-4 text-blue-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sectores / Carpetas</span>
                                            </div>
                                            <div className="space-y-1">
                                                <button
                                                    onClick={() => setSelectedSector('ALL')}
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between ${selectedSector === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <span>TODOS LOS SECTORES</span>
                                                    <span className={`${selectedSector === 'ALL' ? 'text-blue-100' : 'text-gray-400'}`}>{users.length}</span>
                                                </button>
                                                {sectors.map(sector => (
                                                    <button
                                                        key={sector}
                                                        onClick={() => setSelectedSector(sector)}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between ${selectedSector === sector ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="uppercase">{sector}</span>
                                                        <span className={`${selectedSector === sector ? 'text-blue-100' : 'text-gray-400'}`}>{users.filter(u => u.sector === sector).length}</span>
                                                    </button>
                                                ))}
                                                {users.filter(u => !u.sector).length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedSector('')}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between ${selectedSector === '' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span>SIN ASIGNAR</span>
                                                        <span className={`${selectedSector === '' ? 'text-blue-100' : 'text-gray-400'}`}>{users.filter(u => !u.sector).length}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {/* SEARCH & FILTERS */}
                                        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nombre, DNI..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        {viewMode === 'grid' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                                                {users.map(user => (
                                                    <div key={user.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/20 shadow-sm hover:shadow-xl transition-all group relative">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative">
                                                                    {user.photos?.[0] ? (
                                                                        <img src={user.photos[0]} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-100 group-hover:border-blue-500/40 transition-all" alt="" />
                                                                    ) : (
                                                                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-gray-100">
                                                                            <UserIcon className="w-8 h-8 text-gray-300" />
                                                                        </div>
                                                                    )}
                                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full ${user.faceDescriptors?.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-gray-900 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{user.name}</p>
                                                                    <p className="text-xs text-blue-600 font-mono font-bold mt-1">DNI: {user.dni}</p>
                                                                    <div className="flex gap-1.5 mt-2">
                                                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-black uppercase tracking-wider text-gray-500">
                                                                            {user.role === 'superadmin' ? 'S.Admin' : user.role === 'admin' ? 'Global' : user.role === 'manager' ? 'Local' : 'Funcionario'}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${!user.assignedKiosks?.length ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                            {!user.assignedKiosks?.length ? 'Acceso Total' : `${user.assignedKiosks.length} Kioscos`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <button onClick={() => deleteUser(user.id!)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                                                <button onClick={() => setEditingUser(user)} className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Settings size={16} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                                                <table className="w-full text-left min-w-[600px]">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Funcionario</th>
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Documento</th>
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Sector</th>
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Accesos / Rol</th>
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Contacto</th>
                                                            <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {filteredUsers.map(user => (
                                                            <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                                                            {user.photos?.[0] ? <img src={user.photos[0]} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-gray-300" />}
                                                                        </div>
                                                                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase italic">{user.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{user.dni}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${user.sector ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400 italic'}`}>
                                                                            {user.sector || 'Sin Asignar'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                                                            {user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Admin Global' : user.role === 'manager' ? 'Admin Local' : 'Funcionario'}
                                                                        </span>
                                                                        <span className={`text-[9px] font-bold uppercase tracking-tight ${!user.assignedKiosks?.length ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                                            {!user.assignedKiosks?.length ? 'Todos los Kioscos' : `Restringido (${user.assignedKiosks.length})`}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-medium text-gray-600">
                                                                    <p className="text-green-600 font-bold">{user.whatsapp || '-'}</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2 text-gray-400">
                                                                        <button onClick={() => setEditingUser(user)} className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Settings size={16} /></button>
                                                                        <button onClick={() => deleteUser(user.id!)} className="p-2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* FLOATING ACTIONS FOR USERS (MOBILE) */}
                                        <div className="lg:hidden fixed bottom-24 right-6 flex flex-col gap-4 z-[90]">
                                            <AnimatePresence>
                                                {showExportMenu && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 20 }}
                                                        className="flex flex-col gap-3 mb-2"
                                                    >
                                                        <button onClick={handleExportUsers} className="w-12 h-12 bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center">
                                                            <Download className="w-5 h-5" />
                                                        </button>
                                                        <label className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-pointer">
                                                            <Upload className="w-5 h-5" />
                                                            <input type="file" accept=".json" onChange={handleImportUsers} className="hidden" />
                                                        </label>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <button
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center ${showExportMenu ? 'bg-slate-900 rotate-45' : 'bg-blue-600'}`}
                                            >
                                                <Plus className="w-7 h-7 text-white" />
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'unknown' && (
                            <motion.div key="unknown" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <UnknownFaces />
                            </motion.div>
                        )}

                        {activeTab === 'records' && (
                            <motion.div key="records" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <AttendanceRecords />
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <SyncSettings />
                            </motion.div>
                        )}

                        {activeTab === 'devices' && (
                            <motion.div key="devices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <DevicesManager />
                            </motion.div>
                        )}

                        {activeTab === 'shifts' && (
                            <motion.div key="shifts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <ShiftsManagement />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* FULLSCREEN SPLASH FOR ENROLLMENT */}
            {showEnrollment && (
                <EnrollmentSplash skipLogin onClose={() => { setShowEnrollment(false); loadData(); }} />
            )}

            {/* MODAL FOR EDITING ONLY */}
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="" maxWidth="max-w-5xl">
                <UserFormModal
                    user={editingUser}
                    onComplete={() => { setEditingUser(null); loadData(); }}
                    onCancel={() => { setEditingUser(null); }}
                />
            </Modal>
        </div>
    );
}

interface SidebarLinkProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
    onClick: () => void;
}

function SidebarLink({ icon, label, active, collapsed, onClick }: SidebarLinkProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all relative group ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
        >
            <div className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {cloneElement(icon as ReactElement<{ size?: number; strokeWidth?: number }>, { size: 18, strokeWidth: active ? 3 : 2 })}
            </div>
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-black uppercase tracking-[0.2em] text-[10px]"
                >
                    {label}
                </motion.span>
            )}
            {active && (
                <motion.div
                    layoutId="activePill"
                    className="absolute left-0 w-1 h-6 bg-white rounded-r-sm"
                />
            )}
        </button>
    );
}
