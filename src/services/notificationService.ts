import { syncService } from './syncService';

export const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const subscribeUser = async (dni: string) => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            const config = syncService.getConfig();

            // Ensure we have a clean base URL without trailing slashes or /api suffix
            const baseUrl = config.serverUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

            if (!baseUrl) throw new Error('Servidor no configurado para notificaciones');

            // Get public key from server
            const configRes = await fetch(`${baseUrl}/api/health`);
            const { publicKey } = await configRes.json();

            if (!publicKey) throw new Error('El servidor no ha proporcionado una clave VAPID pública');

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            await fetch(`${baseUrl}/api/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subscription, dni })
            });

            console.log('[Push] Suscripción exitosa para DNI:', dni);
            return true;
        } catch (error) {
            console.error('[Push] Error en suscripción:', error);
            return false;
        }
    }
    return false;
};
