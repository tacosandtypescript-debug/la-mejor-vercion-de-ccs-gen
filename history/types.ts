export type HistoryType = 'generate' | 'similarity' | 'possibilities';

export interface GeneratePayload {
    bin: string;
    month: string;
    year: string;
    cvv: string;
    quantity: string;
}

export interface SimilarityPayload {
    card1: string;
    card2: string;
    result: string;
}

export interface PossibilitiesPayload {
    card: string;
    patterns: string;
}

export type HistoryPayload = GeneratePayload | SimilarityPayload | PossibilitiesPayload;

export interface HistoryEntry {
    id: string;
    type: HistoryType;
    createdAt: string; // ISO string
    payload: HistoryPayload;
    // For quick display
    title: string;
    subtitle: string;
}