import styles from "./DashboardStats.module.css";
import { Users, FileText, Calendar, AlertCircle } from "lucide-react";

import { fetchDashboardStats } from "@/app/actions";

export default async function DashboardStats() {
    const data = await fetchDashboardStats();

    const primaryStat = {
        label: "Posts Generated",
        value: data.postsGenerated,
        trend: `${Math.round((data.postsGenerated / (data.postsGenerated + data.remaining || 1)) * 100)}% of target`,
        icon: FileText,
        trendUp: true
    };

    const secondaryStats = [
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
            <div className={styles.primaryCard}>
                <div className={styles.header}>
                    <span className={styles.primaryLabel}>{primaryStat.label}</span>
                    <primaryStat.icon size={20} color="rgba(255,255,255,0.8)" />
                </div>
                <div>
                    <div className={styles.primaryValue}>{primaryStat.value}</div>
                    <div className={styles.primaryTrend}>
                        {primaryStat.trend}
                    </div>
                </div>
            </div>

            <div className={styles.secondaryGrid}>
                {secondaryStats.map((stat, index) => (
                    <div key={index} className={styles.secondaryCard}>
                        <div className={styles.header}>
                            <span className={styles.label}>{stat.label}</span>
                            <stat.icon size={16} color="var(--muted-foreground)" />
                        </div>
                        <span className={styles.value}>{stat.value}</span>
                        <span className={styles.trend} style={{ color: stat.trendUp ? "var(--status-posted)" : "var(--destructive)" }}>
                            {stat.trend}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
