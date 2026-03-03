"use server";

import fs from "node:fs/promises";
import path from "node:path";

import { getAccounts as repoGetAccounts, createAccount as repoCreateAccount, updateAccount as repoUpdateAccount, saveCalendarEvent, getCalendarEventsForMonth, getContentTemplates, getSettings, updateSetting, getDailyAnalytics, resetDatabase, updatePostStatus, getPostStatuses, updatePostImagePath, getPostsWithImagesByAccount, getPostCountsPerAccountForMonth } from "@/lib/repository";
import { Account } from "@/types";
import { revalidatePath } from "next/cache";
import { generateMonthlyCalendar, getTodaysBatch, getMonthBatches, getBatchForDate, type TodayBatchProfile, type CalendarBatch } from "@/lib/rotation-engine";
import { generateContent } from "@/lib/content-generator";
import { generateAndStoreSeasonalPests } from "@/lib/seasonal-service";
import { generateContentTemplates } from "@/lib/ai-generators";
import { createContentTemplate, clearContentTemplates, saveBatchContent, getSavedBatchContent, getRecentPostsForAccount, getPostsForDateWithAccounts } from "@/lib/repository";
import { Month, determineClimate } from "@/lib/seasonal-engine";
import { getPriorityPests } from "@/lib/seasonal-service";

export async function fetchAccounts() {
    return repoGetAccounts();
}

export async function generateAllMonthlyPlans(month: Month, year: number) {
    const accounts = repoGetAccounts();
    const monthIndex = getMonthIndex(month);
    const postsPerAccount = getPostCountsPerAccountForMonth(monthIndex + 1, year);
    const events = await generateMonthlyCalendar(accounts, month, year, {
        getRecentPosts: (accountId) => getRecentPostsForAccount(accountId, 3),
        postsPerAccount
    });

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
        const monthIdx = getMonthIndex(month);
        const postsPerAccount = getPostCountsPerAccountForMonth(monthIdx + 1, year);
        const newEvents = await generateMonthlyCalendar(dbAccounts, month, year, {
            getRecentPosts: (accountId) => getRecentPostsForAccount(accountId, 3),
            postsPerAccount
        });

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

export async function fetchCalendarBatches(month: Month, year: number): Promise<CalendarBatch[]> {
    const accounts = repoGetAccounts();
    const monthIndex = getMonthIndex(month);
    // Count from saved posts (days already generated) so rotation only schedules remaining slots
    const postsPerAccount = getPostCountsPerAccountForMonth(monthIndex + 1, year);
    // Identify days with saved content so rotation assigns only to empty days (avoids same profile on consecutive days)
    const daysWithSavedContent: number[] = [];
    for (let d = 1; d <= 31; d++) {
        if (new Date(year, monthIndex, d).getDay() === 0) continue; // skip Sundays
        const date = new Date(year, monthIndex, d);
        const saved = getPostsForDateWithAccounts(date);
        if (saved.length > 0) daysWithSavedContent.push(d);
    }
    const rotationBatches = getMonthBatches(accounts, month, year, { postsPerAccount, daysWithSavedContent });

    // Merge: preserve already-generated content, use rotation only for days without saved content
    const merged: CalendarBatch[] = [];
    for (const rb of rotationBatches) {
        const date = new Date(rb.date);
        const savedPosts = getPostsForDateWithAccounts(date);

        // Dedupe by account - one post per profile per day (rotation allows max 1 per day)
        const seen = new Set<string>();
        const savedProfiles: TodayBatchProfile[] = savedPosts
            .filter((p) => {
                if (seen.has(p.accountId)) return false;
                seen.add(p.accountId);
                return true;
            })
            .map((p) => ({
                account: p.account,
                county: String(p.account.group),
                suggestedPest: p.pest,
                pestReason: "Previously scheduled",
                tone: (p.tone || "Educational") as "Educational" | "Urgent" | "Promotional" | "Myth-busting",
                slot: p.slot
            }));

        // Merge: Show all saved profiles, plus rotation profiles for accounts that don't have saved content on this day
        const savedAccountIds = new Set(savedProfiles.map((p) => p.account.id));
        const rotationProfilesToInclude = rb.profiles.filter((p) => !savedAccountIds.has(p.account.id));

        const profiles = [...savedProfiles, ...rotationProfilesToInclude];
        const counties = [...new Set(profiles.map((p) => p.county))];

        const day = rb.date.getDate();
        const postIds = profiles.map((p) => `${p.account.id}-${day}-${p.slot}`);
        const statuses = getPostStatuses(postIds);

        const profilesWithStatus = profiles.map((p) => {
            const postId = `${p.account.id}-${day}-${p.slot}`;
            return { ...p, isPosted: statuses[postId] === "Posted" };
        });

        merged.push({ date: rb.date, counties, profiles: profilesWithStatus });
    }

    return merged;
}

export async function generateBatchContent(
    profiles: { accountId: string; accountName: string; accountLocation: string; suggestedPest: string; tone: string; slot: number }[],
    date: Date
) {
    const monthNames: Month[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];

    const results: { accountId: string; postId: string; title: string; hook: string; caption: string; canvaInstruction: string; tone: string }[] = [];
    for (const p of profiles) {
        // Fetch recent content to avoid duplicates and determine rotation
        const recent = getRecentPostsForAccount(p.accountId, 6); // Fetch a few more to be safe
        const usedPests = [...new Set(recent.map(r => r.pest))];
        const usedTones = [...new Set(recent.map(r => r.tone).filter(Boolean) as string[])];
        const recentTitles = recent.map(r => r.title).filter(Boolean);
        const recentCaptions = recent.map(r => r.caption).filter(Boolean);

        const climate = determineClimate(p.accountLocation);
        const availablePests = getPriorityPests(month, climate).map(x => x.pest);

        let pest = p.suggestedPest;
        let tone = p.tone as typeof TONES[number]; // Fallback to provided tone

        // 1. Rotate Pest: Find the last used pest that is in our available list. Pick the next one.
        if (recent.length > 0 && availablePests.length > 0) {
            const lastUsedPest = recent[0].pest;
            const lastIndex = availablePests.indexOf(lastUsedPest);
            if (lastIndex >= 0) {
                pest = availablePests[(lastIndex + 1) % availablePests.length];
            } else {
                pest = availablePests[0]; // Fallback if last used is no longer seasonal
            }
        }

        // 2. Rotate Tone: Find the last used tone, pick the next one.
        const TONES: ('Educational' | 'Urgent' | 'Promotional' | 'Myth-busting')[] = ['Educational', 'Urgent', 'Promotional', 'Myth-busting'];
        if (recent.length > 0) {
            const lastUsedTone = recent.find(r => r.tone)?.tone as typeof TONES[number] | undefined;
            if (lastUsedTone) {
                const lastIdx = TONES.indexOf(lastUsedTone);
                if (lastIdx >= 0) {
                    tone = TONES[(lastIdx + 1) % TONES.length];
                }
            }
        }

        const content = await generateContent(pest, tone, p.accountLocation, p.accountName, {
            avoidContent: {
                pests: usedPests,
                titles: recentTitles,
                captions: recentCaptions,
                tones: usedTones
            }
        });
        saveBatchContent(p.accountId, date, {
            title: content.title,
            hook: content.hook,
            caption: content.caption,
            canvaInstruction: content.canvaInstruction
        }, pest, tone, p.slot);
        const postId = `${p.accountId}-${date.getDate()}-${p.slot}`;
        results.push({
            accountId: p.accountId,
            postId,
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
    const today = new Date();
    const savedPosts = getPostsForDateWithAccounts(today);
    const postsPerAccount = getPostCountsPerAccountForMonth(today.getMonth() + 1, today.getFullYear());
    const rotationProfiles = getTodaysBatch(accounts, { postsPerAccount });

    const savedProfiles: TodayBatchProfile[] = savedPosts.map((p) => ({
        account: p.account,
        county: String(p.account.group),
        suggestedPest: p.pest,
        pestReason: "Previously scheduled",
        tone: (p.tone || "Educational") as "Educational" | "Urgent" | "Promotional" | "Myth-busting",
        slot: p.slot
    }));
    // Merge: Show all saved profiles, plus rotation profiles for accounts that don't have saved content today
    const savedAccountIds = new Set(savedProfiles.map((p) => p.account.id));
    const rotationProfilesToInclude = rotationProfiles.filter((p) => !savedAccountIds.has(p.account.id));

    const profiles = [...savedProfiles, ...rotationProfilesToInclude];

    const day = today.getDate();
    const postIds = profiles.map((p) => `${p.account.id}-${day}-${p.slot}`);
    const statuses = getPostStatuses(postIds);
    return profiles.map((p) => {
        const postId = `${p.account.id}-${day}-${p.slot}`;
        return { ...p, postId, isPosted: statuses[postId] === "Posted" };
    });
}

export async function togglePostPosted(postId: string) {
    const statuses = getPostStatuses([postId]);
    const current = statuses[postId];
    const next = current === "Posted" ? "Draft" : "Posted";
    updatePostStatus(postId, next);
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/accounts");
    return { success: true, status: next };
}

export async function savePostImage(postId: string, imagePath: string) {
    updatePostImagePath(postId, imagePath);
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/progress");
    return { success: true };
}

export async function uploadBatchImage(postId: string, file: File, accountId: string, county: string) {
    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Define path
        const relativePath = `/uploads/${accountId}/${postId}-${Date.now()}.png`;
        const absolutePath = path.join(process.cwd(), "public", relativePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // Write file
        await fs.writeFile(absolutePath, buffer);

        updatePostImagePath(postId, relativePath);
        revalidatePath("/");
        revalidatePath("/calendar");

        return { success: true, path: relativePath };
    } catch (error) {
        console.error("Error uploading image:", error);
        return { success: false, error: "Failed to save image" };
    }
}

export async function fetchPostsWithImagesByAccount() {
    return getPostsWithImagesByAccount();
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
