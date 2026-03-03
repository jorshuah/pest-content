
import { getMonthBatches } from '../lib/rotation-engine';
import { Account } from '../types';

const mockAccounts: Account[] = Array.from({ length: 16 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `Profile ${i + 1}`,
    location: 'Test Location',
    brandColor: '#000000',
    group: 'A',
    platform: ['FB'],
    monthlyPostTarget: 8,
    currentMonthPosts: 0,
    status: 'active'
}));

const month = 'March';
const year = 2026;

console.log(`Testing rotation for ${month} ${year} with ${mockAccounts.length} accounts.`);

const batches = getMonthBatches(mockAccounts, month as any, year);

batches.forEach(batch => {
    const day = batch.date.getDate();
    const profiles = batch.profiles.map(p => p.account.id);
    console.log(`Day ${day.toString().padStart(2, ' ')}: [${profiles.join(', ')}] (${profiles.length} posts)`);

    // Check for duplicates
    const unique = new Set(profiles);
    if (unique.size !== profiles.length) {
        console.error(`  ERROR: Duplicate profiles on Day ${day}!`);
    }
});

const allAssigned = batches.flatMap(b => b.profiles.map(p => p.account.id));
const counts: Record<string, number> = {};
allAssigned.forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
});

console.log('\nPost counts per account:');
Object.entries(counts).forEach(([id, count]) => {
    console.log(`  Profile ${id.padStart(2, ' ')}: ${count} posts`);
});

const totalExpected = mockAccounts.length * 8;
console.log(`\nTotal posts: ${allAssigned.length} (Expected: ${totalExpected})`);
