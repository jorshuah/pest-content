"use client";

import dashboardStyles from "@/app/Dashboard.module.css";
import styles from "@/app/settings/Settings.module.css";
import { User, Bell, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveSetting, resetData } from "@/app/actions";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
    initialSettings: Record<string, string>;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState("profile");
    const [settings, setSettings] = useState(initialSettings);
    const [isResetting, setIsResetting] = useState(false);
    const router = useRouter();

    const handleSettingChange = async (key: string, value: string) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            await saveSetting(key, value);
            router.refresh();
        } catch (error) {
            console.error("Failed to save setting:", error);
            // Revert on error (could simplify by just alerting)
            alert("Failed to save setting");
        }
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div
                    className={`${styles.navItem} ${activeTab === "profile" ? styles.navItemActive : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <User size={18} /> Profile
                    </div>
                </div>
                <div
                    className={`${styles.navItem} ${activeTab === "notifications" ? styles.navItemActive : ""}`}
                    onClick={() => setActiveTab("notifications")}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Bell size={18} /> Notifications
                    </div>
                </div>
                <div
                    className={`${styles.navItem} ${activeTab === "security" ? styles.navItemActive : ""}`}
                    onClick={() => setActiveTab("security")}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Shield size={18} /> Security
                    </div>
                </div>
            </aside>

            <main className={styles.content}>
                <header style={{ marginBottom: "1.5rem" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)" }}>Settings</h1>
                </header>

                {activeTab === "profile" && (
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Profile Information</h2>
                            <p className={styles.sectionDescription}>Update your personal details here.</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={settings['profile.name'] || ''}
                                onChange={(e) => handleSettingChange('profile.name', e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                className={styles.input}
                                value={settings['profile.email'] || ''}
                                onChange={(e) => handleSettingChange('profile.email', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Notification Preferences</h2>
                            <p className={styles.sectionDescription}>Choose what you want to be notified about.</p>
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.toggle}>
                                <div className={styles.toggleLabel}>
                                    <span className={styles.toggleTitle}>Email Notifications</span>
                                    <span className={styles.toggleDesc}>Receive daily summaries via email</span>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={settings['notifications.email'] === 'true'}
                                        onChange={(e) => handleSettingChange('notifications.email', String(e.target.checked))}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.toggle}>
                                <div className={styles.toggleLabel}>
                                    <span className={styles.toggleTitle}>Post Approvals</span>
                                    <span className={styles.toggleDesc}>Notify when a post needs review</span>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={settings['notifications.approval'] === 'true'}
                                        onChange={(e) => handleSettingChange('notifications.approval', String(e.target.checked))}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "security" && (
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Security</h2>
                            <p className={styles.sectionDescription}>Manage your password and security settings.</p>
                        </div>

                        <div className={styles.formGroup}>
                            <button
                                style={{
                                    backgroundColor: "var(--secondary)",
                                    color: "var(--foreground)",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius)",
                                    border: "1px solid var(--border)",
                                    cursor: "pointer",
                                    fontWeight: "500"
                                }}
                                onClick={() => alert("Password change functionality would be integrated with Auth provider.")}
                            >
                                Change Password
                            </button>
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
                            <h3 className={styles.sectionTitle} style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Reset Data</h3>
                            <p className={styles.sectionDescription} style={{ marginBottom: "0.75rem" }}>
                                Delete all accounts, posts, content, and analytics. Restores default seed data. This cannot be undone.
                            </p>
                            <button
                                style={{
                                    backgroundColor: "var(--destructive, #dc2626)",
                                    color: "white",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius)",
                                    border: "none",
                                    cursor: isResetting ? "not-allowed" : "pointer",
                                    fontWeight: "500",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    opacity: isResetting ? 0.7 : 1
                                }}
                                disabled={isResetting}
                                onClick={async () => {
                                    if (!confirm("Are you sure? This will delete all accounts, posts, content templates, and analytics. Default data will be restored.")) return;
                                    setIsResetting(true);
                                    try {
                                        await resetData();
                                        router.refresh();
                                        window.location.href = "/";
                                    } catch (error) {
                                        console.error("Failed to reset data:", error);
                                        alert("Failed to reset data");
                                    } finally {
                                        setIsResetting(false);
                                    }
                                }}
                            >
                                <Trash2 size={16} />
                                {isResetting ? "Resetting…" : "Reset Data"}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
