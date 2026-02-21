export interface BrandingConfig {
    appTitle: string;
    appSubtitle: string;
    clientName: string;
    logoUrl: string;
    primaryColor: string;
    welcomeMessage: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
    appTitle: 'BioCloud Kiosk',
    appSubtitle: 'Sistema de Identificación Biométrica',
    clientName: 'BioCloud',
    logoUrl: '/logo.png', // Fallback to a generic logo if file missing
    primaryColor: '#2563eb', // Blue 600
    welcomeMessage: '¡Bienvenido! Posicione su rostro frente a la cámara.'
};

export class BrandingService {
    private config: BrandingConfig = DEFAULT_BRANDING;

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const saved = localStorage.getItem('brandingConfig');
        if (saved) {
            try {
                this.config = { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
            } catch (e) {
                console.error('[Branding] Error loading config:', e);
            }
        }
    }

    public getConfig(): BrandingConfig {
        return this.config;
    }

    public updateConfig(newConfig: Partial<BrandingConfig>) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem('brandingConfig', JSON.stringify(this.config));
        // Force update if needed? Usually React will handle via context if we used it, 
        // but for now simple service is fine.
    }

    public resetToDefaults() {
        this.config = DEFAULT_BRANDING;
        localStorage.removeItem('brandingConfig');
    }
}

export const brandingService = new BrandingService();
