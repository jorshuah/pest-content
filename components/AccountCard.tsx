import styles from "./AccountCard.module.css";
import { Facebook, Instagram, Video, MapPin, MoreHorizontal } from "lucide-react";
import { Account } from "@/types";

interface AccountCardProps {
    account: Account;
    onEdit?: (account: Account) => void;
}

export default function AccountCard({ account, onEdit }: AccountCardProps) {
    const progressPercentage = Math.min((account.currentMonthPosts / account.monthlyPostTarget) * 100, 100);

    // Color the progress bar based on completion
    // If > 100% or close to target, use success color
    let progressColor = "var(--primary)";
    if (progressPercentage >= 100) progressColor = "var(--status-posted)";
    else if (progressPercentage < 20) progressColor = "var(--status-draft)";

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.brand}>
                    <div
                        className={styles.logo}
                        style={{ backgroundColor: account.brandColor || "var(--primary)" }}
                    >
                        {account.logoUrl ? (
                            <img src={account.logoUrl} alt={account.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                        ) : (
                            // Initials
                            account.name.split(" ").map(n => n[0]).join("").substring(0, 2)
                        )}
                    </div>
                    <div className={styles.info}>
                        <span className={styles.name}>{account.name}</span>
                        <div className={styles.location}>
                            <MapPin size={14} />
                            {account.location}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onEdit?.(account)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>

            <div className={styles.metrics}>
                <div className={styles.progressLabel}>
                    <span>Monthly Posts</span>
                    <span>
                        {account.currentMonthPosts} / {account.monthlyPostTarget}
                        {typeof account.postedCount === "number" && (
                            <span className={styles.postedCount} title="Posted to social">
                                · {account.postedCount} posted
                            </span>
                        )}
                    </span>
                </div>
                <div className={styles.progressBarTrack}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${progressPercentage}%`, backgroundColor: progressColor }}
                    />
                </div>
            </div>

            <div className={styles.footer}>
                <span className={styles.groupBadge}>{account.group}</span>
                <div className={styles.platformIcons}>
                    {account.platform.includes('FB') && <Facebook size={16} color="var(--muted-foreground)" />}
                    {account.platform.includes('IG') && <Instagram size={16} color="var(--muted-foreground)" />}
                    {account.platform.includes('TT') && <Video size={16} color="var(--muted-foreground)" />}
                </div>
            </div>
        </div>
    );
}
