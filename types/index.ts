export type AccountGroup = string;

export interface Account {
    id: string;
    name: string;
    location: string;
    contactNumber?: string;
    logoUrl?: string; // For now a placeholder color or initials
    brandColor: string;
    group: AccountGroup;
    platform: ('FB' | 'IG' | 'TT')[];
    monthlyPostTarget: number;
    currentMonthPosts: number;
    postedCount?: number; // Number of posts marked as Posted this month
    status: 'active' | 'inactive';
}
