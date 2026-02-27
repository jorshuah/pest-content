import SettingsClient from "@/components/SettingsClient";
import { fetchSettings } from "@/app/actions";

export default async function SettingsPage() {
    const settings = await fetchSettings();

    return (
        <SettingsClient initialSettings={settings} />
    );
}
