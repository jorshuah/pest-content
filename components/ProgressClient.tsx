"use client";

import { useState, useMemo, useEffect } from "react";
import { ImageIcon, Folder, FolderOpen, ChevronDown, ChevronRight, Calendar, FileImage, X, LayoutGrid, Users, CalendarDays, ChevronLeft } from "lucide-react";
import type { ProgressDateGroup, ProgressPost } from "@/lib/repository";

function getImageSrc(path: string): string {
    if (path.startsWith("/uploads/")) return "/api/uploads/" + path.slice(8);
    return path;
}

interface ProgressClientProps {
    initialData: ProgressDateGroup[];
}

type ViewMode = "today" | "month" | "gallery" | "all";

function uniqueId(prefix: string, ...parts: string[]) {
    return prefix + "_" + parts.join("_");
}

interface PreviewPost {
    id: string;
    imagePath: string;
    title: string;
    pest: string;
    date: string;
}

function flattenPosts(data: ProgressDateGroup[]): ProgressPost[] {
    const posts: ProgressPost[] = [];
    data.forEach((d) =>
        d.locations.forEach((l) =>
            l.accounts.forEach((a) => a.posts.forEach((p) => posts.push(p)))
        )
    );
    return posts;
}

function getTodayStr() {
    const d = new Date();
    return d.toISOString().split("T")[0];
}

function getMonthKey(dateStr: string) {
    return dateStr.slice(0, 7); // YYYY-MM
}

function getPostsByAccount(data: ProgressDateGroup[], monthKey: string): { accountId: string; accountName: string; locationName: string; posts: ProgressPost[] }[] {
    const byAccount = new Map<string, { accountName: string; locationName: string; posts: ProgressPost[] }>();
    data.forEach((d) =>
        d.locations.forEach((l) =>
            l.accounts.forEach((a) =>
                a.posts.forEach((p) => {
                    if (getMonthKey(p.date.split("T")[0]) !== monthKey) return;
                    const key = a.accountId;
                    if (!byAccount.has(key)) {
                        byAccount.set(key, { accountName: a.accountName, locationName: l.locationName, posts: [] });
                    }
                    byAccount.get(key)!.posts.push(p);
                })
            )
        )
    );
    return Array.from(byAccount.entries()).map(([accountId, data]) => ({
        accountId,
        accountName: data.accountName,
        locationName: data.locationName,
        posts: data.posts.sort((a, b) => b.date.localeCompare(a.date))
    }));
}

function ImageCard({ post, onPreview }: { post: ProgressPost; onPreview: (post: ProgressPost) => void }) {
    return (
        <div
            onClick={() => onPreview(post)}
            style={{
                borderRadius: "var(--radius)",
                overflow: "hidden",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
                cursor: "pointer"
            }}
        >
            <div style={{ position: "relative" }}>
                <img
                    src={getImageSrc(post.imagePath)}
                    alt={post.title}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                />
                <div style={{ position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "2px 6px" }}>
                    <FileImage size={12} color="white" />
                </div>
            </div>
            <div style={{ padding: "0.5rem 0.6rem" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }} title={post.title}>
                    {post.title.length > 22 ? post.title.slice(0, 22) + "…" : post.title}
                </div>
                <div style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                    {post.pest.length > 20 ? post.pest.slice(0, 20) + "…" : post.pest}
                </div>
            </div>
        </div>
    );
}

export default function ProgressClient({ initialData }: ProgressClientProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("gallery");
    const [monthKey, setMonthKey] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [previewList, setPreviewList] = useState<PreviewPost[] | null>(null);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(initialData.map((d) => d.dateStr)));
    const [expandedLocations, setExpandedLocations] = useState<Set<string>>(() => {
        const s = new Set<string>();
        initialData.forEach((d) => d.locations.forEach((l) => s.add(uniqueId("loc", d.dateStr, l.locationName))));
        return s;
    });
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(() => {
        const s = new Set<string>();
        initialData.forEach((d) =>
            d.locations.forEach((l) => l.accounts.forEach((a) => s.add(uniqueId("acc", d.dateStr, l.locationName, a.accountId))))
        );
        return s;
    });

    const todayStr = getTodayStr();
    const todayData = useMemo(() => initialData.filter((d) => d.dateStr === todayStr), [initialData, todayStr]);
    const monthData = useMemo(() => getPostsByAccount(initialData, monthKey), [initialData, monthKey]);

    const openPreview = (post: ProgressPost, list: ProgressPost[]) => {
        const idx = list.findIndex((p) => p.id === post.id);
        setPreviewList(list);
        setPreviewIndex(idx >= 0 ? idx : 0);
    };

    const previewPost = previewList?.[previewIndex] ?? null;

    useEffect(() => {
        if (!previewList) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setPreviewList(null);
                return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setPreviewIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                setPreviewIndex((i) => Math.min(previewList.length - 1, i + 1));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [previewList]);

    const availableMonths = useMemo(() => {
        const set = new Set<string>();
        initialData.forEach((d) => d.locations.forEach((l) => l.accounts.forEach((a) => a.posts.forEach((p) => set.add(getMonthKey(p.date.split("T")[0]))))));
        return Array.from(set).sort().reverse();
    }, [initialData]);

    const toggle = (set: "date" | "location" | "account", id: string) => {
        const updater = (prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        };
        if (set === "date") setExpandedDates(updater);
        else if (set === "location") setExpandedLocations(updater);
        else setExpandedAccounts(updater);
    };

    const totalImages = useMemo(
        () =>
            initialData.reduce(
                (sum, d) => sum + d.locations.reduce((s, l) => s + l.accounts.reduce((a, acc) => a + acc.posts.length, 0), 0),
                0
            ),
        [initialData]
    );

    const Row = ({
        level,
        icon,
        label,
        count,
        isExpanded,
        onToggle,
        id
    }: {
        level: number;
        icon: React.ReactNode;
        label: string;
        count?: number;
        isExpanded: boolean;
        onToggle: () => void;
        id: string;
    }) => (
        <button
            onClick={onToggle}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                paddingLeft: `${0.75 + level * 1.25}rem`,
                width: "100%",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "inherit",
                textAlign: "left",
                fontSize: "0.875rem"
            }}
            className="progress-row"
        >
            {isExpanded ? <ChevronDown size={16} color="var(--muted-foreground)" /> : <ChevronRight size={16} color="var(--muted-foreground)" />}
            <span style={{ color: "var(--brand)", flexShrink: 0 }}>{icon}</span>
            <span style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            {count != null && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    {count} item{count !== 1 ? "s" : ""}
                </span>
            )}
        </button>
    );

    const renderEmpty = () => (
        <div
            style={{
                padding: "3rem",
                textAlign: "center",
                backgroundColor: "var(--muted)",
                borderRadius: "var(--radius)",
                border: "1px dashed var(--border)",
                color: "var(--muted-foreground)"
            }}
        >
            <ImageIcon size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
            <p style={{ fontWeight: 500 }}>No job images yet</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Open a batch from the calendar, generate content, then upload images for each job.
            </p>
        </div>
    );

    const allPostsFlat = useMemo(() => flattenPosts(initialData), [initialData]);

    const renderView = () => {
        if (viewMode === "gallery") {
            if (allPostsFlat.length === 0) return renderEmpty();
            return (
                <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                        {allPostsFlat.length} image{allPostsFlat.length !== 1 ? "s" : ""} — scroll to browse
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
                        {allPostsFlat.map((post) => (
                            <ImageCard key={post.id} post={post} onPreview={() => openPreview(post, allPostsFlat)} />
                        ))}
                    </div>
                </div>
            );
        }

        if (viewMode === "today") {
            if (todayData.length === 0) return renderEmpty();
            const allPosts = flattenPosts(todayData);
            if (allPosts.length === 0) return renderEmpty();
            return (
                <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                        {allPosts.length} image{allPosts.length !== 1 ? "s" : ""} uploaded today
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                        {allPosts.map((post) => (
                            <ImageCard key={post.id} post={post} onPreview={() => openPreview(post, allPosts)} />
                        ))}
                    </div>
                </div>
            );
        }

        if (viewMode === "month") {
            if (monthData.length === 0) return renderEmpty();
            const [year, month] = monthKey.split("-");
            const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
            return (
                <div style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Month:</span>
                        <select
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            style={{
                                padding: "0.4rem 0.6rem",
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--card)",
                                color: "var(--foreground)",
                                fontSize: "0.875rem"
                            }}
                        >
                            {availableMonths.map((m) => {
                                const [y, mo] = m.split("-");
                                const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
                                return (
                                    <option key={m} value={m}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {monthData.map((acc) => (
                            <div
                                key={acc.accountId}
                                style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius)",
                                    overflow: "hidden",
                                    backgroundColor: "var(--card)"
                                }}
                            >
                                <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Users size={18} color="var(--brand)" />
                                    <span style={{ fontWeight: 600 }}>{acc.accountName}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>({acc.locationName})</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginLeft: "auto" }}>
                                        {acc.posts.length} post{acc.posts.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                                    {acc.posts.map((post) => (
                                        <ImageCard key={post.id} post={post} onPreview={() => openPreview(post, monthData.flatMap((a) => a.posts))} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (initialData.length === 0) return renderEmpty();
        return (
            <div>
                {initialData.map((dateGroup) => {
                    const dateId = dateGroup.dateStr;
                    const isDateExpanded = expandedDates.has(dateId);
                    const locationCount = dateGroup.locations.reduce((s, l) => s + l.accounts.reduce((a, acc) => a + acc.posts.length, 0), 0);

                    return (
                        <div key={dateId} style={{ borderBottom: "1px solid var(--border)" }}>
                            <Row
                                level={0}
                                icon={<Calendar size={18} />}
                                label={dateGroup.dateLabel}
                                count={locationCount}
                                isExpanded={isDateExpanded}
                                onToggle={() => toggle("date", dateId)}
                                id={dateId}
                            />
                            {isDateExpanded &&
                                dateGroup.locations.map((loc) => {
                                    const locId = uniqueId("loc", dateId, loc.locationName);
                                    const isLocExpanded = expandedLocations.has(locId);
                                    const accountCount = loc.accounts.reduce((s, a) => s + a.posts.length, 0);

                                    return (
                                        <div key={locId}>
                                            <Row
                                                level={1}
                                                icon={isLocExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                                                label={loc.locationName}
                                                count={accountCount}
                                                isExpanded={isLocExpanded}
                                                onToggle={() => toggle("location", locId)}
                                                id={locId}
                                            />
                                            {isLocExpanded &&
                                                loc.accounts.map((acc) => {
                                                    const accId = uniqueId("acc", dateId, loc.locationName, acc.accountId);
                                                    const isAccExpanded = expandedAccounts.has(accId);

                                                    return (
                                                        <div key={accId}>
                                                            <Row
                                                                level={2}
                                                                icon={isAccExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                                                                label={acc.accountName}
                                                                count={acc.posts.length}
                                                                isExpanded={isAccExpanded}
                                                                onToggle={() => toggle("account", accId)}
                                                                id={accId}
                                                            />
                                                            {isAccExpanded && (
                                                                <div style={{ padding: "1rem 1.25rem", paddingLeft: "3.5rem", backgroundColor: "var(--muted)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                                                                    {acc.posts.map((post) => (
                                                                        <ImageCard key={post.id} post={post} onPreview={() => openPreview(post, flattenPosts(initialData))} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    );
                                })}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
            <header style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)" }}>
                    Progress Gallery
                </h1>
                <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    {totalImages} image{totalImages !== 1 ? "s" : ""} total
                </p>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    {[
                        { id: "gallery" as const, label: "All images", icon: ImageIcon },
                        { id: "today" as const, label: "Today", icon: CalendarDays },
                        { id: "month" as const, label: "This month", icon: LayoutGrid },
                        { id: "all" as const, label: "By date", icon: Folder }
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setViewMode(id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--border)",
                                backgroundColor: viewMode === id ? "var(--brand)" : "var(--card)",
                                color: viewMode === id ? "white" : "var(--foreground)",
                                fontSize: "0.875rem",
                                cursor: "pointer"
                            }}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <div
                style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    overflow: "hidden",
                    backgroundColor: "var(--card)"
                }}
            >
                {renderView()}
            </div>

            {previewList && previewPost && (
                <div
                    onClick={() => setPreviewList(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                        padding: "2rem",
                        cursor: "pointer"
                    }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewList(null);
                        }}
                        style={{
                            position: "absolute",
                            top: "1rem",
                            right: "1rem",
                            padding: "0.5rem",
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: "var(--secondary)",
                            color: "var(--foreground)",
                            cursor: "pointer"
                        }}
                    >
                        <X size={24} />
                    </button>

                    {previewIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewIndex((i) => i - 1);
                            }}
                            style={{
                                position: "absolute",
                                left: "1rem",
                                top: "50%",
                                transform: "translateY(-50%)",
                                padding: "0.75rem",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "var(--secondary)",
                                color: "var(--foreground)",
                                cursor: "pointer"
                            }}
                        >
                            <ChevronLeft size={28} />
                        </button>
                    )}
                    {previewIndex < previewList.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewIndex((i) => i + 1);
                            }}
                            style={{
                                position: "absolute",
                                right: "3rem",
                                top: "50%",
                                transform: "translateY(-50%)",
                                padding: "0.75rem",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "var(--secondary)",
                                color: "var(--foreground)",
                                cursor: "pointer"
                            }}
                        >
                            <ChevronRight size={28} />
                        </button>
                    )}

                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <img
                            src={getImageSrc(previewPost.imagePath)}
                            alt={previewPost.title}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "80vh",
                                objectFit: "contain",
                                borderRadius: "var(--radius)",
                                boxShadow: "var(--shadow-lg)"
                            }}
                        />
                        <div style={{ color: "white", textAlign: "center", maxWidth: 400 }}>
                            <div style={{ fontWeight: 600 }}>{previewPost.title}</div>
                            <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                                {new Date(previewPost.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {previewPost.pest}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
                                {previewIndex + 1} / {previewList.length}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
