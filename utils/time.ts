export function formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 10) return 'ahora';
    if (minutes < 1) return `hace ${seconds} seg.`;
    if (hours < 1) return `hace ${minutes} min.`;
    if (days < 1) return `hace ${hours} h.`;
    if (days === 1) return `ayer`;
    if (days < 7) return `hace ${days} días`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
