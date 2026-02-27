import AnalyticsClient from "@/components/AnalyticsClient";
import { fetchAnalytics } from "@/app/actions";

export default async function AnalyticsPage() {
    const data = await fetchAnalytics();

    return (
        <AnalyticsClient data={data} />
    );
}
