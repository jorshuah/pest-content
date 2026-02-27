import { getPriorityPests as getHardcodedPests, type Month, type Climate, type PestPriority } from './seasonal-engine';
import { getSeasonalPests, saveSeasonalPests } from './repository';
import { generateSeasonalPests } from './ai-generators';
import { initDb } from './db';

initDb();

/** Gets pest priorities - DB (AI-generated) first, then hardcoded fallback. */
export function getPriorityPests(month: Month, climate: Climate): PestPriority[] {
    const stored = getSeasonalPests(month, climate);
    if (stored.length > 0) return stored;
    return getHardcodedPests(month, climate);
}

/** Generates seasonal pests with AI and stores in DB. */
export async function generateAndStoreSeasonalPests(month: Month, climate: Climate): Promise<PestPriority[]> {
    const pests = await generateSeasonalPests(month, climate);
    if (pests.length > 0) {
        saveSeasonalPests(month, climate, pests);
    }
    return pests;
}
