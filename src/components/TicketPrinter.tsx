import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type User } from '../db';
import { CheckCircle2, Printer, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface TicketPrinterProps {
    user: User;
    type: string;
    timestamp: number;
    onDone: () => void;
}

export function TicketPrinter({ user, type, timestamp, onDone }: TicketPrinterProps) {
    const [showPrintConfirm, setShowPrintConfirm] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const dateStr = new Date(timestamp).toLocaleString();
    const ticketId = `TK-${user.dni}-${timestamp}`;

    const handlePrint = () => {
        setIsPrinting(true);
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
            <div className="hidden print:block fixed inset-0 bg-white text-black p-4 font-mono text-center">
                <div className="border-b-2 border-black pb-4 mb-4 flex flex-col items-center">
                    <h2 className="text-xl font-bold leading-none uppercase">ANEP - ASISTENCIA</h2>
                    <p className="text-[10px] font-bold tracking-widest mt-1">SISTEMA TÓTEM BIOMÉTRICO</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-600">Funcionario</p>
                        <p className="text-base font-bold">{user.name}</p>
                        <p className="text-[10px]">DNI: {user.dni}</p>
                    </div>

                    <div className="border-y border-dashed border-black py-2">
                        <p className="text-xl font-bold uppercase">{type}</p>
                        <p className="text-[10px] mt-1">{dateStr}</p>
                    </div>

                    <div className="flex justify-center p-2">
                        <QRCodeSVG value={JSON.stringify({ dni: user.dni, timestamp, type })} size={80} />
                    </div>

                    <div className="text-[8px] leading-tight">
                        <p>ID: {ticketId}</p>
                        <p className="mt-1 italic">Conserve este comprobante para su control personal.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
