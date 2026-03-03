"use client";

import styles from "./CalendarBoard.module.css";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarBatch } from "@/lib/rotation-engine";

interface CalendarBoardProps {
    currentDate: Date;
    batches: CalendarBatch[];
    onMonthChange: (direction: 'prev' | 'next') => void;
    onBatchClick?: (batch: CalendarBatch) => void;
}

import { Check } from "lucide-react";

const MAX_VISIBLE_ITEMS = 4;

export default function CalendarBoard({ currentDate, batches, onMonthChange, onBatchClick }: CalendarBoardProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Exclude Sundays: 6-column grid (Mon–Sat). Leading empties: Sun=0, Mon=0, Tue=1, ..., Sat=5
    const leadingEmpties = firstDay === 0 ? 0 : firstDay - 1;

    const batchByDay = new Map<number, CalendarBoardProps['batches'][0]>();
    for (const b of batches) {
        const d = new Date(b.date).getDate();
        batchByDay.set(d, b);
    }

    const days = [];
    // Empty slots for alignment (Mon–Sat grid, no Sunday)
    for (let i = 0; i < leadingEmpties; i++) {
        days.push(<div key={`empty-${i}`} className={styles.dayCell} style={{ backgroundColor: "var(--background)", opacity: 0.3 }} />);
    }

    // Days of the month (skip Sundays)
    for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === 0) continue; // Skip Sunday
        const batch = batchByDay.get(d);
        const profiles = batch?.profiles || [];
        const visibleProfiles = profiles.slice(0, MAX_VISIBLE_ITEMS);
        const remainingCount = profiles.length - MAX_VISIBLE_ITEMS;

        days.push(
            <div key={d} className={styles.dayCell}>
                <span className={styles.dayNumber}>{d}</span>
                {profiles.length > 0 && (
                    <div className={styles.chipContainer}>
                        {visibleProfiles.map((p: any) => {
                            const brandColor = p.account.brandColor || "#2563eb";
                            return (
                                <div
                                    key={p.account.id}
                                    className={`${styles.chip} ${p.isPosted ? styles.chipPosted : ''}`}
                                    style={{
                                        backgroundColor: p.isPosted ? undefined : `${brandColor}15`,
                                        borderColor: p.isPosted ? undefined : `${brandColor}30`,
                                        color: p.isPosted ? undefined : brandColor,
                                        borderLeft: p.isPosted ? undefined : `3px solid ${brandColor}`
                                    }}
                                    onClick={() => onBatchClick?.(batch!)}
                                >
                                    {p.isPosted && <Check size={10} style={{ marginRight: '4px' }} />}
                                    <span className={styles.chipText}>{p.account.name}</span>
                                </div>
                            );
                        })}
                        {remainingCount > 0 && (
                            <div className={styles.moreLink} onClick={() => onBatchClick?.(batch!)}>
                                +{remainingCount} more
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.header}>
                <h2 className={styles.monthTitle}>{monthName} {year}</h2>
                <div className={styles.navigation}>
                    <button onClick={() => onMonthChange('prev')} className={styles.navButton}>
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => onMonthChange('next')} className={styles.navButton}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className={styles.dayHeader}>{day}</div>
                ))}
                {days}
            </div>
        </div>
    );
}
