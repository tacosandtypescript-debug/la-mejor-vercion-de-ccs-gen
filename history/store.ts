import { HistoryEntry, HistoryPayload, HistoryType } from './types';

const HISTORY_KEY = 'unifiedCardToolHistory';
const MAX_HISTORY_ITEMS = 20;

let state: HistoryEntry[] = [];
let listeners: Array<() => void> = [];

const subscribe = (listener: () => void) => {
    listeners.push(listener);
    // Return an unsubscribe function
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
};

const publish = () => {
    listeners.forEach(listener => listener());
};

const saveState = () => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Could not save history to localStorage", e);
    }
    publish();
};

const loadState = () => {
    try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
            state = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.error("Could not load history from localStorage", e);
        state = [];
    }
    publish();
};

const getState = (): HistoryEntry[] => {
    // Sort by creation date
    return [...state].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

const getTitleAndSubtitle = (type: HistoryType, payload: HistoryPayload): { title: string, subtitle: string } => {
    switch (type) {
        case 'generate': {
            const p = payload as any;
            return {
                title: `${p.bin}|${p.month || 'MM'}|${p.year || 'YYYY'}|${p.cvv || 'CVV'}`,
                subtitle: 'Generador'
            };
        }
        case 'similarity': {
            const p = payload as any;
            return { title: p.result, subtitle: 'Similitud' };
        }
        case 'possibilities': {
            const p = payload as any;
            const card = p.card.split('|')[0];
            return { title: card, subtitle: 'Posibilidades' };
        }
        default:
            return { title: 'Entrada desconocida', subtitle: '' };
    }
};

const addEntry = (type: HistoryType, payload: HistoryPayload) => {
    const { title, subtitle } = getTitleAndSubtitle(type, payload);
    
    // Avoid duplicates by checking title and type
    const existingIndex = state.findIndex(h => h.title === title && h.type === type);
    if (existingIndex > -1) {
        state.splice(existingIndex, 1);
    }

    const newEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        payload,
        createdAt: new Date().toISOString(),
        title,
        subtitle
    };

    state.unshift(newEntry);

    if (state.length > MAX_HISTORY_ITEMS) {
        state = state.slice(0, MAX_HISTORY_ITEMS);
    }

    saveState();
};

const removeEntry = (id: string) => {
    state = state.filter(e => e.id !== id);
    saveState();
};

const clearHistory = () => {
    state = [];
    saveState();
};

// Initial load
loadState();

export {
    addEntry,
    removeEntry,
    clearHistory,
    getState,
    subscribe,
};