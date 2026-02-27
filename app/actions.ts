"use server";

import { getAccounts as repoGetAccounts, createAccount as repoCreateAccount, updateAccount as repoUpdateAccount, saveCalendarEvent, getCalendarEventsForMonth, getContentTemplates, getSettings, updateSetting, getDailyAnalytics, resetDatabase } from "@/lib/repository";
import { Account } from "@/types";
import { revalidatePath } from "next/cache";
import { generateMonthlyCalendar, getTodaysBatch, getMonthBatches } from "@/lib/rotation-engine";
import { generateContent } from "@/lib/content-generator";
import { generateAndStoreSeasonalPests } from "@/lib/seasonal-service";
import { generateContentTemplates } from "@/lib/ai-generators";
import { createContentTemplate, clearContentTemplates, saveBatchContent, getSavedBatchContent } from "@/lib/repository";
import { Month } from "@/lib/seasonal-engine";

export async function fetchAccounts() {
    return repoGetAccounts();
}

export async function generateAllMonthlyPlans(month: Month, year: number) {
    const accounts = repoGetAccounts();
    const events = await generateMonthlyCalendar(accounts, month, year);

    // Save all generated events
    for (const event of events) {
        saveCalendarEvent(event);
    }

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true, count: events.length };
}

export async function addAccount(account: Omit<Account, 'currentMonthPosts' | 'status' | 'id'> & { status?: string }) {
    // Generate ID if not provided (simple random string for now or UUID)
    const id = Math.random().toString(36).substring(2, 9);

    repoCreateAccount({
        ...account,
        id
    });

    revalidatePath('/accounts');
    return { success: true };
}

export async function saveAccount(account: Account) {
    repoUpdateAccount(account);
    revalidatePath('/accounts');
    return { success: true };
}

export async function fetchCalendarEvents(month: Month, year: number) {
    // 1. Get Accounts
    const accounts = repoGetAccounts();
    const dbAccounts = accounts.map(a => ({
        ...a,
        // Ensure all required fields for rotation engine are present
        // The rotation engine expects Account implementation which matches our DB schema mostly
    }));

    // 2. Check for existence (Naive check: do we have ANY posts for this month?)
    // For proper check we'd query by date range. 
    // Let's just fetch all posts and filter in memory for now (MVP optimization later)
    const allPosts = getCalendarEventsForMonth('', '');

    // Filter for this month/year
    const monthIndex = getMonthIndex(month);
    const filtered = allPosts.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
    });

    if (filtered.length === 0 && accounts.length > 0) {
        console.log("Generating new events for", month, year);
        // Generate new events
        const newEvents = await generateMonthlyCalendar(dbAccounts, month, year);

        // Save to DB
        for (const event of newEvents) {
            saveCalendarEvent(event);
        }

        return newEvents;
    }

    // We need to attach account names manually because repo.getCalendarEventsForMonth might not join
    // But wait, repository's getCalendarEventsWithAccounts would be better.
    // Let's assume for now we just return what we have, but we need accountName.

    // Re-map with account names
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    return filtered.map(e => ({
        ...e,
        accountName: accountMap.get(e.accountId) || 'Unknown Account'
    }));
}

function getMonthIndex(month: Month): number {
    const months: Month[] = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
}

export async function fetchCalendarBatches(month: Month, year: number) {
    const accounts = repoGetAccounts();
    return getMonthBatches(accounts, month, year);
}

export async function generateBatchContent(
    profiles: { accountId: string; accountName: string; accountLocation: string; suggestedPest: string; tone: string; slot: number }[],
    date: Date
) {
    const results: { accountId: string; title: string; hook: string; caption: string; canvaInstruction: string; tone: string }[] = [];
    for (const p of profiles) {
        const tone = (p.tone || 'Educational') as 'Educational' | 'Urgent' | 'Promotional' | 'Myth-busting';
        const content = await generateContent(p.suggestedPest, tone, p.accountLocation, p.accountName);
        saveBatchContent(p.accountId, date, {
            title: content.title,
            hook: content.hook,
            caption: content.caption,
            canvaInstruction: content.canvaInstruction
        }, p.suggestedPest, tone, p.slot);
        results.push({
            accountId: p.accountId,
            title: content.title,
            hook: content.hook,
            caption: content.caption,
            canvaInstruction: content.canvaInstruction,
            tone
        });
    }
    return results;
}

export async function fetchSavedBatchContent(accountIds: string[], date: Date) {
    return getSavedBatchContent(accountIds, date);
}

export async function fetchTodaysBatch() {
    const accounts = repoGetAccounts();
    return getTodaysBatch(accounts);
}

export async function fetchDashboardStats() {
    const accounts = repoGetAccounts();
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();

    // Get all posts for calculation (optimization: add db count methods later)
    const allPosts = getCalendarEventsForMonth('', '');

    const currentMonthPosts = allPosts.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
    });

    const totalAccounts = accounts.length;
    const postsGenerated = currentMonthPosts.length;
    const scheduled = currentMonthPosts.filter(p => p.status === 'Scheduled').length;

    // Calculate remaining based on targets
    let totalTarget = 0;
    accounts.forEach(a => totalTarget += a.monthlyPostTarget);

    const remaining = Math.max(0, totalTarget - postsGenerated);

    return {
        totalAccounts,
        postsGenerated,
        scheduled,
        remaining
    };
}

export async function generateSeasonalDataForMonth(month: Month, climate: string) {
    const pests = await generateAndStoreSeasonalPests(month, climate as 'Temperate' | 'Tropical' | 'Dry');
    revalidatePath('/');
    return { success: true, count: pests.length };
}

export async function generateContentBankTemplates(replaceExisting: boolean = true) {
    const templates = await generateContentTemplates(8);
    if (replaceExisting) {
        clearContentTemplates();
    }
    for (const t of templates) {
        createContentTemplate({
            title: t.title,
            pest: t.pest,
            tone: t.tone,
            preview: t.preview,
            tags: t.tags
        });
    }
    revalidatePath('/content');
    return { success: true, count: templates.length };
}

export async function fetchContentTemplates() {
    return getContentTemplates();
}

export async function fetchSettings() {
    return getSettings();
}

export async function saveSetting(key: string, value: string) {
    updateSetting(key, value);
    revalidatePath('/settings');
    return { success: true };
}

export async function fetchAnalytics() {
    return getDailyAnalytics(30);
}

export async function resetData() {
    resetDatabase();
    revalidatePath('/');
    revalidatePath('/accounts');
    revalidatePath('/calendar');
    revalidatePath('/content');
    revalidatePath('/analytics');
    revalidatePath('/settings');
    return { success: true };
}
