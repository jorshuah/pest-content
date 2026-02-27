import AccountsClient from "@/components/AccountsClient";
import { fetchAccounts } from "@/app/actions";

export default async function AccountsPage() {
    const accounts = await fetchAccounts();

    return (
        <AccountsClient initialAccounts={accounts} />
    );
}
