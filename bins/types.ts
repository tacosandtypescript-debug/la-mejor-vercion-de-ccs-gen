export interface BinEntry {
    id: string;
    name: string;
    bin: string;
    isFavorite: boolean;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    status: 'active' | 'trashed';
    trashedAt?: string; // ISO string
}
