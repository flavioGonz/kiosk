import { CheckCircle2, RefreshCw, Zap } from 'lucide-react';

export function ChangelogTab() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Registro de Cambios</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Auditoría y evolución del sistema BioCloud Kiosk
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-8">
                {/* LATEST RELEASE */}
                <div className="relative pl-8 border-l-2 border-slate-100">
                    <div className="absolute top-0 -left-[11px] w-5 h-5 bg-blue-100 border-4 border-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">v3.1.0 (No liberada)</span>
                            <span className="text-xs font-bold text-slate-400">Hace unas horas</span>
                        </div>

                        <div className="grid gap-3">
                            {/* ADDED */}
                            <div className="flex gap-3 border p-4 rounded-xl border-emerald-100 bg-emerald-50/50">
                                <Zap className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">Nuevas Funcionalidades</h4>
                                    <ul className="mt-2 space-y-2 text-xs font-medium text-gray-600">
                                        <li>• <span className="font-bold">Nómina y Liquidación:</span> Módulos estructurales iniciales para manejar el estado de la nómina de los empleados.</li>
                                        <li>• <span className="font-bold">Turnos y Códigos:</span> Asignación nativa para mapear códigos dinámicos y distintas tipologías de turno (Fijo, Rotativo, Abierto).</li>
                                        <li>• <span className="font-bold">Respaldo Local Fuerte:</span> Posibilidad de descargar bases de datos locales (empleados y registros) como JSON de respaldo, sin depender de la red en la vista Dispositivos.</li>
                                        <li>• <span className="font-bold">Monitoreo Fino de Tiempo:</span> Disparidad del reloj servidor/terminal expuesta con detalle real en la lista de gestión de kioscos.</li>
                                        <li>• <span className="font-bold">Enrolamiento Integrado:</span> Panel administrativo Web para captura de empleados, reemplazando las ventanas estáticas e invadiendo menos el contexto de red.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* CHANGED */}
                            <div className="flex gap-3 border p-4 rounded-xl border-amber-100 bg-amber-50/50">
                                <RefreshCw className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">Mejoras y Cambios</h4>
                                    <ul className="mt-2 space-y-2 text-xs font-medium text-gray-600">
                                        <li>• Refactorización total del <span className="font-mono text-[10px] bg-amber-100 px-1 rounded">UserFormModal</span> para usar componentes de selección dinámicos basados en la base de datos (Sectores y Turnos en vez de texto plano).</li>
                                        <li>• Menú de carpetas mejorado con validaciones inteligentes al intentar eliminar una asignación utilizada.</li>
                                        <li>• Rediseño estético principal en todo el panel con tonos e íconos más descriptivos a nivel <i>Seguridad</i> y <i>Control de Horario</i>.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* FIXED */}
                            <div className="flex gap-3 border p-4 rounded-xl border-blue-100 bg-blue-50/50">
                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">Correcciones</h4>
                                    <ul className="mt-2 space-y-2 text-xs font-medium text-gray-600">
                                        <li>• Menú de categorías agrupado lógicamente para flujos conceptuales como "Empresa" o "Seguridad".</li>
                                        <li>• Limpieza profunda de referencias perdidas o problemas de dependencias <i>Lucide React</i> para garantizar compilaciones robustas en producción.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIOUS VERSIONS PLACEHOLDER SPHERE */}
                <div className="relative pl-8 border-l-2 border-transparent">
                    <div className="absolute top-0 -left-[11px] w-5 h-5 bg-slate-100 border-4 border-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-300 rounded-full" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">v3.0.0</span>
                        <span className="text-xs font-bold text-slate-400">Lanzamiento Base (Sistema de Fichadas)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
