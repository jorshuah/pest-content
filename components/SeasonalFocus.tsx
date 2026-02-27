import styles from "./SeasonalFocus.module.css";
import { Bug, Snowflake, Thermometer, Sun, CloudRain } from "lucide-react";
import { determineClimate, Month, Climate } from "@/lib/seasonal-engine";
import { getPriorityPests } from "@/lib/seasonal-service";
import SeasonalGenerateButton from "./SeasonalGenerateButton";

interface SeasonalFocusProps {
    location?: string;
}

export default function SeasonalFocus({ location = "New York, NY" }: SeasonalFocusProps) {
    const today = new Date();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ] as const;

    const currentMonth = months[today.getMonth()];
    const climate = determineClimate(location);
    const priorityPests = getPriorityPests(currentMonth, climate);

    const getClimateIcon = (climate: Climate) => {
        switch (climate) {
            case 'Tropical': return <CloudRain size={18} />;
            case 'Dry': return <Sun size={18} />;
            case 'Temperate': return <Snowflake size={18} />; // Changes based on season actually, but for now fixed
            default: return <Thermometer size={18} />;
        }
    };

    // Enhance priority pests with mock priority levels for UI if missing
    const enhancedPests = priorityPests.map((p, index) => ({
        ...p,
        priority: index === 0 ? "High" : index === 1 ? "Medium" : "Low", // Just for visual hierarchy
        icon: Bug
    }));

    // Fallback if no pests returned (should rely on 'default' in engine)
    const displayPests = enhancedPests.length > 0 ? enhancedPests : [
        { pest: "General Inspection", reason: "Standard maintenance", priority: "Medium", icon: Bug }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Seasonal Priority: {currentMonth}</h2>
                    <span className={styles.subtitle}>Region: {location} ({climate})</span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--muted-foreground)" }}>
                    {getClimateIcon(climate)}
                    <span style={{ fontSize: "0.875rem" }}>{climate} Climate</span>
                    <SeasonalGenerateButton month={currentMonth} climate={climate} />
                </div>
            </div>

            <div className={styles.grid}>
                {displayPests.map((pest, index) => (
                    <div key={index} className={styles.pestCard}>
                        <div
                            style={{
                                backgroundColor: "var(--background)",
                                padding: "8px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--border)"
                            }}
                        >
                            <Bug size={20} color="var(--primary)" />
                        </div>
                        <div className={styles.pestInfo}>
                            <span className={styles.pestName}>{pest.pest}</span>
                            <span className={styles.pestPriority}>{pest.priority} Priority</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
