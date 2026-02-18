import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Check, X, RefreshCw, Wifi, WifiOff, Database, ChevronDown, Table, Pencil, Shield, Bell, Download, Smartphone } from 'lucide-react';
import { syncService } from '../services/syncService';
import { subscribeUser } from '../services/notificationService';

type DbType = 'none' | 'mysql' | 'postgres';
type SettingsSection = 'sync' | 'database' | 'tables' | 'pwa';

interface TableMapping {
    local: string;
    remote: string;
    description: string;
    columns: string[];
}

const DEFAULT_TABLES: TableMapping[] = [
    {
        local: 'attendance',
        remote: 'attendance_records',
        description: 'Registros de asistencia (entradas, salidas, descansos, faltas)',
        columns: ['id', 'user_id', 'user_name', 'user_dni', 'type', 'type_id', 'timestamp', 'photo', 'synced', 'notes', 'observation', 'modified_at']
    },
    {
        local: 'users',
        remote: 'employees',
        description: 'Directorio de funcionarios con datos personales y biometría',
        columns: ['id', 'name', 'dni', 'email', 'phone', 'whatsapp', 'pin', 'face_descriptors', 'photos', 'created_at']
    },
    {
        local: 'unknownFaces',
        remote: 'unknown_faces',
        description: 'Registro de rostros no identificados por el sistema',
        columns: ['id', 'timestamp', 'photo', 'synced']
    },
];

export function SyncSettings() {
    const [activeSection, setActiveSection] = useState<SettingsSection>('sync');
    const [serverUrl, setServerUrl] = useState('');
    const [apiKey, setApiKey] = useState('flavio20');
    const [enabled, setEnabled] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; downloaded: number; uploaded: number } | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);

    // Database config
    const [dbType, setDbType] = useState<DbType>('none');
    const [dbHost, setDbHost] = useState('localhost');
    const [dbPort, setDbPort] = useState('');
    const [dbName, setDbName] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [dbPassword, setDbPassword] = useState('');

    // Table mappings
    const [tables, setTables] = useState<TableMapping[]>(DEFAULT_TABLES);
    const [editingTable, setEditingTable] = useState<number | null>(null);

    // PWA Install prompt
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [serverOnline, setServerOnline] = useState(false);

    useEffect(() => {
        const config = syncService.getConfig();
        setServerUrl(config.serverUrl);
        setApiKey(config.apiKey);
        setEnabled(config.enabled);

        // Check server status
        const checkServer = async () => {
            if (config.serverUrl) {
                const res = await syncService.testConnection();
                setServerOnline(res.success);
            }
        };
        checkServer();
        const interval = setInterval(checkServer, 10000);

        // Load DB config
        const savedDb = localStorage.getItem('dbConfig');
        if (savedDb) {
            const dbConfig = JSON.parse(savedDb);
            setDbType(dbConfig.type || 'none');
            setDbHost(dbConfig.host || 'localhost');
            setDbPort(dbConfig.port || '');
            setDbName(dbConfig.name || '');
            setDbUser(dbConfig.user || '');
            setDbPassword(dbConfig.password || '');
        }

        // Load table mappings
        const savedTables = localStorage.getItem('tableMappings');
        if (savedTables) {
            setTables(JSON.parse(savedTables));
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearInterval(interval);
        };
    }, []);

    const handleSaveConfig = () => {
        syncService.updateConfig({ serverUrl, apiKey, enabled });
        localStorage.setItem('dbConfig', JSON.stringify({ type: dbType, host: dbHost, port: dbPort, name: dbName, user: dbUser, password: dbPassword }));
        localStorage.setItem('tableMappings', JSON.stringify(tables));
    };

    const handleToggleEnabled = () => {
        const nextState = !enabled;
        setEnabled(nextState);
        syncService.updateConfig({ serverUrl, apiKey, enabled: nextState });
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            syncService.updateConfig({ serverUrl, apiKey, enabled: false });
            const result = await syncService.testConnection();
            setTestResult(result);
        } catch (e) {
            setTestResult({ success: false, message: 'Error inesperado al intentar conectar' });
        } finally {
            setTesting(false);
        }
    };

    const handleManualSync = async () => {
        setSyncing(true);
        setShowSyncModal(true);
        setSyncResult(null);
        try {
            const result = await syncService.fullSync();
            setSyncResult(result);
        } catch (e) {
            console.error('Manual sync failed:', e);
            setSyncResult({ success: false, downloaded: 0, uploaded: 0 });
        } finally {
            setSyncing(false);
        }
    };

    const handleSubscribe = async () => {
        const success = await subscribeUser('ADMIN_GENERIC'); // Or specific DNI
        if (success) alert('¡Notificaciones activadas!');
        else alert('Error al activar notificaciones. Asegúrate de estar en HTTPS.');
    };

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            alert('La aplicación ya está instalada o tu navegador no soporta la instalación automática desde este botón.');
        }
    };

    const updateTableRemote = (index: number, newRemote: string) => {
        setTables(prev => prev.map((t, i) => i === index ? { ...t, remote: newRemote } : t));
    };

    const InputField = ({ label, ...props }: any) => (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-0.5 italic">{label}</label>
            <input
                {...props}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 ring-blue-500/5 focus:border-blue-500 focus:outline-none transition-all font-mono text-xs font-bold"
            />
        </div>
    );

    const sections = [
        { id: 'sync' as const, label: 'Sincronización Cloud', icon: Server, desc: 'API y conectividad remota' },
        { id: 'database' as const, label: 'Base de Datos Local', icon: Database, desc: 'Persistencia externa' },
        { id: 'tables' as const, label: 'Mapeo de Tablas', icon: Table, desc: 'Estructura de datos' },
        { id: 'pwa' as const, label: 'App & Notificaciones', icon: Smartphone, desc: 'Instalación y push alerts' },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-full md:w-72 space-y-2">
                <div className="p-4 mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Módulos</h4>
                    <p className="text-xs text-slate-500 font-medium italic">Configure la integración del sistema</p>
                </div>
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left p-4 rounded-xl transition-all border group flex items-start gap-4 ${activeSection === section.id
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                    >
                        <div className={`p-2 rounded-lg ${activeSection === section.id ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                            <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest leading-none mt-1">{section.label}</p>
                            <p className={`text-[9px] mt-1.5 font-medium ${activeSection === section.id ? 'text-white/60' : 'text-slate-400'}`}>{section.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeSection === 'sync' && (
                        <motion.div key="sync" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="text-blue-600 w-5 h-5" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Cloud Synchronization</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Endpoint de API" type="text" value={serverUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerUrl(e.target.value)} placeholder="https://cloud.anep.edu.uy/api" />
                                <InputField label="Clave de Acceso (Secret)" type="password" value={apiKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)} placeholder="anep-biometric-2026" />
                            </div>

                            <div className={`p-6 rounded-xl border flex items-center justify-between transition-all ${enabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                                        {enabled ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Servicio Activo</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sincronización en tiempo real cada 180s</p>
                                    </div>
                                </div>
                                <button onClick={handleToggleEnabled} className={`relative w-14 h-8 rounded-full transition-all duration-300 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <motion.div animate={{ x: enabled ? 26 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md" />
                                </button>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button onClick={handleTestConnection} disabled={testing || !serverUrl} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 disabled:opacity-50">
                                    {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                                    Test de Enlace
                                </button>
                                <button onClick={handleSaveConfig} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all active:scale-95">
                                    <Check className="w-4 h-4" />
                                    Aplicar Cambios
                                </button>
                            </div>

                            {window.location.protocol === 'https:' && serverUrl.startsWith('http:') && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[9px] font-bold text-amber-700 uppercase tracking-tight flex items-start gap-2">
                                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>
                                        Advertencia: Estás usando HTTPS pero el Endpoint es HTTP.
                                        El navegador podría bloquear la conexión (Mixed Content).
                                        Usa <b>https://</b> si es posible.
                                    </span>
                                </div>
                            )}

                            {testResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
                                >
                                    {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {testResult.message}
                                </motion.div>
                            )}

                            {/* EXPLICIT POSTGRES BLOCK */}
                            <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-blue-600" />
                                        <h4 className="text-sm font-black uppercase tracking-tight text-blue-900">PostgreSQL Central</h4>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${serverOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {serverOnline ? 'Conectado a la Nube' : 'Sin Conexión'}
                                    </div>
                                </div>
                                <p className="text-[10px] text-blue-800/60 font-medium leading-relaxed">
                                    Use esta sección para replicar funcionarios y rostros entre múltiples terminales.
                                    Asegúrese de que el <b>Endpoint</b> sea la IP de su PC principal (ej: <code>http://192.168.1.10:3001</code>) si accede desde una tablet.
                                </p>
                                <button
                                    onClick={handleManualSync}
                                    disabled={syncing || !enabled}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                                >
                                    {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Sincronizar Datos Ahora
                                </button>
                            </div>

                            {/* Sync Status Popup Modal */}
                            <AnimatePresence>
                                {showSyncModal && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                                        >
                                            <div className={`p-8 flex flex-col items-center text-center ${syncing ? 'bg-white' : syncResult?.success ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${syncing ? 'bg-blue-600 shadow-blue-500/20' : syncResult?.success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500'
                                                    } shadow-xl`}>
                                                    {syncing ? <RefreshCw className="w-10 h-10 text-white animate-spin" /> : syncResult?.success ? <Check className="w-10 h-10 text-white" /> : <X className="w-10 h-10 text-white" />}
                                                </div>

                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-2">
                                                    {syncing ? 'Sincronizando...' : syncResult?.success ? '¡Sincronización Exitosa!' : 'Error de Conexión'}
                                                </h3>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">
                                                    {syncing ? 'Transferiendo datos biométricos' : syncResult?.success ? 'Proceso finalizado correctamente' : 'Verifique su conexión a internet o URL'}
                                                </p>

                                                {syncResult && (
                                                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Descargados</p>
                                                            <p className="text-2xl font-black text-blue-600 leading-none">{syncResult.downloaded}</p>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Subidos</p>
                                                            <p className="text-2xl font-black text-indigo-600 leading-none">{syncResult.uploaded}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {!syncing && (
                                                    <button
                                                        onClick={() => setShowSyncModal(false)}
                                                        className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                                                    >
                                                        Cerrar Ventana
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeSection === 'pwa' && (
                        <motion.div key="pwa" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                            <div className="flex items-center gap-3">
                                <Smartphone className="text-indigo-600 w-5 h-5" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">App Experience & Alerts</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Install App */}
                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <Download className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-tight text-slate-900">Aplicación de Escritorio</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Instala el Kiosco como una aplicación nativa en tu dispositivo para acceso rápido y modo pantalla completa.</p>
                                    <button
                                        onClick={handleInstallApp}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10"
                                    >
                                        Instalar Kiosco ANEP
                                    </button>
                                </div>

                                {/* Push Notifications */}
                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-100 rounded-lg">
                                            <Bell className="w-5 h-5 text-rose-600" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-tight text-slate-900">Push Notifications</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Recibe alertas inmediatas en tiempo real sobre incidencias, marcas duplicadas o desconexiones del servidor central.</p>
                                    <button
                                        onClick={handleSubscribe}
                                        className="w-full py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/10"
                                    >
                                        Activar Alertas Push
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                <Shield className="w-4 h-4 text-amber-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Importante</p>
                                    <p className="text-[9px] text-amber-600/80 font-medium line-clamp-2">Para habilitar las notificaciones push y la instalación PWA, el sitio DEBE servirse a través de HTTPS de forma obligatoria.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSection === 'database' && (
                        <motion.div key="database" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Database className="text-violet-600 w-5 h-5" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">External DB Connectivity</h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 italic ml-1">Motor de Almacenamiento</label>
                                <div className="relative">
                                    <select
                                        value={dbType}
                                        onChange={(e) => {
                                            const val = e.target.value as DbType;
                                            setDbType(val);
                                            if (val === 'mysql') setDbPort('3306');
                                            else if (val === 'postgres') setDbPort('5432');
                                        }}
                                        className="w-full appearance-none px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-4 ring-blue-500/5 focus:border-blue-500 outline-none transition-all pr-12"
                                    >
                                        <option value="none">Sin Base Externa (Solo Local)</option>
                                        <option value="mysql">MySQL Server / MariaDB</option>
                                        <option value="postgres">Postgre SQL Server</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {dbType !== 'none' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <InputField label="Host / IP Address" value={dbHost} onChange={(e: any) => setDbHost(e.target.value)} />
                                    <InputField label="Port" value={dbPort} onChange={(e: any) => setDbPort(e.target.value)} />
                                    <InputField label="Database Name" value={dbName} onChange={(e: any) => setDbName(e.target.value)} />
                                    <InputField label="Username" value={dbUser} onChange={(e: any) => setDbUser(e.target.value)} />
                                    <div className="md:col-span-2">
                                        <InputField label="Password" type="password" value={dbPassword} onChange={(e: any) => setDbPassword(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSaveConfig} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all active:scale-95">
                                <Check className="w-4 h-4" />
                                Vincular Base de Datos
                            </button>
                        </motion.div>
                    )}

                    {activeSection === 'tables' && (
                        <motion.div key="tables" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Table className="text-orange-600 w-5 h-5" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Table Schemas</h3>
                            </div>

                            <div className="space-y-4">
                                {tables.map((table, idx) => (
                                    <div key={table.local} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-5 flex items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                                    <Table className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 italic">Local</span>
                                                        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{table.local}</span>
                                                        <span className="text-slate-300 mx-1">→</span>
                                                        <span className="text-[10px] font-black uppercase text-blue-600 italic">Remota</span>
                                                        {editingTable === idx ? (
                                                            <input
                                                                type="text"
                                                                value={table.remote}
                                                                onChange={e => updateTableRemote(idx, e.target.value)}
                                                                className="text-xs font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded border-2 border-blue-500 outline-none w-48"
                                                                autoFocus
                                                                onBlur={() => setEditingTable(null)}
                                                                onKeyDown={e => e.key === 'Enter' && setEditingTable(null)}
                                                            />
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingTable(idx)}
                                                                className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-100 hover:border-blue-300 transition-all"
                                                            >
                                                                {table.remote}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{table.description}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setEditingTable(idx)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSaveConfig} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all active:scale-95">
                                <Check className="w-4 h-4" />
                                Guardar Estructura
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
