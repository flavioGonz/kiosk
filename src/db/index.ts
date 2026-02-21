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
    sector?: string; // Department or area the employee belongs to

    // Multi-tenant & permissions
    tenantId?: string;
    role?: 'user' | 'manager' | 'admin' | 'superadmin';
    assignedKiosks?: string[]; // Array of kiosk_ids this user is allowed to use. Empty = all.

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
    kioskId?: string; // ID of the terminal that registered the event
    modifiedAt?: number; // Timestamp when manually edited
    modifiedBy?: string; // Who modified it
    observation?: string; // Admin observation on modification
}

export interface UnknownFace {
    id?: number;
    timestamp: number;
    photo?: string;
    kioskId?: string;
    synced: boolean;
}

export interface Shift {
    id?: number;
    name: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    days: number[]; // 0-6 (Sunday-Saturday)
    active: boolean;
    sector?: string; // Optional sector assignment
}

export class KioskDatabase extends Dexie {
    users!: Table<User>;
    attendance!: Table<Attendance>;
    unknownFaces!: Table<UnknownFace>;
    shifts!: Table<Shift>;

    constructor() {
        super('KioskDB');
        this.version(9).stores({ // Increased version to 9
            users: '++id, &dni, name, email, sector, tenantId, role',
            attendance: '++id, userId, type, typeId, timestamp, synced, userDni, kioskId',
            unknownFaces: '++id, timestamp, synced, kioskId',
            shifts: '++id, name, active, sector'
        });
    }
}

export const db = new KioskDatabase();
