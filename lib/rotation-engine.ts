import { Account } from "@/types";
import { getPriorityPests } from "./seasonal-service";
import { Month, Climate, determineClimate } from "./seasonal-engine";
import { generateContent, Tone } from "./content-generator";

/** 4 tones, 2 posts per tone = 8 posts per profile per month */
const TONES: Tone[] = ['Educational', 'Urgent', 'Promotional', 'Myth-busting'];
const POSTS_PER_PROFILE = 8;

export interface TodayBatchProfile {
    account: Account;
    county: string;
    suggestedPest: string;
    pestReason: string;
    tone: Tone;
    slot: number; // 0-7, used for event ID
    postId?: string;
    isPosted?: boolean;
}

/** Returns day-of-month numbers for Mon–Sat only (Sundays excluded). */
function getWorkingDaysInMonth(year: number, month: number): number[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() !== 0) result.push(d);
    }
    return result;
}

/** Get the day (1-based) for a profile's slot in a given month. Uses round-robin across Mon–Sat only. */
function getDayForSlot(accountIndex: number, slotIndex: number, year: number, month: number): number {
    const workingDays = getWorkingDaysInMonth(year, month);
    const globalSlot = accountIndex * POSTS_PER_PROFILE + slotIndex;
    return workingDays[globalSlot % workingDays.length];
}

/** Get the slot index (0-7) for a profile on a given day, or -1 if profile has no post that day. */
function getSlotForDay(accountIndex: number, day: number, year: number, month: number): number {
    const workingDays = getWorkingDaysInMonth(year, month);
    if (!workingDays.includes(day)) return -1;
    for (let s = 0; s < POSTS_PER_PROFILE; s++) {
        if (getDayForSlot(accountIndex, s, year, month) === day) return s;
    }
    return -1;
}

/** Returns the batch for any given date. Each profile gets 8 posts/month (2 per tone), spread across days. */
export function getBatchForDate(accounts: Account[], date: Date): TodayBatchProfile[] {
    const activeAccounts = accounts.filter(a => a.status === 'active');
    if (activeAccounts.length === 0) return [];

    const orderedProfiles = [...activeAccounts].sort((a, b) => a.id.localeCompare(b.id));
    const month = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()] as Month;
    const day = date.getDate();
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const result: TodayBatchProfile[] = [];

    for (let i = 0; i < orderedProfiles.length; i++) {
        const slot = getSlotForDay(i, day, year, monthIndex);
        if (slot < 0) continue;

        const account = orderedProfiles[i];
        const county = String(account.group);
        const climate = determineClimate(account.location);
        const pests = getPriorityPests(month, climate);
        const pest = pests.length > 0 ? pests[(account.id.length + slot) % pests.length] : { pest: 'General Pests', reason: 'Routine' };
        const tone = TONES[Math.floor(slot / 2)];

        result.push({
            account,
            county,
            suggestedPest: pest.pest,
            pestReason: pest.reason,
            tone,
            slot
        });
    }

    return result;
}

/** Returns the subset of profiles to work on today. Uses county-based rotation. */
export function getTodaysBatch(accounts: Account[]): TodayBatchProfile[] {
    return getBatchForDate(accounts, new Date());
}

/** Batch summary for calendar display - one per day. */
export interface CalendarBatch {
    date: Date;
    counties: string[];
    profiles: TodayBatchProfile[];
}

/** Returns batch schedule for a month. No DB, no content gen - pure schedule. Mon–Sat only. */
export function getMonthBatches(accounts: Account[], month: Month, year: number): CalendarBatch[] {
    const batches: CalendarBatch[] = [];
    const monthIndex = getMonthIndex(month);
    const workingDays = getWorkingDaysInMonth(year, monthIndex);

    for (const day of workingDays) {
        const date = new Date(year, monthIndex, day);
        const profiles = getBatchForDate(accounts, date);
        const counties = [...new Set(profiles.map(p => p.county))];
        batches.push({ date, counties, profiles });
    }

    return batches;
}

function getMonthIndex(month: Month): number {
    const months: Month[] = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
}

export interface CalendarEvent {
    id: string;
    date: Date;
    accountId: string;
    accountName: string;
    pest: string;
    tone?: Tone;
    title: string;
    caption: string;
    canvaInstruction?: string;
    status: 'Draft' | 'Scheduled' | 'Posted';
}

/** Generate 8 posts per account per month (2 per tone × 4 tones). */
export async function generateMonthlyCalendar(
    accounts: Account[],
    month: Month,
    year: number
): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const monthIndex = getMonthIndex(month);
    const orderedAccounts = [...accounts].sort((a, b) => a.id.localeCompare(b.id));

    for (let accountIndex = 0; accountIndex < orderedAccounts.length; accountIndex++) {
        const account = orderedAccounts[accountIndex];
        if (account.currentMonthPosts >= account.monthlyPostTarget) continue;

        const climate = determineClimate(account.location);
        const accountPests = getPriorityPests(month, climate);
        if (accountPests.length === 0) continue;

        for (let slot = 0; slot < POSTS_PER_PROFILE; slot++) {
            const day = getDayForSlot(accountIndex, slot, year, monthIndex);
            const date = new Date(year, monthIndex, day);
            const pest = accountPests[(account.id.length + slot) % accountPests.length] || { pest: 'General Pests', reason: 'Routine' };
            const tone = TONES[Math.floor(slot / 2)];

            const content = await generateContent(pest.pest, tone, account.location, account.name);

            events.push({
                id: `${account.id}-${day}-${slot}`,
                date,
                accountId: account.id,
                accountName: account.name,
                pest: pest.pest,
                tone,
                title: content.title,
                caption: content.caption,
                canvaInstruction: content.canvaInstruction,
                status: 'Draft'
            });
        }
    }

    return events;
}
