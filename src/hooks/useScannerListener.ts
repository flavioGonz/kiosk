import { useEffect, useRef } from 'react';

export function useScannerListener(onScan: (data: string) => void) {
    const buffer = useRef('');
    const timeout = useRef<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Clear timeout if previous key was recent
            if (timeout.current) window.clearTimeout(timeout.current);

            if (e.key === 'Enter') {
                if (buffer.current.length > 0) {
                    onScan(buffer.current);
                    buffer.current = '';
                }
                return;
            }

            // Append character-only keys
            if (e.key.length === 1) {
                buffer.current += e.key;
            }

            // Reset buffer if no keys for 100ms (stops accidental keyboard typing being caught)
            timeout.current = window.setTimeout(() => {
                buffer.current = '';
            }, 100);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeout.current) window.clearTimeout(timeout.current);
        };
    }, [onScan]);
}
