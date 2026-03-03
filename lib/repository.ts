import db, { initDb } from './db';
import { Account, AccountGroup } from '@/types';
import { CalendarEvent } from './rotation-engine';
import type { Tone } from './content-generator';

export interface ContentTemplate {
    id: string;
    title: string;
    pest: string;
    tone: Tone;
    preview: string;
    tags: string[];
}

// Ensure DB is initialized
initDb();

/**
 * Returns post count per account_id for the given month (1–12) and year.
 * Counts from posts table = days already generated. Used for rotation so we only schedule remaining slots.
 */
export function getPostCountsPerAccountForMonth(month: number, year: number): Record<string, number> {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const stmt = db.prepare(`
        SELECT account_id, COUNT(*) as cnt
        FROM posts
        WHERE substr(date, 1, 7) = ?
        GROUP BY account_id
    `);
    const rows = stmt.all(prefix) as { account_id: string; cnt: number }[];
    const result: Record<string, number> = {};
    for (const r of rows) result[r.account_id] = r.cnt;
    return result;
}

/** Returns posted count (status='Posted') per account_id for the given month (1–12) and year. */
export function getPostedCountPerAccountForMonth(month: number, year: number): Record<string, number> {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const stmt = db.prepare(`
        SELECT account_id, COUNT(*) as cnt
        FROM posts
        WHERE substr(date, 1, 7) = ? AND status = 'Posted'
        GROUP BY account_id
    `);
    const rows = stmt.all(prefix) as { account_id: string; cnt: number }[];
    const result: Record<string, number> = {};
    for (const r of rows) result[r.account_id] = r.cnt;
    return result;
}

/** Update a post's status. */
export function updatePostStatus(postId: string, status: 'Draft' | 'Scheduled' | 'Posted') {
    db.prepare('UPDATE posts SET status = ? WHERE id = ?').run(status, postId);
}

/** Update a post's image path. */
export function updatePostImagePath(postId: string, imagePath: string | null) {
    db.prepare('UPDATE posts SET image_path = ? WHERE id = ?').run(imagePath, postId);
}

/** Get status for multiple post IDs. Returns map of postId -> status. */
export function getPostStatuses(postIds: string[]): Record<string, string> {
    if (postIds.length === 0) return {};
    const placeholders = postIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT id, status FROM posts WHERE id IN (${placeholders})`);
    const rows = stmt.all(...postIds) as { id: string; status: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) result[r.id] = r.status;
    return result;
}

export function getAccounts(): Account[] {
    const stmt = db.prepare('SELECT * FROM accounts');
    const rows = stmt.all() as any[];

    const now = new Date();
    const counts = getPostCountsPerAccountForMonth(now.getMonth() + 1, now.getFullYear());
    const postedCounts = getPostedCountPerAccountForMonth(now.getMonth() + 1, now.getFullYear());

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        location: row.location,
        group: row.account_group as AccountGroup,
        platform: JSON.parse(row.platform),
        monthlyPostTarget: row.monthly_post_target,
        currentMonthPosts: counts[row.id] ?? 0,
        postedCount: postedCounts[row.id] ?? 0,
        brandColor: row.brand_color,
        status: row.status as 'active' | 'inactive'
    }));
}

export function createAccount(account: Omit<Account, 'currentMonthPosts' | 'status'> & { status?: string }) {
    const stmt = db.prepare(`
    INSERT INTO accounts (id, name, location, account_group, platform, monthly_post_target, current_month_posts, brand_color, status)
    VALUES (@id, @name, @location, @group, @platform, @monthlyPostTarget, @currentMonthPosts, @brandColor, @status)
  `);

    const info = stmt.run({
        ...account,
        group: account.group,
        platform: JSON.stringify(account.platform),
        currentMonthPosts: 0,
        status: account.status || 'active'
    });

    return info;
}

export function updateAccount(account: Account) {
    const stmt = db.prepare(`
    UPDATE accounts 
    SET name = @name, 
        location = @location, 
        account_group = @group,
        platform = @platform,
        monthly_post_target = @monthlyPostTarget,
        brand_color = @brandColor
    WHERE id = @id
  `);

    return stmt.run({
        ...account,
        group: account.group,
        platform: JSON.stringify(account.platform)
    });
}

// Posts / Events
export function saveBatchContent(accountId: string, date: Date, content: { title: string; hook: string; caption: string; canvaInstruction: string }, pest: string, tone?: string, slot?: number) {
    const day = date.getDate();
    const id = slot !== undefined ? `${accountId}-${day}-${slot}` : `${accountId}-${date.toISOString().split('T')[0]}`;
    const exists = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id);

    if (exists) {
        db.prepare(`
            UPDATE posts SET title = ?, hook = ?, caption = ?, canva_instruction = ?, pest = ?, tone = ?
            WHERE id = ?
        `).run(content.title, content.hook, content.caption, content.canvaInstruction, pest, tone ?? null, id);
    } else {
        db.prepare(`
            INSERT INTO posts (id, account_id, date, pest, title, caption, canva_instruction, status, hook, tone)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?)
        `).run(id, accountId, date.toISOString(), pest, content.title, content.caption, content.canvaInstruction, content.hook, tone ?? null);
    }
}

/** Get posts for a specific date with account info. Used to preserve already-generated content in calendar. */
export function getPostsForDateWithAccounts(date: Date): { accountId: string; slot: number; pest: string; tone: string | null; account: Account }[] {
    const dateStr = date.toISOString().split('T')[0];
    const rows = db.prepare(`
        SELECT p.id, p.account_id, p.pest, p.tone, a.name, a.location, a.account_group, a.platform, a.monthly_post_target, a.brand_color, a.status
        FROM posts p
        JOIN accounts a ON p.account_id = a.id
        WHERE p.date LIKE ?
    `).all(`${dateStr}%`) as { id: string; account_id: string; pest: string; tone: string | null; name: string; location: string; account_group: string; platform: string; monthly_post_target: number; brand_color: string; status: string }[];

    const now = new Date();
    const counts = getPostCountsPerAccountForMonth(now.getMonth() + 1, now.getFullYear());
    const postedCounts = getPostedCountPerAccountForMonth(now.getMonth() + 1, now.getFullYear());

    return rows.map(row => {
        const parts = row.id.split('-');
        const slot = parts.length >= 1 ? parseInt(parts[parts.length - 1], 10) : 0;
        const account: Account = {
            id: row.account_id,
            name: row.name,
            location: row.location,
            group: row.account_group as AccountGroup,
            platform: JSON.parse(row.platform),
            monthlyPostTarget: row.monthly_post_target,
            currentMonthPosts: counts[row.account_id] ?? 0,
            postedCount: postedCounts[row.account_id] ?? 0,
            brandColor: row.brand_color,
            status: row.status as 'active' | 'inactive'
        };
        return { accountId: row.account_id, slot: isNaN(slot) ? 0 : slot, pest: row.pest, tone: row.tone, account };
    });
}

/** Get recent posts for an account (pest, title, caption, tone) from the last N months. Used to avoid duplicate content. */
export function getRecentPostsForAccount(accountId: string, limitMonths = 3): { pest: string; title: string; caption: string; tone: string | null }[] {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - limitMonths);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rows = db.prepare(`
        SELECT pest, title, caption, tone FROM posts
        WHERE account_id = ? AND date >= ?
        ORDER BY date DESC
    `).all(accountId, cutoffStr) as { pest: string; title: string; caption: string; tone: string | null }[];
    return rows;
}

export function getSavedBatchContent(
    accountIds: string[],
    date: Date
): Record<string, { title: string; hook: string; caption: string; canvaInstruction: string; postId?: string; status?: string; imagePath?: string }> {
    const dateStr = date.toISOString().split('T')[0];
    const result: Record<string, { title: string; hook: string; caption: string; canvaInstruction: string; postId?: string; status?: string; imagePath?: string }> = {};

    for (const accountId of accountIds) {
        const row = db.prepare(`
            SELECT id, title, caption, canva_instruction, hook, status, image_path FROM posts
            WHERE account_id = ? AND date LIKE ?
            LIMIT 1
        `).get(accountId, `${dateStr}%`) as { id: string; title: string; caption: string; canva_instruction: string; hook?: string; status?: string; image_path?: string } | undefined;

        if (row && row.title) {
            result[accountId] = {
                title: row.title,
                hook: row.hook || '',
                caption: row.caption || '',
                canvaInstruction: row.canva_instruction || '',
                postId: row.id,
                status: row.status || 'Draft',
                imagePath: row.image_path || undefined
            };
        }
    }
    return result;
}

export function saveCalendarEvent(event: CalendarEvent) {
    // Check if exists
    const exists = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(event.id);

    if (exists) {
        // Update
        const stmt = db.prepare(`
       UPDATE posts SET status = @status, canva_instruction = @canvaInstruction, tone = @tone WHERE id = @id
     `);
        stmt.run({ status: event.status, canvaInstruction: event.canvaInstruction || null, tone: event.tone || null, id: event.id });
    } else {
        // Insert
        const stmt = db.prepare(`
      INSERT INTO posts (id, account_id, date, pest, title, caption, canva_instruction, status, tone)
      VALUES (@id, @accountId, @date, @pest, @title, @caption, @canvaInstruction, @status, @tone)
    `);

        stmt.run({
            id: event.id,
            accountId: event.accountId,
            date: event.date.toISOString(),
            pest: event.pest,
            title: event.title,
            caption: event.caption,
            canvaInstruction: event.canvaInstruction || null,
            status: event.status,
            tone: event.tone || null
        });
    }
}

export function getCalendarEventsForMonth(monthStart: string, monthEnd: string): CalendarEvent[] {
    // Simple retrieval, filtering by date string comparison might be tricky depending on format
    // For now, let's just get all and filter in app or slightly better SQL
    const stmt = db.prepare('SELECT * FROM posts');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
        id: row.id,
        date: new Date(row.date),
        accountId: row.account_id,
        accountName: row.account_name ?? "",
        pest: row.pest,
        tone: row.tone as Tone | undefined,
        title: row.title,
        caption: row.caption,
        canvaInstruction: row.canva_instruction,
        status: row.status
    }));
}

export function getCalendarEventsWithAccounts(): CalendarEvent[] {
    const stmt = db.prepare(`
    SELECT p.*, a.name as account_name 
    FROM posts p 
    JOIN accounts a ON p.account_id = a.id
  `);

    const rows = stmt.all() as any[];

    return rows.map(row => ({
        id: row.id,
        date: new Date(row.date),
        accountId: row.account_id,
        accountName: row.account_name,
        pest: row.pest,
        tone: row.tone,
        title: row.title,
        caption: row.caption,
        canvaInstruction: row.canva_instruction,
        status: row.status
    }));
}

export function getSeasonalPests(month: string, climate: string): { pest: string; reason: string }[] {
    const stmt = db.prepare(`
        SELECT pest, reason FROM seasonal_pests
        WHERE month = ? AND climate = ?
        ORDER BY sort_order ASC
    `);
    const rows = stmt.all(month, climate) as { pest: string; reason: string }[];
    return rows;
}

export function saveSeasonalPests(month: string, climate: string, pests: { pest: string; reason: string }[]) {
    const del = db.prepare('DELETE FROM seasonal_pests WHERE month = ? AND climate = ?');
    del.run(month, climate);

    const insert = db.prepare(`
        INSERT INTO seasonal_pests (month, climate, pest, reason, sort_order)
        VALUES (?, ?, ?, ?, ?)
    `);
    pests.forEach((p, i) => insert.run(month, climate, p.pest, p.reason, i));
}

export function createContentTemplate(template: Omit<ContentTemplate, 'id'>) {
    const id = Math.random().toString(36).substring(2, 11);
    const stmt = db.prepare(`
        INSERT INTO content_templates (id, title, pest, tone, preview, tags)
        VALUES (@id, @title, @pest, @tone, @preview, @tags)
    `);
    stmt.run({
        id,
        title: template.title,
        pest: template.pest,
        tone: template.tone,
        preview: template.preview,
        tags: JSON.stringify(template.tags)
    });
    return id;
}

export function deleteContentTemplate(id: string) {
    db.prepare('DELETE FROM content_templates WHERE id = ?').run(id);
}

export function clearContentTemplates() {
    db.prepare('DELETE FROM content_templates').run();
}

export function getContentTemplates(): ContentTemplate[] {
    const stmt = db.prepare('SELECT * FROM content_templates');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
        id: row.id,
        title: row.title,
        pest: row.pest,
        tone: row.tone as Tone,
        preview: row.preview,
        tags: JSON.parse(row.tags)
    }));
}

export function getSettings(): Record<string, string> {
    const stmt = db.prepare('SELECT * FROM settings');
    const rows = stmt.all() as { key: string, value: string }[];

    const settings: Record<string, string> = {};
    rows.forEach(row => {
        settings[row.key] = row.value;
    });

    return settings;
}

export function updateSetting(key: string, value: string) {
    const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `);


    return stmt.run({ key, value });
}

export function getDailyAnalytics(days: number = 30) {
    const stmt = db.prepare('SELECT * FROM analytics_daily ORDER BY date DESC LIMIT ?');
    const rows = stmt.all(days) as any[];

    return rows.map(row => ({
        date: row.date,
        reach: row.reach,
        engagementRate: row.engagement_rate,
        comments: row.comments
    })).reverse(); // Return chronological
}

export interface ProgressPost {
    id: string;
    date: string;
    imagePath: string;
    title: string;
    pest: string;
}

export interface ProgressAccount {
    accountId: string;
    accountName: string;
    posts: ProgressPost[];
}

export interface ProgressLocation {
    locationName: string;
    accounts: ProgressAccount[];
}

export interface ProgressDateGroup {
    dateStr: string;
    dateLabel: string;
    locations: ProgressLocation[];
}

/** Get all posts with images, grouped by date → location → account. For file-manager style progress view. */
export function getPostsWithImagesByAccount(): ProgressDateGroup[] {
    const stmt = db.prepare(`
        SELECT p.id, p.account_id, p.date, p.image_path, p.title, p.pest, a.name as account_name, a.account_group as location_name
        FROM posts p
        JOIN accounts a ON p.account_id = a.id
        WHERE p.image_path IS NOT NULL AND p.image_path != ''
        ORDER BY p.date DESC, a.account_group, a.name
    `);
    const rows = stmt.all() as { id: string; account_id: string; date: string; image_path: string; title: string; pest: string; account_name: string; location_name: string }[];

    const byDate = new Map<string, Map<string, Map<string, { accountName: string; posts: ProgressPost[] }>>>();

    for (const row of rows) {
        const dateStr = row.date.split("T")[0];
        const post: ProgressPost = { id: row.id, date: row.date, imagePath: row.image_path, title: row.title, pest: row.pest };
        const location = row.location_name || "Other";

        if (!byDate.has(dateStr)) {
            byDate.set(dateStr, new Map());
        }
        const byLocation = byDate.get(dateStr)!;
        if (!byLocation.has(location)) {
            byLocation.set(location, new Map());
        }
        const byAccount = byLocation.get(location)!;
        if (!byAccount.has(row.account_id)) {
            byAccount.set(row.account_id, { accountName: row.account_name, posts: [] });
        }
        byAccount.get(row.account_id)!.posts.push(post);
    }

    const result: ProgressDateGroup[] = [];
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

    for (const dateStr of sortedDates) {
        const byLocation = byDate.get(dateStr)!;
        const locations: ProgressLocation[] = [];
        const sortedLocations = Array.from(byLocation.keys()).sort();

        for (const locName of sortedLocations) {
            const byAccount = byLocation.get(locName)!;
            const accounts: ProgressAccount[] = Array.from(byAccount.entries()).map(([accountId, data]) => ({
                accountId,
                accountName: data.accountName,
                posts: data.posts
            }));
            locations.push({ locationName: locName, accounts });
        }

        const d = new Date(dateStr + "T12:00:00");
        result.push({
            dateStr,
            dateLabel: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            locations
        });
    }

    return result;
}

/** Clears all data and re-seeds with defaults. */
export function resetDatabase() {
    db.exec('DELETE FROM posts');
    db.exec('DELETE FROM accounts');
    db.exec('DELETE FROM content_templates');
    db.exec('DELETE FROM settings');
    db.exec('DELETE FROM analytics_daily');
    db.exec('DELETE FROM seasonal_pests');
    initDb();
}
