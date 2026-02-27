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

/** Returns post count per account_id for the given month (1–12) and year. */
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

export function getAccounts(): Account[] {
    const stmt = db.prepare('SELECT * FROM accounts');
    const rows = stmt.all() as any[];

    const now = new Date();
    const counts = getPostCountsPerAccountForMonth(now.getMonth() + 1, now.getFullYear());

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        location: row.location,
        group: row.account_group as AccountGroup,
        platform: JSON.parse(row.platform),
        monthlyPostTarget: row.monthly_post_target,
        currentMonthPosts: counts[row.id] ?? 0,
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

export function getSavedBatchContent(accountIds: string[], date: Date): Record<string, { title: string; hook: string; caption: string; canvaInstruction: string }> {
    const dateStr = date.toISOString().split('T')[0];
    const result: Record<string, { title: string; hook: string; caption: string; canvaInstruction: string }> = {};

    for (const accountId of accountIds) {
        const row = db.prepare(`
            SELECT title, caption, canva_instruction, hook FROM posts
            WHERE account_id = ? AND date LIKE ?
            LIMIT 1
        `).get(accountId, `${dateStr}%`) as { title: string; caption: string; canva_instruction: string; hook?: string } | undefined;

        if (row && row.title) {
            result[accountId] = {
                title: row.title,
                hook: row.hook || '',
                caption: row.caption || '',
                canvaInstruction: row.canva_instruction || ''
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
