import { getAccounts } from '../lib/repository';

async function dump() {
    const accounts = getAccounts();
    console.log(`Total accounts: ${accounts.length}`);
    let totalTarget = 0;
    accounts.forEach(a => {
        console.log(`- ${a.name} (ID: ${a.id}): Target ${a.monthlyPostTarget}, Status: ${a.status}`);
        totalTarget += a.monthlyPostTarget;
    });
    console.log(`Total Target: ${totalTarget}`);
}

dump();
