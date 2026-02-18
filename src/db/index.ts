import Dexie, { type Table } from 'dexie';

export interface User {
    id?: number;
    name: string;
    dni: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    pin?: string;
    hasFingerprint?: boolean;
    faceDescriptors: Float32Array[]; // Array to support multiple angles/conditions
    photos: string[]; // Array of reference photos
    falsePositives?: number; // Counter for false positive detections
    createdAt: number;
}

export interface Attendance {
    id?: number;
    userId: number;
    userName: string;
    userDni?: string;
    userPhone?: string;
    type: 'Entrada' | 'Salida' | 'Entrada Descanso' | 'Salida Descanso' | 'Falta';
    typeId: number; // 1: Entrada, 2: Salida, 3: Salida Descanso, 4: Entrada Descanso, 5: Falta
    timestamp: number;
    photo?: string;
    synced: boolean;
    notes?: string; // For manual entries or absence reasons
    modifiedAt?: number; // Timestamp when manually edited
    modifiedBy?: string; // Who modified it
    observation?: string; // Admin observation on modification
}

export interface UnknownFace {
    id?: number;
    timestamp: number;
    photo?: string;
    synced: boolean;
}

export class KioskDatabase extends Dexie {
    users!: Table<User>;
    attendance!: Table<Attendance>;
    unknownFaces!: Table<UnknownFace>;

    constructor() {
        super('KioskDB');
        this.version(5).stores({ // Increased version
            users: '++id, &dni, name, email',
            attendance: '++id, userId, type, typeId, timestamp, synced, userDni',
            unknownFaces: '++id, timestamp, synced'
        });
    }
}

export const db = new KioskDatabase();
