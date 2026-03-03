import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pest-content.db');
const db = new Database(dbPath);

export function initDb() {
  // Create accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      account_group TEXT NOT NULL,
      platform TEXT NOT NULL,
      monthly_post_target INTEGER NOT NULL,
      current_month_posts INTEGER DEFAULT 0,
      brand_color TEXT,
      status TEXT DEFAULT 'active'
    )
  `);

  // Create posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      date TEXT NOT NULL,
      pest TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT,
      canva_instruction TEXT,
      status TEXT DEFAULT 'Draft',
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
  `);

  try {
    db.exec(`ALTER TABLE posts ADD COLUMN canva_instruction TEXT`);
  } catch (e) { /* ignore */ }
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN hook TEXT`);
  } catch (e) { /* ignore */ }
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN tone TEXT`);
  } catch (e) { /* ignore */ }
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN image_path TEXT`);
  } catch (e) { /* ignore */ }

  // Create seasonal_pests table (AI-generated, replaces hardcoded SEASONAL_DATA)
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasonal_pests (
      month TEXT NOT NULL,
      climate TEXT NOT NULL,
      pest TEXT NOT NULL,
      reason TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (month, climate, pest)
    )
  `);

  // Create content_templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      pest TEXT NOT NULL,
      tone TEXT NOT NULL,
      preview TEXT NOT NULL,
      tags TEXT NOT NULL
    )
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create analytics_daily table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date TEXT PRIMARY KEY,
      reach INTEGER NOT NULL,
      engagement_rate REAL NOT NULL,
      comments INTEGER NOT NULL
    )
  `);

  // Migration: LinkedIn (In) -> TikTok (TT)
  try {
    db.prepare(`UPDATE accounts SET platform = REPLACE(platform, '"In"', '"TT"') WHERE platform LIKE '%"In"%'`).run();
  } catch (e) { /* ignore */ }

  // Seed data if empty
  const count = db.prepare('SELECT count(*) as count FROM accounts').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO accounts (id, name, location, account_group, platform, monthly_post_target, current_month_posts, brand_color, status)
      VALUES (@id, @name, @location, @group, @platform, @monthlyPostTarget, @currentMonthPosts, @brandColor, @status)
    `);

    const mockAccounts = [
      { id: "1", name: "Instant Pest Now", location: "Staten Island, NY", group: "Staten Island", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#2563eb", status: "active" },
      { id: "2", name: "Brooklyn Pest Control Now", location: "Brooklyn, NY", group: "Brooklyn", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#16a34a", status: "active" },
      { id: "3", name: "Pest Guard 247", location: "Brooklyn, NY", group: "Brooklyn", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#ea580c", status: "active" },
      { id: "4", name: "Swift Exterminators", location: "Queens, NY", group: "Queens", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#9333ea", status: "active" },
      { id: "5", name: "Bronx Pest Control Now", location: "Bronx, NY", group: "Bronx", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#dc2626", status: "active" },
      { id: "6", name: "Manhattan Pest Control Now", location: "Manhattan, NY", group: "Manhattan", platform: JSON.stringify(["FB", "IG", "TT"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#2563eb", status: "active" },
      { id: "7", name: "Emergency Pest Squad", location: "Manhattan, NY", group: "Manhattan", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#0f172a", status: "active" },
      { id: "8", name: "Fast Response Pest Services", location: "Westchester County, NY", group: "Westchester", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#16a34a", status: "active" },
      { id: "9", name: "Nassau Pest Control Now", location: "Nassau County, NY", group: "Nassau", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#ca8a04", status: "active" },
      { id: "10", name: "247 Urgent Pest Control", location: "Nassau County, NY", group: "Nassau", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#ea580c", status: "active" },
      { id: "11", name: "Suffolk Pest Control Now", location: "Suffolk County, NY", group: "Suffolk", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#2563eb", status: "active" },
      { id: "12", name: "Rapid Emergency Pest Solutions", location: "Suffolk County, NY", group: "Suffolk", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#dc2626", status: "active" },
      { id: "13", name: "Fast Action Pest Control Services", location: "Suffolk County, NY", group: "Suffolk", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#16a34a", status: "active" },
      { id: "14", name: "Emergency Pest Now", location: "New Jersey", group: "NJ", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#0f172a", status: "active" },
      { id: "15", name: "Rockland Pest Control Now", location: "Rockland, NY", group: "Rockland", platform: JSON.stringify(["FB", "IG"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#9333ea", status: "active" },
      { id: "16", name: "Lordicap Exterminating", location: "General", group: "Main", platform: JSON.stringify(["FB", "IG", "TT"]), monthlyPostTarget: 8, currentMonthPosts: 0, brandColor: "#2563eb", status: "active" }
    ];

    for (const account of mockAccounts) {
      insert.run(account);
    }
  }

  // Seed templates if empty
  const templateCount = db.prepare('SELECT count(*) as count FROM content_templates').get() as { count: number };
  if (templateCount.count === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO content_templates (id, title, pest, tone, preview, tags)
      VALUES (@id, @title, @pest, @tone, @preview, @tags)
    `);

    const mockTemplates = [
      {
        id: "1",
        title: "Mosquito Warning",
        pest: "Mosquitoes",
        tone: "Urgent",
        preview: "Usage of this template is high in summer months. Focuses on standing water and breeding grounds.",
        tags: JSON.stringify(["#MosquitoControl", "#SummerSafety"])
      },
      {
        id: "2",
        title: "Termite Signs Checklist",
        pest: "Termites",
        tone: "Educational",
        preview: "5 signs you might have termites. Mud tubes, hollow wood, discarded wings...",
        tags: JSON.stringify(["#TermiteAwareness", "#HomeInspection"])
      },
      {
        id: "3",
        title: "Rodent Proofing Tips",
        pest: "Rodents",
        tone: "Educational",
        preview: "Keep mice out this winter. Seal cracks, store food properly, and clear clutter.",
        tags: JSON.stringify(["#WinterPests", "#RodentControl"])
      },
      {
        id: "4",
        title: "Spring Sale - 20% Off",
        pest: "General Pests",
        tone: "Promotional",
        preview: "Get ready for spring with our comprehensive pest protection package. Limited time offer.",
        tags: JSON.stringify(["#SpringSale", "#PestFree"])
      },
      {
        id: "5",
        title: "Bed Bug Myths Busted",
        pest: "Bed Bugs",
        tone: "Myth-busting",
        preview: "Myth: Bed bugs only live in dirty homes. Truth: They can be found anywhere.",
        tags: JSON.stringify(["#BedBugMyths", "#TravelSafe"])
      },
      {
        id: "6",
        title: "Spider Identification Guide",
        pest: "Spiders",
        tone: "Educational",
        preview: "How to tell the difference between a house spider and a brown recluse.",
        tags: JSON.stringify(["#SpiderID", "#SafetyFirst"])
      }
    ];

    for (const template of mockTemplates) {
      insertTemplate.run(template);
    }
  }

  // Seed settings if empty
  const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (@key, @value)');

    const defaults = [
      { key: 'profile.name', value: 'John Doe' },
      { key: 'profile.email', value: 'john@example.com' },
      { key: 'notifications.email', value: 'true' },
      { key: 'notifications.approval', value: 'true' }
    ];

    for (const setting of defaults) {
      insertSetting.run(setting);
    }
  }

  // Seed analytics if empty
  const analyticsCount = db.prepare('SELECT count(*) as count FROM analytics_daily').get() as { count: number };
  if (analyticsCount.count === 0) {
    const insertAnalytics = db.prepare('INSERT INTO analytics_daily (date, reach, engagement_rate, comments) VALUES (@date, @reach, @engagementRate, @comments)');

    // Generate 30 days of mock data
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Randomish data with a trend
      const baseReach = 400 + (30 - i) * 10;
      const reach = Math.floor(baseReach + Math.random() * 100);
      const engagementRate = 3.5 + (Math.random() * 2);
      const comments = Math.floor(reach * (engagementRate / 100) * 0.2); // ~20% of engaged users comment

      insertAnalytics.run({
        date: dateStr,
        reach,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        comments
      });
    }
  }
}

export default db;
