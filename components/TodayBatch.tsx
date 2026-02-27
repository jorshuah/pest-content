"use client";

import { TodayBatchProfile } from "@/lib/rotation-engine";
import { Bug, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import styles from "./TodayBatch.module.css";

interface TodayBatchProps {
    profiles: TodayBatchProfile[];
}

export default function TodayBatch({ profiles }: TodayBatchProps) {
    if (profiles.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Today&apos;s Batch</h2>
                </div>
                <p className={styles.emptyState}>
                    No profiles to work on today. All accounts may be inactive.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Today&apos;s Batch</h2>
                <span className={styles.badge}>{profiles.length} profiles</span>
            </div>
            <p className={styles.subtitle}>
                Work on these profiles today. Content is tailored to each area.
            </p>
            <div className={styles.profileList}>
                {profiles.map(({ account, county, suggestedPest, pestReason, tone }) => (
                    <Link
                        key={account.id}
                        href="/calendar?open=today"
                        className={styles.profileCard}
                    >
                        <div
                            className={styles.avatar}
                            style={{ backgroundColor: account.brandColor || "var(--brand)" }}
                        >
                            {account.name.charAt(0)}
                        </div>
                        <div className={styles.profileContent}>
                            <span className={styles.accountName}>{account.name}</span>
                            <span className={styles.county}>
                                <MapPin size={12} />
                                {county}
                            </span>
                            <div className={styles.pestRow}>
                                <Bug size={14} />
                                <span className={styles.pestLabel}>{suggestedPest}</span>
                                <span className={styles.toneBadge}>{tone}</span>
                            </div>
                            <span className={styles.pestReason}>{pestReason}</span>
                        </div>
                        <ChevronRight size={18} className={styles.chevron} />
                    </Link>
                ))}
            </div>
            <Link href="/calendar" className={styles.viewCalendar}>
                View full calendar →
            </Link>
        </div>
    );
}
