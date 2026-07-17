import { BinEntry } from '../bins/types';
import { toggleFavorite, trashBin, restoreBin, permanentlyDeleteBin } from '../bins/store';
import { formatRelativeTime } from '../utils/time';

// This function will be called by the main script to handle "Use in Generator"
let useInGeneratorCallback: (bin: string) => void = () => {};
export const setUseInGeneratorCallback = (callback: (bin: string) => void) => {
    useInGeneratorCallback = callback;
};

// This function will be called to populate the edit form
let editBinCallback: (entry: BinEntry) => void = () => {};
export const setEditBinCallback = (callback: (entry: BinEntry) => void) => {
    editBinCallback = callback;
};


function createBinItemElement(entry: BinEntry): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'bin-item';
    if (entry.isFavorite) {
        item.classList.add('favorite');
    }
    item.dataset.id = entry.id;

    const sanitizedName = entry.name.replace(/"/g, '&quot;');
    const sanitizedBin = entry.bin.replace(/"/g, '&quot;');

    item.innerHTML = `
        <div class="bin-item-info">
            <button class="favorite-btn" aria-label="${entry.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </button>
            <div class="bin-item-details">
                <span class="bin-item-name" title="${sanitizedName}">${entry.name}</span>
                <span class="bin-item-number" title="${sanitizedBin}">${entry.bin}</span>
            </div>
        </div>
        <div class="bin-item-actions">
            <button class="btn-icon use-btn" title="Usar en Generador">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a.75.75 0 0 1-.75-.75V3.107l-2.64 2.64a.75.75 0 0 1-1.06-1.06l4-4a.75.75 0 0 1 1.06 0l4 4a.75.75 0 1 1-1.06 1.06l-2.64-2.64V17.25A.75.75 0 0 1 10 18Z" clip-rule="evenodd" /></svg>
            </button>
            <button class="btn-icon edit-btn" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.25 2.25 0 0 0-3.182-3.182L3.58 13.42a4 4 0 0 0-.886 1.343Z" /></svg>
            </button>
            <button class="btn-icon delete-btn" title="Mover a la papelera">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4.5h8V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4.5h3.75V3.75c0-.966-.784-1.75-1.75-1.75h-2.5c-.966 0-1.75.784-1.75 1.75V4.5H10Zm-3.75 0H5V3.75C5 2.784 5.784 2 6.75 2h2.5V4.5H6.25Z" clip-rule="evenodd" /><path d="M3.5 6A.5.5 0 0 0 3 6.5v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a.5.5 0 0 0-1 0v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a.5.5 0 0 0-.5-.5Z" /><path d="M6.5 7.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6ZM10 7a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6Zm3.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6Z" /></svg>
            </button>
        </div>
    `;

    // Event listeners
    const favoriteBtn = item.querySelector('.favorite-btn');
    favoriteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(entry.id);
    });

    const useBtn = item.querySelector('.use-btn');
    useBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        useInGeneratorCallback(entry.bin);
    });

    const editBtn = item.querySelector('.edit-btn');
    editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        editBinCallback(entry);
    });
    
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        trashBin(entry.id);
    });

    return item;
}

function createTrashedBinItemElement(entry: BinEntry): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'bin-item trashed-bin-item';
    item.dataset.id = entry.id;

    const sanitizedName = entry.name.replace(/"/g, '&quot;');
    const sanitizedBin = entry.bin.replace(/"/g, '&quot;');
    const trashedDate = entry.trashedAt ? `Eliminado ${formatRelativeTime(entry.trashedAt)}` : '';

    item.innerHTML = `
        <div class="bin-item-info">
             <div class="bin-item-details">
                <span class="bin-item-name" title="${sanitizedName}">${entry.name}</span>
                <span class="bin-item-number" title="${sanitizedBin}">${entry.bin}</span>
                <span class="trashed-bin-item-date">${trashedDate}</span>
            </div>
        </div>
        <div class="bin-item-actions">
            <button class="btn-icon restore-btn" title="Restaurar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.224 4.344l-1.422 1.422a.75.75 0 1 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0l.024.024a.75.75 0 0 1 0 1.06l-1.423 1.423a7 7 0 1 0 10.27-5.592.75.75 0 1 1-1.125.974Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M4.5 4.75A.75.75 0 0 1 5.25 4h5.5a.75.75 0 0 1 0 1.5H6.31l3.22 3.22a.75.75 0 1 1-1.06 1.06L5.25 6.56v4.19a.75.75 0 0 1-1.5 0V5.25A.75.75 0 0 1 4.5 4.75Z" clip-rule="evenodd" /></svg>
            </button>
            <button class="btn-icon delete-btn" title="Eliminar Permanentemente">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5Zm6.22 3.22a.75.75 0 0 1 1.06 0L12 10.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L13.06 12l2.72 2.72a.75.75 0 1 1-1.06 1.06L12 13.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L10.94 12 8.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
            </button>
        </div>
    `;

    // Event listeners
    const restoreBtn = item.querySelector('.restore-btn');
    restoreBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreBin(entry.id);
    });
    
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.confirm(`¿Seguro que quieres eliminar "${entry.name}" permanentemente? Esta acción no se puede deshacer.`)) {
            permanentlyDeleteBin(entry.id);
        }
    });

    return item;
}


export function renderBinsList(
    listElement: HTMLUListElement,
    entries: BinEntry[]
) {
    const parent = listElement.parentElement;
    if (!parent) return;

    const emptyState = parent.querySelector('.bins-empty-state') as HTMLElement;
    listElement.innerHTML = '';
    
    const hasEntries = entries.length > 0;
    if (emptyState) emptyState.classList.toggle('hidden', hasEntries);
    listElement.classList.toggle('hidden', !hasEntries);

    if (hasEntries) {
        const fragment = document.createDocumentFragment();
        entries.forEach(entry => {
            fragment.appendChild(createBinItemElement(entry));
        });
        listElement.appendChild(fragment);
    }
}

export function renderTrashedBinsList(
    listElement: HTMLUListElement,
    entries: BinEntry[]
) {
    const parent = listElement.parentElement;
    if (!parent) return;

    const emptyState = parent.querySelector('.bins-empty-state') as HTMLElement;
    listElement.innerHTML = '';

    const hasEntries = entries.length > 0;
    if (emptyState) emptyState.classList.toggle('hidden', hasEntries);
    listElement.classList.toggle('hidden', !hasEntries);

    if (hasEntries) {
        const fragment = document.createDocumentFragment();
        // Sort by trashed date, newest first
        const sortedEntries = [...entries].sort((a, b) => 
            new Date(b.trashedAt!).getTime() - new Date(a.trashedAt!).getTime()
        );
        sortedEntries.forEach(entry => {
            fragment.appendChild(createTrashedBinItemElement(entry));
        });
        listElement.appendChild(fragment);
    }
}