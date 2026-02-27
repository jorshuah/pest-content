"use client";

import styles from "@/app/Dashboard.module.css";
import { PlusCircle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { generateAllMonthlyPlans } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function DashboardClient({ children }: { children: React.ReactNode }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleGeneratePlan = () => {
        // Determine target month (e.g., next month if late in current month, or just current)
        // For simplicity, let's target the current month
        const today = new Date();
        const monthIndex = today.getMonth(); // 0-11
        const year = today.getFullYear();

        // Convert to Month type
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ] as const;

        const month = months[monthIndex];

        startTransition(async () => {
            try {
                await generateAllMonthlyPlans(month, year);
                router.refresh();
                // Here we would ideally show a toast or notification
                // alert("Plan generated successfully!"); 
                // Alert is annoying, maybe just log or have a silent success state
            } catch (error) {
                console.error(error);
                alert("Failed to generate plan.");
            }
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>Welcome back. Here's what's happening today.</p>
                </div>
                <button
                    className={styles.actionButton}
                    onClick={handleGeneratePlan}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                    {isPending ? "Generating..." : "Generate Monthly Plan"}
                </button>
            </header>

            <div className={styles.bentoGrid}>
                {children}
            </div>
        </div>
    );
}
