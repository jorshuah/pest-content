"use client";

import CalendarBoard from "@/components/CalendarBoard";
import { CalendarBatch } from "@/lib/rotation-engine";
import { Month } from "@/lib/seasonal-engine";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchCalendarBatches } from "@/app/actions";
import BatchDetailModal from "@/components/BatchDetailModal";

export default function CalendarContent() {
    const searchParams = useSearchParams();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [batches, setBatches] = useState<CalendarBatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<CalendarBatch | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadBatches(currentDate);
    }, [currentDate]);

    useEffect(() => {
        if (searchParams.get('open') === 'today' && batches.length > 0) {
            const today = new Date();
            const todayBatch = batches.find(b => new Date(b.date).toDateString() === today.toDateString());
            if (todayBatch) {
                setSelectedBatch(todayBatch);
                setIsModalOpen(true);
            }
        }
    }, [searchParams, batches]);

    const loadBatches = async (date: Date) => {
        setIsLoading(true);
        const monthIndex = date.getMonth();
        const months: Month[] = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = months[monthIndex];
        const year = date.getFullYear();

        try {
            const newBatches = await fetchCalendarBatches(monthName, year);
            setBatches(newBatches);
        } catch (error) {
            console.error("Failed to fetch batches:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const handleBatchClick = (batch: CalendarBatch) => {
        setSelectedBatch(batch);
        setIsModalOpen(true);
    };

    return (
        <div>
            <header style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)" }}>
                    Content Calendar
                </h1>
                <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    Daily batch schedule — which profiles to work on each day
                </p>
            </header>

            <CalendarBoard
                currentDate={currentDate}
                batches={batches}
                onMonthChange={handleMonthChange}
                onBatchClick={handleBatchClick}
            />

            <BatchDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                batch={selectedBatch}
            />
        </div>
    );
}
