
// Mock of rotation-engine logic for verification
const DEFAULT_POSTS_PER_PROFILE = 8;

function getWorkingDaysInMonth(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() !== 0) result.push(d);
    }
    return result;
}

function buildRemainingSlotPairs(orderedProfiles, postsPerAccount) {
    const pairs = [];
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

function getSlotForDayFromPairs(profileIndex, day, pairs, assignableDays) {
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

const mockAccounts = Array.from({ length: 16 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `Profile ${i + 1}`,
    monthlyPostTarget: 8
}));

const year = 2026;
const monthIndex = 2; // March
const workingDays = getWorkingDaysInMonth(year, monthIndex);
const postsPerAccount = {};
const pairs = buildRemainingSlotPairs(mockAccounts, postsPerAccount);

console.log(`Testing with ${mockAccounts.length} accounts and ${workingDays.length} working days.`);
console.log(`Total pairs: ${pairs.length}\n`);

const dailyDistribution = workingDays.map(day => {
    const profiles = [];
    for (let i = 0; i < mockAccounts.length; i++) {
        const slot = getSlotForDayFromPairs(i, day, pairs, workingDays);
        if (slot >= 0) {
            profiles.push(mockAccounts[i].id);
        }
    }
    return { day, profiles };
});

dailyDistribution.forEach(({ day, profiles }) => {
    console.log(`Day ${day.toString().padStart(2, ' ')}: [${profiles.join(',').padStart(15, ' ')}] (${profiles.length} posts)`);
    const unique = new Set(profiles);
    if (unique.size !== profiles.length) console.error("  ERROR: Duplicate!");
});

const allAssigned = dailyDistribution.flatMap(d => d.profiles);
const counts = {};
allAssigned.forEach(id => counts[id] = (counts[id] || 0) + 1);

console.log('\nFinal counts per profile:');
mockAccounts.forEach(a => console.log(`  Profile ${a.id.padStart(2, ' ')}: ${counts[a.id] || 0} posts`));
console.log(`\nTotal posts assigned: ${allAssigned.length} / ${pairs.length}`);
