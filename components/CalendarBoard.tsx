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

export default function CalendarBoard({ currentDate, batches, onMonthChange, onBatchClick }: CalendarBoardProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Exclude Sundays: 6-column grid (Mon–Sat). Leading empties: Sun=0, Mon=0, Tue=1, ..., Sat=5
    const leadingEmpties = firstDay === 0 ? 0 : firstDay - 1;

    const batchByDay = new Map<number, CalendarBatch>();
    for (const b of batches) {
        const d = new Date(b.date).getDate();
        batchByDay.set(d, b);
    }

    const days = [];
    // Empty slots for alignment (Mon–Sat grid, no Sunday)
    for (let i = 0; i < leadingEmpties; i++) {
        days.push(<div key={`empty-${i}`} className={styles.dayCell} style={{ backgroundColor: "var(--secondary)", opacity: 0.5 }} />);
    }

    // Days of the month (skip Sundays)
    for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === 0) continue; // Skip Sunday
        const batch = batchByDay.get(d);

        days.push(
            <div key={d} className={styles.dayCell}>
                <span className={styles.dayNumber}>{d}</span>
                {batch && batch.profiles.length > 0 && (
                    <div
                        className={styles.batch}
                        onClick={() => onBatchClick?.(batch)}
                        title={batch.profiles.map(p => `${p.account.name} (${p.county})`).join(', ')}
                    >
                        <span className={styles.batchProfiles}>
                            {batch.profiles.map(p => {
                                const shortName = p.account.name.length > 16 ? p.account.name.slice(0, 14) + '…' : p.account.name;
                                return (
                                    <span key={p.account.id} className={styles.batchProfile}>
                                        {shortName} ({p.county})
                                    </span>
                                );
                            })}
                        </span>
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
