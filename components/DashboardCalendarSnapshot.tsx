"use client";

import { useEffect, useState } from "react";
import { CalendarBatch } from "@/lib/rotation-engine";
import { Month } from "@/lib/seasonal-engine";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { fetchCalendarBatches } from "@/app/actions";
import styles from "./DashboardCalendarSnapshot.module.css";

export default function DashboardCalendarSnapshot() {
    const [upcomingBatches, setUpcomingBatches] = useState<CalendarBatch[]>([]);

    useEffect(() => {
        const loadBatches = async () => {
            const today = new Date();
            const monthIndex = today.getMonth();
            const months: Month[] = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = months[monthIndex];
            const year = today.getFullYear();

            try {
                const batches = await fetchCalendarBatches(monthName, year);

                // Filter for batches in the next 7 days (skip today)
                const todayStr = today.toDateString();
                const nextWeek = batches.filter(batch => {
                    const batchDate = new Date(batch.date);
                    const diffTime = batchDate.getTime() - today.getTime();
                    const diffDays = diffTime / (1000 * 3600 * 24);
                    return diffDays >= 1 && diffDays <= 7;
                }).slice(0, 5);

                setUpcomingBatches(nextWeek);
            } catch (error) {
                console.error("Failed to fetch upcoming batches", error);
            }
        };

        loadBatches();
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    <Calendar size={20} /> Upcoming Batches
                </h3>
                <Link href="/calendar" className={styles.viewAllLink}>
                    View Full Calendar <ChevronRight size={16} />
                </Link>
            </div>

            {upcomingBatches.length > 0 ? (
                <div className={styles.timeline}>
                    {upcomingBatches.map((batch, i) => (
                        <div key={i} className={styles.timelineItem}>
                            <div className={styles.timelineNode}></div>
                            <div className={styles.eventContent}>
                                <div className={styles.eventDetails}>
                                    <span className={styles.eventDate}>
                                        {new Date(batch.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={styles.accountName}>
                                        {batch.profiles.map(p => `${p.account.name.split(' ')[0]} (${p.county})`).join(', ')}
                                    </span>
                                    <span className={styles.eventTitle}>{batch.profiles.length} profile{batch.profiles.length !== 1 ? 's' : ''}</span>
                                </div>
                                <span className={styles.pestBadge}>
                                    Batch
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.emptyState}>
                    No upcoming batches this week.
                </p>
            )}
        </div>
    );
}
