import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { db, type User } from '../db';
import {
    User as UserIcon, Camera, AlertCircle,
    ShieldCheck, Mail, Phone, MessageSquare, Lock,
    CreditCard, ScanFace, RotateCcw, Fingerprint, Save, Layers,
    Network, Shield, Building, Upload, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { syncService } from '../services/syncService';

interface UserFormModalProps {
    user?: User | null;              // null/undefined = creating new user
    onComplete: () => void;
    onCancel: () => void;
}

export function UserFormModal({ user, onComplete, onCancel }: UserFormModalProps) {
    const isEditing = !!user;
    const webcamRef = useRef<Webcam>(null);
    const { detectFace, modelsLoaded, refreshFaceMatcher } = useFaceRecognition();

    // Form fields
    const [name, setName] = useState(user?.name || '');
    const [dni, setDni] = useState(user?.dni || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
    const [pin, setPin] = useState(user?.pin || '');
    const [sector, setSector] = useState(user?.sector || '');
    const [role, setRole] = useState<'user' | 'manager' | 'admin' | 'superadmin'>(user?.role || 'user');
    const [tenantId, setTenantId] = useState(user?.tenantId || '');
    const [assignedKiosks, setAssignedKiosks] = useState<string[]>(user?.assignedKiosks || []);
    const [availableKiosks, setAvailableKiosks] = useState<{ id: string, name: string }[]>([]);
    const [shiftId, setShiftId] = useState<number | ''>(user?.shiftId || '');

    // Load config states
    const [availableSectors, setAvailableSectors] = useState<string[]>([]);
    const [availableShifts, setAvailableShifts] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        const loadConfigs = async () => {
            // Sectors
            const allUsers = await db.users.toArray();
            const customSectorsStr = localStorage.getItem('kiosk_custom_sectors');
            const customSectors = customSectorsStr ? JSON.parse(customSectorsStr) : [];
            const sectors = Array.from(new Set([...allUsers.map(u => u.sector).filter(Boolean), ...customSectors])) as string[];
            setAvailableSectors(sectors);

            // Shifts
            const shifts = await db.shifts.toArray();
            setAvailableShifts(shifts.map(s => ({ id: s.id!, name: s.name })));

            // Devices
            try {
                const devs = await syncService.getDevices();
                setAvailableKiosks(devs.map((d: { kiosk_id: string; name: string }) => ({ id: d.kiosk_id, name: d.name || d.kiosk_id })));
            } catch (e) {
                console.error("Failed to load devices", e);
            }
        };
        loadConfigs();
    }, []);

    // Enrollment state
    const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>(user?.faceDescriptors || []);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>(user?.photos || []);
    const [captureQualities, setCaptureQualities] = useState<number[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [liveQuality, setLiveQuality] = useState<number | null>(null);
    const liveDetectionRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // New states for splashscreen logic
    const [showCamera, setShowCamera] = useState(!isEditing);

    // File upload logic
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result as string;
            const img = new Image();
            img.onload = async () => {
                try {
                    const detection = await detectFace(img);
                    if (detection) {
                        const quality = Math.round(detection.detection.score * 100);
                        // Simulate 3 samples so the form allows saving
                        setCapturedDescriptors([detection.descriptor, detection.descriptor, detection.descriptor]);
                        setCapturedPhotos([result]);
                        setCaptureQualities([quality, quality, quality]);
                        setShowCamera(false);
                    } else {
                        setError('No se detectó un rostro claro en la foto subida. Usa otra o usa la cámara.');
                    }
                } catch (err) {
                    setError('Error procesando la imagen subida.');
                }
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    // Live face detection polling for quality indicator
    useEffect(() => {
        if (!modelsLoaded || !webcamRef.current) return;

        liveDetectionRef.current = setInterval(async () => {
            if (!webcamRef.current || isCapturing) return;
            const video = webcamRef.current.video;
            if (!video || video.readyState !== 4) return;

            try {
                const detection = await detectFace(video);
                if (detection) {
                    // Score based on detection confidence (0-1 range from face-api)
                    const score = Math.round(detection.detection.score * 100);
                    setLiveQuality(score);
                } else {
                    setLiveQuality(null);
                }
            } catch {
                // Silent fail during polling
            }
        }, 1500);

        return () => {
            if (liveDetectionRef.current) clearInterval(liveDetectionRef.current);
        };
    }, [modelsLoaded, isCapturing, detectFace]);

    // Reset form when user prop changes
    useEffect(() => {
        if (user) {
            setName(user.name);
            setDni(user.dni);
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setWhatsapp(user.whatsapp || '');
            setPin(user.pin || '');
            setSector(user.sector || '');
            setShiftId(user.shiftId || '');
            setRole(user.role || 'user');
            setTenantId(user.tenantId || '');
            setAssignedKiosks(user.assignedKiosks || []);
            setCapturedDescriptors(user.faceDescriptors || []);
            setCapturedPhotos(user.photos || []);
        }
    }, [user]);

    const handleCapture = useCallback(async () => {
        if (!webcamRef.current || !modelsLoaded) return;

        setIsCapturing(true);
        setError(null);

        const video = webcamRef.current.video;
        if (!video || video.readyState !== 4) {
            setError('La cámara no está lista.');
            setIsCapturing(false);
            return;
        }

        try {
            const detection = await detectFace(video);
            if (detection) {
                const screenshot = webcamRef.current.getScreenshot();
                if (screenshot) {
                    const quality = Math.round(detection.detection.score * 100);
                    setCapturedDescriptors(prev => [...prev, detection.descriptor]);
                    setCapturedPhotos(prev => [...prev, screenshot]);
                    setCaptureQualities(prev => [...prev, quality]);
                } else {
                    setError('Error al capturar la imagen.');
                }
            } else {
                setError('No se detectó ningún rostro. Asegúrate de estar frente a la cámara.');
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            console.error('Capture error:', err);
            setError('Error al procesar la imagen facial.');
        } finally {
            setIsCapturing(false);
        }
    }, [detectFace, modelsLoaded]);

    const handleResetCaptures = () => {
        setCapturedDescriptors([]);
        setCapturedPhotos([]);
        setCaptureQualities([]);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !dni) {
            setError('Nombre y DNI son obligatorios.');
            return;
        }

        if (capturedDescriptors.length === 0) {
            setError('Debes capturar al menos una muestra facial.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (isEditing && user?.id) {
                // Update
                await db.users.update(user.id, {
                    name, dni, email, phone, whatsapp, pin, sector,
                    shiftId: shiftId ? Number(shiftId) : undefined,
                    tenantId, role, assignedKiosks,
                    faceDescriptors: capturedDescriptors,
                    photos: capturedPhotos,
                });
            } else {
                // Create
                await db.users.add({
                    name, dni, email, phone, whatsapp, pin, sector,
                    shiftId: shiftId ? Number(shiftId) : undefined,
                    tenantId, role, assignedKiosks,
                    faceDescriptors: capturedDescriptors,
                    photos: capturedPhotos,
                    createdAt: Date.now(),
                });
            }
            await refreshFaceMatcher();

            // PROACTIVE SYNC: Push new/updated user to central DB immediately
            try {
                await syncService.fullSync();
            } catch (e) {
                console.error('Proactive sync failed:', e);
            }

            onComplete();
        } catch (err) {
            console.error(err);
            setError('Error al guardar. El DNI podría estar ya registrado.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[100] bg-slate-50 flex flex-col xl:flex-row gap-0 overflow-y-auto"
        >
            {/* Header Close button (top right absolute) */}
            <button
                type="button"
                onClick={onCancel}
                className="absolute top-6 right-6 z-50 p-3 bg-white/50 backdrop-blur hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm"
            >
                x
            </button>

            {/* LEFT: Form Fields */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto pt-16">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isEditing ? 'bg-blue-600 shadow-blue-500/20' : 'bg-green-600 shadow-green-500/20'}`}>
                        {isEditing ? <UserIcon className="text-white w-6 h-6" /> : <ScanFace className="text-white w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">
                            {isEditing ? 'Editar Funcionario' : 'Nuevo Funcionario'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {isEditing ? 'Modificar datos y biometría' : 'Registro de identidad biométrica'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <InputField
                                icon={UserIcon}
                                label="Nombre Completo"
                                type="text"
                                required
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <InputField
                            icon={CreditCard}
                            label="DNI / Documento"
                            type="text"
                            required
                            value={dni}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDni(e.target.value)}
                            placeholder="12345678"
                        />
                        <InputField
                            icon={Lock}
                            label="PIN Personal (6 dígitos)"
                            type="password"
                            maxLength={6}
                            value={pin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
                            placeholder="Opcional"
                        />
                        <InputField
                            icon={Mail}
                            label="Correo Electrónico"
                            type="email"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                        />
                        <InputField
                            icon={MessageSquare}
                            label="WhatsApp"
                            type="text"
                            value={whatsapp}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsapp(e.target.value)}
                            placeholder="+598..."
                        />
                        <InputField
                            icon={Phone}
                            label="Teléfono Auxiliar"
                            type="text"
                            value={phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                            placeholder="Opcional"
                        />
                        <div className="space-y-1.5 w-full">
                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                <Layers className="w-3 h-3 text-blue-500" />
                                Sector / Carpeta
                            </label>
                            <select
                                value={sector}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSector(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Sin Sector Asignado</option>
                                {availableSectors.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 w-full">
                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                <Clock className="w-3 h-3 text-blue-500" />
                                Horario Asignado
                            </label>
                            <select
                                value={shiftId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setShiftId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Sin Horario Fijo</option>
                                {availableShifts.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <InputField
                                icon={Building}
                                label="Tenant ID (Empresa/Sucursal)"
                                type="text"
                                value={tenantId}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantId(e.target.value)}
                                placeholder="Ej: EMPRESA-01 (Dejar vacío para global)"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    <Shield className="w-3 h-3" />
                                    Rol en el Sistema
                                </label>
                                <select
                                    value={role}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as 'user' | 'manager' | 'admin' | 'superadmin')}
                                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="user">Funcionario</option>
                                    <option value="manager">Administrador Local (Manager)</option>
                                    <option value="admin">Administrador Global</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    <Network className="w-3 h-3" />
                                    Terminales Autorizados (Asignación Kioscos)
                                </label>
                                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                                    <label className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={assignedKiosks.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setAssignedKiosks([]);
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-900 uppercase">Todos los terminales (Acceso Global)</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Puede fichar en cualquier reloj de la red</span>
                                        </div>
                                    </label>
                                    <div className="h-px w-full bg-slate-200 my-2" />
                                    {availableKiosks.map(k => {
                                        const isChecked = assignedKiosks.includes(k.id);
                                        return (
                                            <label key={k.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAssignedKiosks(prev => [...prev.filter(id => id !== k.id), k.id]);
                                                        } else {
                                                            const next = assignedKiosks.filter(id => id !== k.id);
                                                            // Si desmarcamos el último, vuelve a "Todos los terminales" (vacío)
                                                            // o podemos dejarlo vacío que significa global? Mejor obligarlo a elegir si está armando lógica.
                                                            // Un array vacío indica "todos", un array con elementos indica "estos".
                                                            setAssignedKiosks(next);
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-700 uppercase">{k.name}</span>
                                                    <span className="text-[9px] text-gray-400 font-mono tracking-wider">{k.id}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-xs font-bold">{error}</p>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-100 transition-all border border-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg shadow-gray-900/10 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Funcionario'}
                        </button>
                    </div>
                </form>
            </div>

            {/* DIVIDER */}
            <div className="hidden xl:block w-px bg-gray-200 my-4" />
            <div className="block xl:hidden h-px bg-gray-200 mx-4" />

            {/* RIGHT: Enrollment / Biometrics */}
            <div className="w-full xl:w-[320px] p-6 lg:pl-4 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4 w-full">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Fingerprint className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none">Enrolamiento Facial</h3>
                        <p className="text-[9px] text-slate-400 font-bold">{capturedDescriptors.length} muestra(s) capturada(s)</p>
                    </div>
                </div>

                {/* Captured Photo Thumbnails */}
                {capturedPhotos.length > 0 && (
                    <div className="flex gap-2 w-full flex-wrap justify-center my-4">
                        {capturedPhotos.map((photo, i) => (
                            <div key={i} className="relative group">
                                <img
                                    src={photo}
                                    className="w-16 h-16 rounded-xl object-cover border-2 border-green-200 shadow-sm"
                                    alt={`Muestra ${i + 1}`}
                                />
                                <div className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white text-[8px] font-black text-white ${(captureQualities[i] || 0) >= 80 ? 'bg-green-500' : (captureQualities[i] || 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}>
                                    {captureQualities[i] || '?'}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Webcam or Static Photo */}
                <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 mb-6 flex-shrink-0">

                    {!showCamera ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
                            {capturedPhotos[0] || user?.photos?.[0] ? (
                                <img src={capturedPhotos[0] || user?.photos?.[0]} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-20 h-20 text-slate-300" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity gap-3 backdrop-blur-sm">
                                <button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase rounded-xl tracking-widest shadow-xl flex items-center gap-2"
                                >
                                    <Camera className="w-4 h-4" /> Activar Cámara
                                </button>
                                <label className="px-6 py-3 bg-white text-slate-800 font-black text-xs uppercase rounded-xl tracking-widest shadow-xl cursor-pointer flex items-center gap-2">
                                    <Upload className="w-4 h-4" /> Subir Foto Local
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <>
                            {!modelsLoaded ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                                    <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3" />
                                    <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Iniciando IA...</p>
                                </div>
                            ) : null}
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover scale-x-[-1]"
                                videoConstraints={{ facingMode: "user", width: 480, height: 640 }}
                                onUserMediaError={() => setError('No se pudo acceder a la cámara.')}
                            />

                            {/* Progress bar */}
                            <div className="absolute top-3 left-3 right-3 flex gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-all ${i < capturedDescriptors.length ? 'bg-green-500' : 'bg-white/30'}`}
                                    />
                                ))}
                            </div>

                            {/* Sample Counter + Live Quality */}
                            {showCamera && (
                                <div className="absolute bottom-3 inset-x-3 flex justify-center gap-2">
                                    <span className="bg-black/50 backdrop-blur-md text-white text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                                        {capturedDescriptors.length} / 3
                                    </span>
                                    {liveQuality !== null && !isCapturing && (
                                        <span className={`backdrop-blur-md text-white text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${liveQuality >= 80 ? 'bg-green-500/70' : liveQuality >= 50 ? 'bg-blue-500/70' : 'bg-amber-500/70'
                                            }`}>
                                            Calidad: {liveQuality}%
                                        </span>
                                    )}
                                </div>
                            )}

                            {isCapturing && showCamera && (
                                <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[2px] flex items-center justify-center">
                                    <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {showCamera && (
                    <div className="flex gap-2 w-full mb-2">
                        {capturedDescriptors.length > 0 && (
                            <button
                                type="button"
                                onClick={handleResetCaptures}
                                className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                                title="Reiniciar capturas"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCapture}
                            disabled={isCapturing || !modelsLoaded}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                        >
                            <Camera className="w-4 h-4" />
                            {isCapturing ? 'Analizando...' : capturedDescriptors.length > 0 ? `Captura ${capturedDescriptors.length + 1}ª` : 'Capturar Rostro'}
                        </button>
                    </div>
                )}

                {showCamera && (
                    <label className="w-full px-6 py-3 bg-white border border-gray-200 text-slate-500 hover:bg-slate-50 font-black text-[9px] uppercase rounded-xl tracking-widest cursor-pointer flex justify-center items-center gap-2">
                        <Upload className="w-3 h-3" /> Subir Foto Local
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                )}

                {/* Biometric Status */}
                <div className="mt-4 w-full bg-slate-50 rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${capturedDescriptors.length >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-wider ${capturedDescriptors.length >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                            {capturedDescriptors.length >= 3 ? 'Perfil Biométrico Completo' : capturedDescriptors.length > 0 ? 'Perfil Parcial' : 'Sin Biometría'}
                        </p>
                        <p className="text-[8px] text-slate-400 font-medium">
                            Se recomiendan al menos 3 muestras
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: React.ElementType;
    label: string;
}

const InputField = ({ icon: Icon, label, ...props }: InputFieldProps) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            <Icon className="w-3 h-3" />
            {label}
        </label>
        <input
            {...props}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
        />
    </div>
);
