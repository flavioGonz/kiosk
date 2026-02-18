import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserX, Trash2, Calendar, Clock } from 'lucide-react';
import { db, type UnknownFace } from '../db';

export function UnknownFaces() {
    const [unknownFaces, setUnknownFaces] = useState<UnknownFace[]>([]);

    useEffect(() => {
        loadUnknownFaces();
    }, []);

    const loadUnknownFaces = async () => {
        const faces = await db.unknownFaces.reverse().sortBy('timestamp');
        setUnknownFaces(faces);
    };

    const deleteUnknownFace = async (id: number) => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            await db.unknownFaces.delete(id);
            loadUnknownFaces();
        }
    };

    const clearAll = async () => {
        if (confirm('¿Estás seguro de eliminar TODOS los rostros no reconocidos?')) {
            await db.unknownFaces.clear();
            loadUnknownFaces();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Rostros No Reconocidos</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {unknownFaces.length} {unknownFaces.length === 1 ? 'registro' : 'registros'}
                    </p>
                </div>
                {unknownFaces.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar Todo
                    </button>
                )}
            </div>

            {/* Grid of Unknown Faces */}
            {unknownFaces.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                    <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No hay rostros no reconocidos registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unknownFaces.map((face, index) => (
                        <motion.div
                            key={face.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Photo */}
                            <div className="aspect-video bg-gray-100 relative">
                                {face.photo ? (
                                    <img
                                        src={face.photo}
                                        alt="Rostro no reconocido"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserX className="w-16 h-16 text-gray-300" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                    No Reconocido
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(face.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{new Date(face.timestamp).toLocaleTimeString()}</span>
                                </div>

                                {!face.synced && (
                                    <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full inline-block">
                                        Pendiente Sync
                                    </div>
                                )}

                                {/* Actions */}
                                <button
                                    onClick={() => deleteUnknownFace(face.id!)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border-2 border-red-200 transition-all active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
