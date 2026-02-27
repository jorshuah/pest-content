"use client";

import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSeasonalDataForMonth } from "@/app/actions";
import type { Month } from "@/lib/seasonal-engine";

interface SeasonalGenerateButtonProps {
    month: Month;
    climate: string;
}

export default function SeasonalGenerateButton({ month, climate }: SeasonalGenerateButtonProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleGenerate = () => {
        startTransition(async () => {
            await generateSeasonalDataForMonth(month, climate);
            router.refresh();
        });
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isPending}
            style={{
                padding: "6px 12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--brand)",
                color: "white",
                cursor: isPending ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
            }}
        >
            <Sparkles size={14} />
            {isPending ? "Generating..." : "Generate with AI"}
        </button>
    );
}
