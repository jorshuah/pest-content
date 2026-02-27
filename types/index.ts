export type AccountGroup = 'A' | 'B' | 'C' | 'D';

export interface Account {
    id: string;
    name: string;
    location: string;
    contactNumber?: string;
    logoUrl?: string; // For now a placeholder color or initials
    brandColor: string;
    group: AccountGroup;
    platform: ('FB' | 'IG' | 'In')[];
    monthlyPostTarget: number;
    currentMonthPosts: number;
    status: 'active' | 'inactive';
}
