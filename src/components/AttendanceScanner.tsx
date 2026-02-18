import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { db, type User } from '../db';
import { motion } from 'framer-motion';
import { ProcessingSplash } from './ProcessingSplash';

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
        audio.play().catch(e => console.log('Audio playback blocked by browser/user interaction'));
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

                    if (match.label !== 'unknown' && match.distance < 0.5) {
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
            <div className="flex flex-col items-center justify-center gap-6">
                {/* Status Badge - Above camera */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 px-6 py-3 bg-slate-900/80 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-blue-400' : 'bg-green-400'}`} />
                            <div className={`absolute inset-0 w-2 h-2 rounded-full ${isProcessing ? 'bg-blue-400' : 'bg-green-400'} animate-ping`} />
                        </div>
                        <span className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em]">
                            {isProcessing ? 'Analizando' : 'Escáner activo'}
                        </span>
                    </div>
                    {confidence !== null && (
                        <>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${confidence}%` }}
                                        className={`h-full rounded-full ${confidence > 80 ? 'bg-green-400' : confidence > 50 ? 'bg-blue-400' : 'bg-amber-400'}`}
                                    />
                                </div>
                                <span className="text-[10px] text-white/50 font-mono font-bold">{confidence}%</span>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Close Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-8 right-8 z-50 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl text-white transition-all active:scale-95 border border-white/10"
                    >
                        <X className="w-6 h-6" />
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

                            {/* Ingenious Idle State: Futuristic Scan Wireframe when no face detected */}
                            {confidence === null && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                                >
                                    <img
                                        src="/reco.jpg"
                                        className="w-full h-full object-cover opacity-60"
                                        alt="Scanner Reference"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent animate-pulse" />
                                </motion.div>
                            )}

                            {/* Overlay scanning effect */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/80 shadow-[0_0_25px_rgba(59,130,246,0.8)] animate-scan" />

                                {/* Corner Indicators */}
                                <div className="absolute top-10 left-10 w-16 h-16 border-t-[3px] border-l-[3px] border-blue-500/40 rounded-tl-3xl" />
                                <div className="absolute top-10 right-10 w-16 h-16 border-t-[3px] border-r-[3px] border-blue-500/40 rounded-tr-3xl" />
                                <div className="absolute bottom-10 left-10 w-16 h-16 border-b-[3px] border-l-[3px] border-blue-500/40 rounded-bl-3xl" />
                                <div className="absolute bottom-10 right-10 w-16 h-16 border-b-[3px] border-r-[3px] border-blue-500/40 rounded-br-3xl" />

                                {/* Confidence Overlay on Camera */}
                                {confidence !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center"
                                    >
                                        <div className="relative w-24 h-24">
                                            {/* Background ring */}
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                                                <motion.circle
                                                    cx="50" cy="50" r="42"
                                                    fill="none"
                                                    strokeWidth="6"
                                                    strokeLinecap="round"
                                                    stroke={confidence > 80 ? '#4ade80' : confidence > 50 ? '#60a5fa' : '#fbbf24'}
                                                    strokeDasharray={`${2 * Math.PI * 42}`}
                                                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - confidence / 100) }}
                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-2xl font-black font-mono drop-shadow-lg ${confidence > 80 ? 'text-green-400' : confidence > 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                                                    {confidence}%
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[8px] text-white/60 font-black uppercase tracking-widest mt-1 drop-shadow">
                                            Confianza
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Fullscreen Processing Splash */}
            {isProcessing && <ProcessingSplash type="processing" />}
        </>
    );
}
