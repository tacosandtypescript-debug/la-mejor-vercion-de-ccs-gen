import { HistoryEntry, GeneratePayload, SimilarityPayload, PossibilitiesPayload } from '../history/types';
import { removeEntry } from '../history/store';
import { BinEntry } from '../bins/types';

function formatRelativeTime(isoDate: string): string {
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

function getBinFromHistoryEntry(entry: HistoryEntry): string {
    switch (entry.type) {
        case 'generate':
            return (entry.payload as GeneratePayload).bin;
        case 'similarity':
            return (entry.payload as SimilarityPayload).result;
        case 'possibilities':
            return (entry.payload as PossibilitiesPayload).card.split('|')[0];
        default:
            return '';
    }
}

function handleDelete(item: HTMLLIElement, entryId: string) {
    if (item.classList.contains('removing')) return;
    
    item.classList.add('removing');
    
    // Let the animation finish before removing from store & re-rendering
    setTimeout(() => {
        removeEntry(entryId);
    }, 300);
}


function createHistoryItemElement(
    entry: HistoryEntry,
    applyCallback: (entry: HistoryEntry) => void,
    savedBins: BinEntry[]
): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'history-item';
    
    const binToSave = getBinFromHistoryEntry(entry);
    const existingSavedBin = savedBins.find(b => b.bin === binToSave);
    const isFavorite = !!existingSavedBin;

    if (isFavorite) {
        item.classList.add('favorite');
    }
    item.dataset.id = entry.id;

    const sanitizedTitle = entry.title.replace(/"/g, '&quot;');
    const relativeTime = formatRelativeTime(entry.createdAt);

    item.innerHTML = `
        <div class="history-item-content">
            <span class="history-item-bin" title="${sanitizedTitle}">${entry.title}</span>
            <span class="history-item-subtitle">${entry.subtitle} &middot; ${relativeTime}</span>
        </div>
        <div class="history-item-actions">
            <button class="favorite-btn" aria-label="${isFavorite ? 'Editar en Bins Guardados' : 'Guardar en Bins'}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </button>
            <button class="btn-icon delete-btn" aria-label="Eliminar del historial">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.71l.5 5a.75.75 0 1 1-1.474.14l-.5-5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.5 5a.75.75 0 1 1-1.474-.14l.5-5a.75.75 0 0 1 .762-.647Z" clip-rule="evenodd" /></svg>
            </button>
        </div>
    `;

    item.querySelector('.history-item-content')?.addEventListener('click', () => applyCallback(entry));
    
    const favoriteBtn = item.querySelector('.favorite-btn');
    favoriteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((window as any).promptToSaveBin) {
            (window as any).promptToSaveBin(entry);
        }
    });
    
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(item, entry.id);
    });

    return item;
}

export function renderHistoryList(
    listElement: HTMLUListElement,
    entries: HistoryEntry[],
    applyCallback: (entry: HistoryEntry) => void,
    savedBins: BinEntry[]
) {
    const parent = listElement.parentElement;
    if (!parent) return;

    const emptyState = parent.querySelector('.history-empty-state') as HTMLElement;
    const clearButton = parent.parentElement?.querySelector('#clear-history-btn') as HTMLElement;
    
    listElement.innerHTML = '';
    const hasHistory = entries.length > 0;

    if (emptyState) emptyState.classList.toggle('hidden', !hasHistory);
    listElement.classList.toggle('hidden', !hasHistory);
    if (clearButton) clearButton.classList.toggle('hidden', !hasHistory);

    if (hasHistory) {
        const fragment = document.createDocumentFragment();
        entries.forEach(entry => {
            fragment.appendChild(createHistoryItemElement(entry, applyCallback, savedBins));
        });
        listElement.appendChild(fragment);
    }
}