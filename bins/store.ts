import { BinEntry } from './types';

const BINS_KEY = 'savedBinsHistory';
let state: BinEntry[] = [];
let listeners: Array<() => void> = [];

const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
};

const publish = () => {
    listeners.forEach(listener => listener());
};

const saveState = () => {
    try {
        localStorage.setItem(BINS_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Could not save bins to localStorage", e);
    }
    publish();
};

const loadState = () => {
    try {
        const storedBins = localStorage.getItem(BINS_KEY);
        if (storedBins) {
            // Migration for older data that doesn't have a status
            const parsed = JSON.parse(storedBins) as BinEntry[];
            state = parsed.map(bin => ({
                ...bin,
                status: bin.status || 'active'
            }));
        }
    } catch (e) {
        console.error("Could not load bins from localStorage", e);
        state = [];
    }
    publish();
};

const getBins = (): BinEntry[] => {
    return [...state].filter(b => b.status === 'active');
};

const getTrashedBins = (): BinEntry[] => {
    return [...state].filter(b => b.status === 'trashed');
};

const addBin = (name: string, bin: string): { success: boolean, message?: string } => {
    if (!name.trim() || !bin.trim()) {
        return { success: false, message: 'El nombre y el BIN son obligatorios.' };
    }
    if (state.some(entry => entry.bin === bin && entry.status === 'active')) {
        return { success: false, message: 'Este BIN ya existe en la lista.' };
    }

    const now = new Date().toISOString();
    const newBin: BinEntry = {
        id: `${Date.now()}-${Math.random()}`,
        name: name.trim(),
        bin: bin.trim(),
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        status: 'active',
    };

    state.unshift(newBin);
    saveState();
    return { success: true };
};

const updateBin = (id: string, name: string, bin: string): { success: boolean, message?: string } => {
    if (!name.trim() || !bin.trim()) {
        return { success: false, message: 'El nombre y el BIN son obligatorios.' };
    }
    const entry = state.find(e => e.id === id);
    if (!entry) {
        return { success: false, message: 'No se encontró la entrada.' };
    }
    // Check for duplicates, excluding the current entry
    if (state.some(e => e.bin === bin && e.id !== id && e.status === 'active')) {
        return { success: false, message: 'Este BIN ya existe en el historial.' };
    }

    entry.name = name.trim();
    entry.bin = bin.trim();
    entry.updatedAt = new Date().toISOString();
    saveState();
    return { success: true };
};

const trashBin = (id: string) => {
    const entry = state.find(e => e.id === id);
    if (entry) {
        entry.status = 'trashed';
        entry.trashedAt = new Date().toISOString();
        entry.updatedAt = new Date().toISOString();
        saveState();
    }
};

const restoreBin = (id: string) => {
    const entry = state.find(e => e.id === id);
    if (entry) {
        entry.status = 'active';
        delete entry.trashedAt;
        entry.updatedAt = new Date().toISOString();
        saveState();
    }
};

const permanentlyDeleteBin = (id: string) => {
    state = state.filter(e => e.id !== id);
    saveState();
};

const toggleFavorite = (id: string) => {
    const entry = state.find(e => e.id === id);
    if (entry) {
        entry.isFavorite = !entry.isFavorite;
        entry.updatedAt = new Date().toISOString();
        saveState();
    }
};

loadState();

export {
    subscribe,
    getBins,
    getTrashedBins,
    addBin,
    updateBin,
    trashBin,
    restoreBin,
    permanentlyDeleteBin,
    toggleFavorite,
};