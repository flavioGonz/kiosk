import { Briefcase, Settings2, Download, FileText } from 'lucide-react';

export function PayrollManagement() {
    return (
        <div className="w-full h-full p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-blue-600" />
                        Nómina de Horas
                    </h2>
                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">Control de pagos y horas trabajadas</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 transition-all shadow-sm">
                        <Settings2 size={16} /> Ajustes
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                        <Download size={16} /> Exportar Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-12 text-center flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <FileText size={48} />
                </div>
                <h3 className="text-xl font-black uppercase text-gray-900 mb-2">Módulo en Desarrollo</h3>
                <p className="text-gray-500 max-w-md mx-auto text-sm font-medium">Aquí podrás liquidar los pagos basados en las horas registradas, los turnos y los códigos de tarea realizados por el personal.</p>
            </div>
        </div>
    );
}
