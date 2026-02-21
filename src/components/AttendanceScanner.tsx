import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { db, type User } from '../db';
import { motion } from 'framer-motion';


interface AttendanceScannerProps {
    onMatch: (user: User, photo: string) => void;
    onUnknownFace: () => void;
    onBack?: () => void;
}

import { X } from 'lucide-react';

export function AttendanceScanner({ onMatch, onUnknownFace, onBack }: AttendanceScannerProps) {
    const webcamRef = useRef<Webcam>(null);
    const { modelsLoaded, detectFace, matchFace } = useFaceRecognition();
    const [isProcessing, setIsProcessing] = useState(false);
    const [confidence, setConfidence] = useState<number | null>(null);
    const [lastMatchId, setLastMatchId] = useState<number | null>(null);
    const [lastUnknownTime, setLastUnknownTime] = useState<number>(0);
    const [unknownCounter, setUnknownCounter] = useState<number>(0);

    // Audio effects
    const successAudio = useRef(new Audio('/accesocorrecto.mp3'));
    const errorAudio = useRef(new Audio('/rostrodesconocido.mp3'));

    const playSound = (type: 'success' | 'error') => {
        const audio = type === 'success' ? successAudio.current : errorAudio.current;
        audio.currentTime = 0;
        audio.play().catch(() => console.log('Audio playback blocked by browser/user interaction'));
    };

    const processFrame = useCallback(async () => {
        if (isProcessing || !modelsLoaded || !webcamRef.current) return;

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4) return;

        setIsProcessing(true);
        try {
            const detection = await detectFace(video);

            if (detection) {
                const match = matchFace(detection.descriptor);

                if (match) {
                    const confValue = Math.max(0, Math.round((1 - match.distance) * 100));
                    setConfidence(confValue);

                    if (match.label !== 'unknown' && match.distance < 0.4) {
                        const userId = parseInt(match.label);
                        const user = await db.users.get(userId);

                        if (user && userId !== lastMatchId) {
                            const photo = webcamRef.current.getScreenshot() || '';
                            playSound('success');
                            setLastMatchId(userId);
                            setUnknownCounter(0); // Reset on match
                            onMatch(user, photo);

                            setTimeout(() => {
                                setLastMatchId(null);
                                setConfidence(null);
                            }, 5000);
                        }
                    } else if (match.label === 'unknown' || match.distance >= 0.5) {
                        // Incremental logic to avoid false "Unknown" alerts
                        setUnknownCounter(prev => prev + 1);

                        // Only trigger unknown if we failed 3 times in a row
                        if (unknownCounter >= 3) {
                            const now = Date.now();
                            if (now - lastUnknownTime > 10000) { // 10s cooldown for splash
                                playSound('error');
                                setLastUnknownTime(now);
                                setUnknownCounter(0);
                                const imageSrc = webcamRef.current.getScreenshot();
                                await db.unknownFaces.add({
                                    timestamp: now,
                                    photo: imageSrc || undefined,
                                    synced: false
                                });
                                onUnknownFace();
                            }
                        }
                    }
                }
            } else {
                setConfidence(null);
            }
        } catch (err) {
            console.error('Processing error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [detectFace, isProcessing, lastMatchId, lastUnknownTime, matchFace, modelsLoaded, onMatch, onUnknownFace]);

    useEffect(() => {
        const interval = setInterval(processFrame, 250); // Faster checks (4 times per second)
        return () => clearInterval(interval);
    }, [processFrame]);

    return (
        <>
            {/* Status Badge - REDESIGNED */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-8 z-50 flex items-center gap-3 px-5 py-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg"
            >
                <div className="relative flex items-center justify-center w-2.5 h-2.5">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    <div className="relative w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] leading-none">
                        Biometría Activa
                    </span>
                    <span className="text-[8px] text-emerald-400 font-mono font-bold tracking-tight mt-0.5">
                        SISTEMA EN LÍNEA
                    </span>
                </div>
            </motion.div>

            {/* Close Button - STYLED WITH TEXT */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-8 right-8 z-50 pl-4 pr-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-xl rounded-full text-white transition-all active:scale-95 border border-rose-500/20 group flex items-center gap-2"
                >
                    <div className="p-1 bg-rose-500 rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/40">
                        <X className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-white">Volver</span>
                </button>
            )}

            {/* Camera Frame */}
            <div className="relative w-[500px] aspect-[3/4] rounded-[3rem] overflow-hidden border-[12px] border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.3)] bg-black/20 backdrop-blur-3xl">
                {!modelsLoaded ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/40 backdrop-blur-xl">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-white/60 font-black uppercase tracking-widest text-xs">Iniciando Biometría...</p>
                    </div>
                ) : (
                    <>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover scale-x-[-1] opacity-90"
                            videoConstraints={{
                                facingMode: "user",
                                width: 720,
                                height: 1280,
                            }}
                        />

                        {/* Scanning Effect Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Only show scan line when NOT identifying to reduce noise */}
                            {confidence === null && (
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-scan opacity-50" />
                            )}

                            {/* Corner Indicators */}
                            <div className="absolute top-8 left-8 w-12 h-12 border-t-[4px] border-l-[4px] border-white/20 rounded-tl-3xl" />
                            <div className="absolute top-8 right-8 w-12 h-12 border-t-[4px] border-r-[4px] border-white/20 rounded-tr-3xl" />
                            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-[4px] border-l-[4px] border-white/20 rounded-bl-3xl" />
                            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-[4px] border-r-[4px] border-white/20 rounded-br-3xl" />

                            {/* Confidence Ring - CENTERED */}
                            {confidence !== null && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]"
                                >
                                    <div className="relative w-48 h-48">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                                            <motion.circle
                                                cx="50" cy="50" r="45"
                                                fill="none"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                stroke={confidence > 80 ? '#4ade80' : '#60a5fa'}
                                                strokeDasharray={`${2 * Math.PI * 45}`}
                                                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                                                animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - confidence / 100) }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-5xl font-black font-mono text-white tracking-tighter drop-shadow-2xl">
                                                {confidence}%
                                            </span>
                                            <span className="text-[10px] text-white/80 font-black uppercase tracking-[0.3em] mt-2">
                                                {confidence > 60 ? 'IDENTIFICANDO' : 'ANALIZANDO'}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Removed flickering ProcessingSplash */}
        </>
    );
}
