import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type User } from '../db';
import { CheckCircle2, Printer, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { brandingService } from '../services/brandingService';

interface TicketPrinterProps {
    user: User;
    type: string;
    timestamp: number;
    onDone: () => void;
}

export function TicketPrinter({ user, type, timestamp, onDone }: TicketPrinterProps) {
    const [showPrintConfirm, setShowPrintConfirm] = useState(true);
    const dateStr = new Date(timestamp).toLocaleString();
    const ticketId = `TK-${user.dni}-${timestamp}`;

    const handlePrint = () => {
        setShowPrintConfirm(false);

        // This triggers the browser print dialog.
        // For SILENT PRINTING, the browser must be launched with:
        // --kiosk-printing
        setTimeout(() => {
            window.print();
            // We immediately proceed to complete/done to not block the kiosk
            onDone();
        }, 300);
    };

    const handleSkipPrint = () => {
        onDone();
    };

    return (
        <>
            {/* Success + Print Confirmation */}
            {showPrintConfirm ? (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-8 py-8 no-print"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center border-4 border-green-500/40"
                    >
                        <CheckCircle2 className="w-14 h-14 text-green-600" strokeWidth={2.5} />
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center space-y-2"
                    >
                        <h3 className="text-5xl font-black text-black tracking-tight leading-none uppercase">¡REGISTRADO!</h3>
                        <p className="text-2xl font-bold text-green-600">{type}</p>
                        <p className="text-lg text-slate-800 font-bold">{user.name}</p>
                        <p className="text-sm text-slate-400 font-mono font-bold">{new Date(timestamp).toLocaleTimeString()}</p>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center space-y-4 w-full max-w-md"
                    >
                        <p className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Imprimir comprobante?</p>

                        <div className="flex gap-4">
                            <button
                                onClick={handleSkipPrint}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-5 rounded-3xl bg-slate-100 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] active:scale-95"
                            >
                                <X className="w-5 h-5" strokeWidth={3} />
                                Omitir
                            </button>

                            <button
                                onClick={handlePrint}
                                className="flex-[1.5] flex items-center justify-center gap-2 px-6 py-5 rounded-3xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                <Printer className="w-5 h-5" strokeWidth={3} />
                                Imprimir Ticket
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : (
                /* Printing State (very quick) */
                <div className="flex flex-col items-center justify-center gap-6 py-12 no-print">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-xl font-black text-slate-800 uppercase tracking-tight">Procesando Impresión...</p>
                </div>
            )}

            {/* Hidden Print-only Template */}
            <div className="hidden print:block bg-white text-black font-mono">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    @media print {
                        /* Force everything to hide */
                        body *, html * {
                            visibility: hidden !important;
                            height: 0 !important;
                            overflow: hidden !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        /* Show only the ticket container and its children */
                        .print-container, .print-container * {
                            visibility: visible !important;
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 80mm !important;
                            padding: 4mm !important;
                            background: white !important;
                            z-index: 99999 !important;
                        }
                        html, body {
                            background: white !important;
                            width: 80mm !important;
                            height: auto !important;
                        }
                    }
                `}} />

                <div className="print-container">
                    <div className="border-b-2 border-black pb-2 mb-3 flex flex-col items-center">
                        <h2 className="text-sm font-black leading-none uppercase">{brandingService.getConfig().clientName}</h2>
                        <p className="text-[7px] font-black tracking-[0.2em] mt-1 whitespace-nowrap">CONTROL DE ASISTENCIA</p>
                    </div>

                    <div className="space-y-2 text-center">
                        <div>
                            <p className="text-[7px] uppercase font-bold text-gray-500">Funcionario</p>
                            <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">{user.name}</p>
                            <p className="text-[8px] font-bold">DNI: {user.dni}</p>
                        </div>

                        <div className="border-y-2 border-dashed border-black py-2">
                            <p className="text-base font-black uppercase leading-none">{type}</p>
                            <p className="text-[9px] mt-1 font-bold italic">{dateStr}</p>
                        </div>

                        <div className="flex justify-center py-2">
                            <QRCodeSVG value={JSON.stringify({ n: user.name, d: user.dni, t: timestamp, m: type })} size={100} />
                        </div>

                        <div className="text-[7px] leading-tight pt-1">
                            <p className="font-bold uppercase tracking-widest">Verificación Biométrica OK</p>
                            <p className="mt-0.5 opacity-60">ID: {ticketId}</p>
                            <div className="h-8" />
                            <p className="text-[6px] border-t border-black pt-1">Fin de Comprobante</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
