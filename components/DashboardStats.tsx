import styles from "./DashboardStats.module.css";
import { Users, FileText, Calendar, AlertCircle } from "lucide-react";

import { fetchDashboardStats } from "@/app/actions";

export default async function DashboardStats() {
    const data = await fetchDashboardStats();

    const statsRow = [
        {
            label: "Posts Generated",
            value: data.postsGenerated,
            trend: `${Math.round((data.postsGenerated / (data.postsGenerated + data.remaining || 1)) * 100)}% of target`,
            icon: FileText,
            trendUp: true
        },
        {
            label: "Total Accounts",
            value: data.totalAccounts,
            trend: "Active Profiles",
            icon: Users,
            trendUp: true
        },
        {
            label: "Scheduled",
            value: data.scheduled,
            trend: `${data.postsGenerated - data.scheduled} pending`,
            icon: Calendar,
            trendUp: true
        },
        {
            label: "Remaining",
            value: data.remaining,
            trend: "To meet targets",
            icon: AlertCircle,
            trendUp: false
        },
    ];

    return (
        <div className={styles.bentoStatsContainer}>
            {statsRow.map((stat, index) => (
                <div key={index} className={styles.statCard}>
                    <div className={styles.header}>
                        <span className={styles.label}>{stat.label}</span>
                        <stat.icon size={18} color="var(--muted-foreground)" />
                    </div>
                    <div>
                        <div className={styles.value}>{stat.value}</div>
                        <div className={styles.trend} style={{ color: stat.trendUp ? "var(--status-posted)" : "var(--destructive)" }}>
                            {stat.trend}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
