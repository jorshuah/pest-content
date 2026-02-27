"use client";

import dashboardStyles from "@/app/Dashboard.module.css";
import styles from "@/app/content/ContentBank.module.css";
import { Search, Copy, Edit, Trash, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tone } from "@/lib/content-generator";
import { ContentTemplate } from "@/lib/repository";
import { generateContentBankTemplates } from "@/app/actions";

interface ContentBankClientProps {
    initialTemplates: ContentTemplate[];
}

export default function ContentBankClient({ initialTemplates }: ContentBankClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTone, setSelectedTone] = useState<Tone | "All">("All");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleGenerate = () => {
        startTransition(async () => {
            await generateContentBankTemplates(true);
            router.refresh();
        });
    };

    const filteredTemplates = initialTemplates.filter(template => {
        const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.pest.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTone = selectedTone === "All" || template.tone === selectedTone;
        return matchesSearch && matchesTone;
    });

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)" }}>Content Bank</h1>
                <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        borderRadius: "var(--radius)",
                        border: "none",
                        backgroundColor: "var(--brand)",
                        color: "white",
                        cursor: isPending ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                    }}
                >
                    <Sparkles size={18} />
                    {isPending ? "Generating..." : "Generate with AI"}
                </button>
            </header>

            <div className={styles.controls}>
                <div className={styles.searchBar}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className={styles.filterSelect}
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as Tone | "All")}
                >
                    <option value="All">All Tones</option>
                    <option value="Educational">Educational</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Promotional">Promotional</option>
                    <option value="Myth-busting">Myth-busting</option>
                </select>
            </div>

            <div className={styles.grid}>
                {filteredTemplates.map(template => (
                    <div key={template.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardType}>{template.pest}</span>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--background)",
                                    border: "1px solid var(--border)"
                                }}
                            >
                                {template.tone}
                            </span>
                        </div>
                        <div className={styles.cardBody}>
                            <h3 className={styles.cardTitle}>{template.title}</h3>
                            <p className={styles.cardPreview}>{template.preview}</p>
                            <div className={styles.tags}>
                                {template.tags.map(tag => (
                                    <span key={tag} className={styles.tag}>{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className={styles.cardFooter}>
                            <button className={styles.actionButton} title="Copy to Clipboard">
                                <Copy size={14} /> Copy
                            </button>
                            <button className={styles.actionButton} title="Edit Template">
                                <Edit size={14} /> Edit
                            </button>
                            <button className={styles.actionButton} style={{ color: "var(--destructive)" }} title="Delete Template">
                                <Trash size={14} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
