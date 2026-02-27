"use client";

import styles from "@/app/analytics/Analytics.module.css";
import { TrendingUp, TrendingDown, Eye, Heart, MessageCircle } from "lucide-react";

interface DailyAnalytics {
    date: string;
    reach: number;
    engagementRate: number;
    comments: number;
}

interface AnalyticsClientProps {
    data: DailyAnalytics[];
}

export default function AnalyticsClient({ data }: AnalyticsClientProps) {
    // Calculate aggregates
    const totalReach = data.reduce((sum, day) => sum + day.reach, 0);
    const avgEngagement = data.reduce((sum, day) => sum + day.engagementRate, 0) / (data.length || 1);
    const totalComments = data.reduce((sum, day) => sum + day.comments, 0);

    const maxReach = Math.max(...data.map(d => d.reach));

    return (
        <div className={styles.container}>
            <header>
                <h1 style={{ fontSize: "1.875rem", fontWeight: "700" }}>Analytics</h1>
                <p style={{ color: "var(--muted-foreground)" }}>Performance overview for the last 30 days.</p>
            </header>

            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className={styles.metricLabel}>Total Reach</span>
                        <Eye size={18} color="var(--muted-foreground)" />
                    </div>
                    <span className={styles.metricValue}>{(totalReach / 1000).toFixed(1)}k</span>
                    <span className={`${styles.metricTrend} ${styles.trendUp}`}>
                        <TrendingUp size={14} /> Last 30 days
                    </span>
                </div>

                <div className={styles.metricCard}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className={styles.metricLabel}>Avg. Engagement</span>
                        <Heart size={18} color="var(--muted-foreground)" />
                    </div>
                    <span className={styles.metricValue}>{avgEngagement.toFixed(1)}%</span>
                    <span className={`${styles.metricTrend} ${styles.trendUp}`}>
                        <TrendingUp size={14} /> Stable
                    </span>
                </div>

                <div className={styles.metricCard}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className={styles.metricLabel}>Comments</span>
                        <MessageCircle size={18} color="var(--muted-foreground)" />
                    </div>
                    <span className={styles.metricValue}>{totalComments}</span>
                    <span className={`${styles.metricTrend} ${styles.trendUp}`}>
                        <TrendingUp size={14} /> Active
                    </span>
                </div>
            </div>

            <div className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.chartTitle}>Reach Trends</h2>
                </div>
                <div className={`${styles.mockChart} ${styles.chartContainer}`}>
                    {data.map((day, i) => (
                        <div
                            key={day.date}
                            className={styles.chartBar}
                            style={{ height: `${(day.reach / maxReach) * 100}%` }}
                            title={`${day.date}: ${day.reach} reach`}
                        >
                            {/* Show label every 5 days */}
                            {i % 5 === 0 && <span className={styles.chartBarLabel} style={{ fontSize: '0.6rem' }}>{new Date(day.date).getDate()}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
