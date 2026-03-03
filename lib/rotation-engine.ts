import { Account } from "@/types";
import { getPriorityPests } from "./seasonal-service";
import { Month, Climate, determineClimate } from "./seasonal-engine";
import { generateContent, Tone } from "./content-generator";

/** 4 tones, 2 posts per tone - slot indices 0-7 map to tones. Profiles can have different monthly targets. */
const TONES: Tone[] = ['Educational', 'Urgent', 'Promotional', 'Myth-busting'];
const DEFAULT_POSTS_PER_PROFILE = 8;

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

/**
 * Build (profileIndex, slotIndex) pairs for REMAINING slots only.
 * Slot-major order: round 0 has one pair per profile, round 1 has one per profile, etc.
 * Round-robin day assignment then completes all profiles before repeating any.
 */
function buildRemainingSlotPairs(
    orderedProfiles: { id: string; monthlyPostTarget?: number }[],
    postsPerAccount: Record<string, number>
): { profileIndex: number; slotIndex: number }[] {
    const pairs: { profileIndex: number; slotIndex: number }[] = [];
    const maxTarget = Math.max(
        ...orderedProfiles.map((p) => p.monthlyPostTarget ?? DEFAULT_POSTS_PER_PROFILE),
        1
    );
    for (let slot = 0; slot < maxTarget; slot++) {
        for (let i = 0; i < orderedProfiles.length; i++) {
            const target = orderedProfiles[i].monthlyPostTarget ?? DEFAULT_POSTS_PER_PROFILE;
            const used = postsPerAccount[orderedProfiles[i].id] ?? 0;
            if (slot >= used && slot < target) {
                pairs.push({ profileIndex: i, slotIndex: slot });
            }
        }
    }
    return pairs;
}

/**
 * Get the day (1-based) for a (profileIndex, slotIndex) pair.
 * Uses round-robin over remaining slots so each profile gets exactly 8 total.
 */
function getDayForSlotFromPairs(
    pairIndex: number,
    pairs: { profileIndex: number; slotIndex: number }[],
    year: number,
    month: number,
    assignableDays?: number[]
): number {
    const days = assignableDays || getWorkingDaysInMonth(year, month);
    if (days.length === 0 || pairs.length === 0) return -1;
    const dayIndex = Math.floor(pairIndex * days.length / pairs.length);
    return days[Math.min(dayIndex, days.length - 1)];
}

/** Get the slot index for a profile on a given day from the pairs, or -1. */
function getSlotForDayFromPairs(
    profileIndex: number,
    day: number,
    pairs: { profileIndex: number; slotIndex: number }[],
    assignableDays: number[]
): number {
    if (!assignableDays.includes(day) || pairs.length === 0) return -1;
    const dayIndex = assignableDays.indexOf(day);
    const totalPairs = pairs.length;
    const totalDays = assignableDays.length;

    const startIndex = Math.floor(dayIndex * totalPairs / totalDays);
    const endIndex = Math.floor((dayIndex + 1) * totalPairs / totalDays);

    for (let p = startIndex; p < endIndex; p++) {
        if (pairs[p].profileIndex === profileIndex) {
            return pairs[p].slotIndex;
        }
    }
    return -1;
}

/** Options for consumption-aware scheduling (exclude profiles that already hit their monthly target). */
export interface BatchOptions {
    /** Posts per account_id for this month. Profiles at or above their target are excluded. */
    postsPerAccount?: Record<string, number>;
    /** Day-of-month numbers (1–31) that already have saved content. Rotation assigns only to other days. */
    daysWithSavedContent?: number[];
}

/** Returns the batch for any given date. Each profile gets up to monthlyPostTarget posts, spread across days. */
export function getBatchForDate(accounts: Account[], date: Date, options?: BatchOptions): TodayBatchProfile[] {
    const activeAccounts = accounts.filter(a => a.status === 'active');
    if (activeAccounts.length === 0) return [];

    const postsPerAccount = options?.postsPerAccount ?? {};
    const daysWithSaved = new Set(options?.daysWithSavedContent ?? []);
    const allOrdered = [...activeAccounts].sort((a, b) => a.id.localeCompare(b.id));
    const orderedProfiles = allOrdered.filter(
        (a) => (postsPerAccount[a.id] ?? 0) < (a.monthlyPostTarget ?? DEFAULT_POSTS_PER_PROFILE)
    );
    if (orderedProfiles.length === 0) return [];

    const pairs = buildRemainingSlotPairs(orderedProfiles, postsPerAccount);
    const workingDays = getWorkingDaysInMonth(date.getFullYear(), date.getMonth());
    const assignableDays = workingDays.filter((d) => !daysWithSaved.has(d));

    const month = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()] as Month;
    const day = date.getDate();
    const result: TodayBatchProfile[] = [];

    for (let i = 0; i < orderedProfiles.length; i++) {
        const slot = getSlotForDayFromPairs(i, day, pairs, assignableDays);
        if (slot < 0) continue;

        const account = orderedProfiles[i];
        const county = String(account.group);
        const climate = determineClimate(account.location);
        const pests = getPriorityPests(month, climate);
        const pest = pests.length > 0 ? pests[(account.id.length + slot) % pests.length] : { pest: 'General Pests', reason: 'Routine' };
        const tone = TONES[Math.floor((slot % 8) / 2)];

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
export function getTodaysBatch(accounts: Account[], options?: BatchOptions): TodayBatchProfile[] {
    return getBatchForDate(accounts, new Date(), options);
}

/** Batch summary for calendar display - one per day. */
export interface CalendarBatch {
    date: Date;
    counties: string[];
    profiles: TodayBatchProfile[];
}

/** Returns batch schedule for a month. No DB, no content gen - pure schedule. Mon–Sat only. */
export function getMonthBatches(accounts: Account[], month: Month, year: number, options?: BatchOptions): CalendarBatch[] {
    const batches: CalendarBatch[] = [];
    const monthIndex = getMonthIndex(month);
    const workingDays = getWorkingDaysInMonth(year, monthIndex);

    for (const day of workingDays) {
        const date = new Date(year, monthIndex, day);
        const profiles = getBatchForDate(accounts, date, options);
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

/** Optional: fetch recent posts for an account to avoid duplicate content. */
export type GetRecentPostsFn = (accountId: string) => { pest: string; title: string; caption: string; tone: string | null }[];

/** Generate up to monthlyPostTarget posts per account per month. */
export async function generateMonthlyCalendar(
    accounts: Account[],
    month: Month,
    year: number,
    options?: { getRecentPosts?: GetRecentPostsFn; postsPerAccount?: Record<string, number> }
): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const monthIndex = getMonthIndex(month);
    const orderedAccounts = [...accounts].sort((a, b) => a.id.localeCompare(b.id));
    const getRecentPosts = options?.getRecentPosts;
    const postsPerAccount = options?.postsPerAccount ?? {};

    const pairs = buildRemainingSlotPairs(orderedAccounts, postsPerAccount);
    const workingDays = getWorkingDaysInMonth(year, monthIndex);

    for (let accountIndex = 0; accountIndex < orderedAccounts.length; accountIndex++) {
        const account = orderedAccounts[accountIndex];
        const used = postsPerAccount[account.id] ?? 0;
        if (used >= (account.monthlyPostTarget ?? DEFAULT_POSTS_PER_PROFILE)) continue;

        const climate = determineClimate(account.location);
        const accountPests = getPriorityPests(month, climate);
        if (accountPests.length === 0) continue;

        const recent = getRecentPosts?.(account.id) ?? [];
        const usedPests = [...new Set(recent.map(r => r.pest))];
        const usedTones = [...new Set(recent.map(r => r.tone).filter(Boolean) as string[])];
        const recentTitles = recent.map(r => r.title).filter(Boolean);
        const recentCaptions = recent.map(r => r.caption).filter(Boolean);

        const target = account.monthlyPostTarget ?? DEFAULT_POSTS_PER_PROFILE;
        for (let slot = used; slot < target; slot++) {
            const pairIndex = pairs.findIndex(
                (p) => p.profileIndex === accountIndex && p.slotIndex === slot
            );
            if (pairIndex < 0) continue;
            const day = getDayForSlotFromPairs(pairIndex, pairs, year, monthIndex, workingDays);
            const date = new Date(year, monthIndex, day);
            // 1. Rotate Pest: Find the last used pest that is in our available list. Pick the next one.
            let pest = accountPests[0];
            if (usedPests.length > 0 && accountPests.length > 0) {
                const lastUsedPest = usedPests[usedPests.length - 1]; // usedPests has oldest first, so last is most recent. Wait, getRecentPosts is DESC so recent[0] is most recent. 
                // Ah, usedPests is built from recent.map() but recent is ordered DESC, so usedPests[0] is the most recent.
                const mostRecentPest = usedPests[0];
                const lastIndex = accountPests.findIndex(p => p.pest === mostRecentPest);
                if (lastIndex >= 0) {
                    pest = accountPests[(lastIndex + 1) % accountPests.length];
                }
            }

            // If the pest we just picked is STILL in the usedPests list (because the list is small), try to find an unused one.
            if (usedPests.includes(pest.pest)) {
                const unused = accountPests.filter(pp => !usedPests.includes(pp.pest));
                if (unused.length > 0) pest = unused[0];
            }

            // 2. Rotate Tone: Find the last used tone, pick the next one.
            let tone = TONES[0];
            if (usedTones.length > 0) {
                const mostRecentTone = usedTones[0] as Tone;
                const lastIdx = TONES.indexOf(mostRecentTone);
                if (lastIdx >= 0) {
                    tone = TONES[(lastIdx + 1) % TONES.length];
                }
            }

            const content = await generateContent(pest.pest, tone, account.location, account.name, {
                avoidContent: getRecentPosts ? { pests: usedPests, titles: recentTitles, captions: recentCaptions, tones: usedTones } : undefined
            });

            usedPests.push(pest.pest);
            usedTones.push(tone);

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
