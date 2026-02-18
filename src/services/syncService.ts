import { db, type Attendance, type User } from '../db';

interface SyncConfig {
    serverUrl: string;
    apiKey: string;
    enabled: boolean;
}

class SyncService {
    private config: SyncConfig = {
        serverUrl: 'http://localhost:3001', // Default to our new server
        apiKey: '',
        enabled: false
    };

    private syncInterval: number | null = null;

    async init() {
        const savedConfig = localStorage.getItem('syncConfig');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
        }

        if (this.config.enabled && this.config.serverUrl) {
            this.startAutoSync();
        }
    }

    updateConfig(config: Partial<SyncConfig>) {
        this.config = { ...this.config, ...config };
        localStorage.setItem('syncConfig', JSON.stringify(this.config));

        if (this.config.enabled && this.config.serverUrl) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }
    }

    getConfig(): SyncConfig {
        return { ...this.config };
    }

    private startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Initial sync
        this.fullSync();

        // Sync every 5 minutes
        this.syncInterval = window.setInterval(() => {
            this.fullSync();
        }, 5 * 60 * 1000);
    }

    private stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async fullSync(): Promise<{ success: boolean; downloaded: number; uploaded: number }> {
        const recordsRes = await this.syncPendingRecords();
        const employeesRes = await this.syncEmployees();
        await this.heartBeat();

        return {
            success: recordsRes.success && employeesRes.success,
            downloaded: employeesRes.downloaded,
            uploaded: employeesRes.uploaded + recordsRes.synced
        };
    }

    async heartBeat() {
        if (!this.config.serverUrl) return;
        try {
            await fetch(`${this.config.serverUrl}/api/devices/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kioskId: this.getKioskId(),
                    name: `Terminal ${this.getKioskId().split('-').pop()}`
                })
            });
        } catch (e) {
            console.error('[Sync] Heartbeat failed:', e);
        }
    }

    async checkDeviceStatus(): Promise<'approved' | 'pending' | 'blocked' | 'unregistered'> {
        if (!this.config.serverUrl) return 'approved';
        try {
            const res = await fetch(`${this.config.serverUrl}/api/devices/check/${this.getKioskId()}`);
            const data = await res.json();
            return data.status;
        } catch (e) {
            return 'approved';
        }
    }

    async getDevices() {
        if (!this.config.serverUrl) return [];
        try {
            const res = await fetch(`${this.config.serverUrl}/api/devices`);
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    async updateDeviceStatus(id: number, status: string) {
        if (!this.config.serverUrl) return;
        await fetch(`${this.config.serverUrl}/api/devices/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
    }

    async manualSync(): Promise<{ success: boolean; synced: number; errors: number }> {
        return await this.syncPendingRecords();
    }

    /**
     * SYNC EMPLOYEES: Download from server + Upload new local ones
     */
    async syncEmployees(): Promise<{ success: boolean; downloaded: number; uploaded: number }> {
        if (!this.config.enabled || !this.config.serverUrl) return { success: false, downloaded: 0, uploaded: 0 };

        try {
            // 1. DOWNLOAD FROM SERVER
            const response = await fetch(`${this.config.serverUrl}/api/employees`, {
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            });

            let downloadedCount = 0;
            if (response.ok) {
                const cloudEmployees = await response.json();
                for (const emp of cloudEmployees) {
                    const localEmp = await db.users.where('dni').equals(emp.dni).first();

                    // Parse descriptors from cloud (they come as plain objects/arrays)
                    let cloudDescriptorsRaw = typeof emp.face_descriptors === 'string' ? JSON.parse(emp.face_descriptors) : emp.face_descriptors;

                    // HYDRATION: Convert numeric-indexed objects or plain arrays to Float32Array
                    let hydratedDescriptors: Float32Array[] = [];
                    if (Array.isArray(cloudDescriptorsRaw)) {
                        hydratedDescriptors = cloudDescriptorsRaw.map((d: any) => {
                            if (d instanceof Float32Array) return d;
                            // Convert from array or numeric-keyed object
                            const values = Array.isArray(d) ? d : Object.values(d);
                            return new Float32Array(values as number[]);
                        });
                    }

                    // Check if update is needed
                    const localDescriptorsStr = localEmp ? JSON.stringify(localEmp.faceDescriptors) : null;
                    const cloudDescriptorsStr = JSON.stringify(hydratedDescriptors);

                    if (!localEmp || localDescriptorsStr !== cloudDescriptorsStr) {
                        await db.users.put({
                            id: localEmp?.id,
                            name: emp.name,
                            dni: emp.dni,
                            email: emp.email,
                            phone: emp.phone,
                            whatsapp: emp.whatsapp,
                            pin: emp.pin,
                            faceDescriptors: hydratedDescriptors,
                            photos: emp.photos || [],
                            falsePositives: emp.false_positives || 0,
                            createdAt: emp.created_at || Date.now()
                        });
                        downloadedCount++;
                    }
                }
                console.log(`[Sync] Downloaded/Updated ${downloadedCount} employees from cloud`);
            }

            // 2. UPLOAD LOCAL CHANGES
            const localUsers = await db.users.toArray();
            let uploadedCount = 0;
            for (const user of localUsers) {
                const descriptorsToUpload = user.faceDescriptors.map(d => Array.from(d));

                const upRes = await fetch(`${this.config.serverUrl}/api/employees`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify({
                        name: user.name,
                        dni: user.dni,
                        email: user.email,
                        phone: user.phone,
                        whatsapp: user.whatsapp,
                        pin: user.pin,
                        face_descriptors: descriptorsToUpload,
                        photos: user.photos
                    })
                });
                if (upRes.ok) uploadedCount++;
            }

            return { success: true, downloaded: downloadedCount, uploaded: uploadedCount };
        } catch (err) {
            console.error('[Sync] Employee sync error:', err);
            return { success: false, downloaded: 0, uploaded: 0 };
        }
    }

    /**
     * SYNC ATTENDANCE RECODS
     */
    private async syncPendingRecords(): Promise<{ success: boolean; synced: number; errors: number }> {
        if (!this.config.enabled || !this.config.serverUrl) return { success: false, synced: 0, errors: 0 };

        try {
            const pendingRecords = await db.attendance
                .filter((record: Attendance) => !record.synced)
                .toArray();

            if (pendingRecords.length === 0) return { success: true, synced: 0, errors: 0 };

            let synced = 0;
            let errors = 0;

            for (const record of pendingRecords) {
                try {
                    const response = await fetch(`${this.config.serverUrl}/api/attendance`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.config.apiKey}`
                        },
                        body: JSON.stringify({
                            userId: record.userId,
                            userName: record.userName,
                            userDni: record.userDni,
                            type: record.type,
                            type_id: record.typeId,
                            timestamp: record.timestamp,
                            photo: record.photo,
                            notes: record.notes,
                            kioskId: this.getKioskId()
                        })
                    });

                    if (response.ok) {
                        await db.attendance.update(record.id!, { synced: true });
                        synced++;
                    } else {
                        errors++;
                    }
                } catch (error) {
                    errors++;
                }
            }

            return { success: errors === 0, synced, errors };
        } catch (error) {
            return { success: false, synced: 0, errors: 1 };
        }
    }

    private getKioskId(): string {
        let kioskId = localStorage.getItem('kioskId');
        if (!kioskId) {
            kioskId = `kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('kioskId', kioskId);
        }
        return kioskId;
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.config.serverUrl) return { success: false, message: 'No server URL configured' };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            const response = await fetch(`${this.config.serverUrl}/api/health`, {
                signal: controller.signal,
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            });
            clearTimeout(timeoutId);

            if (response.ok) return { success: true, message: 'Enlace establecido con el servidor' };
            if (response.status === 401) return { success: false, message: 'Error 401: Clave (Secret) incorrecta' };
            return { success: false, message: `Error del servidor: ${response.status}` };
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') return { success: false, message: 'Tiempo de espera agotado (Timeout)' };
            return { success: false, message: `No se pudo encontrar el servidor: ${error.message}` };
        }
    }
}

export const syncService = new SyncService();
