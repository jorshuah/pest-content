"use client";

import { X } from "lucide-react";
import styles from "./AccountModal.module.css";
import { Account, AccountGroup } from "@/types";
import { useState, useEffect } from "react";

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    account?: Account | null;
    onSave: (data: any) => void;
}

export default function AccountModal({ isOpen, onClose, account, onSave }: AccountModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        group: "A" as AccountGroup,
        monthlyPostTarget: 8,
        brandColor: "#2563eb",
        platform: [] as string[],
    });

    useEffect(() => {
        if (account) {
            setFormData({
                name: account.name,
                location: account.location,
                group: account.group,
                monthlyPostTarget: account.monthlyPostTarget,
                brandColor: account.brandColor,
                platform: account.platform,
            });
        } else {
            setFormData({
                name: "",
                location: "",
                group: "A",
                monthlyPostTarget: 8,
                brandColor: "#2563eb",
                platform: [],
            });
        }
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handlePlatformChange = (platform: string) => {
        setFormData(prev => ({
            ...prev,
            platform: prev.platform.includes(platform)
                ? prev.platform.filter(p => p !== platform)
                : [...prev.platform, platform]
        }));
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{account ? "Edit Account" : "Add New Account"}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Account Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Apex Pest Control - Austin"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Location</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                placeholder="City, State"
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <div className={styles.formGroup} style={{ flex: 1 }}>
                                <label className={styles.label}>Group</label>
                                <select
                                    className={styles.select}
                                    value={formData.group}
                                    onChange={e => setFormData({ ...formData, group: e.target.value as AccountGroup })}
                                >
                                    <option value="A">Group A</option>
                                    <option value="B">Group B</option>
                                    <option value="C">Group C</option>
                                    <option value="D">Group D</option>
                                </select>
                            </div>

                            <div className={styles.formGroup} style={{ flex: 1 }}>
                                <label className={styles.label}>Monthly Target</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={formData.monthlyPostTarget}
                                    onChange={e => setFormData({ ...formData, monthlyPostTarget: parseInt(e.target.value) })}
                                    min={1}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Brand Color</label>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <input
                                    type="color"
                                    value={formData.brandColor}
                                    onChange={e => setFormData({ ...formData, brandColor: e.target.value })}
                                    style={{ width: "40px", height: "40px", border: "none", cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>{formData.brandColor}</span>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Platforms</label>
                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.platform.includes("FB")}
                                        onChange={() => handlePlatformChange("FB")}
                                    /> Facebook
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.platform.includes("IG")}
                                        onChange={() => handlePlatformChange("IG")}
                                    /> Instagram
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.platform.includes("In")}
                                        onChange={() => handlePlatformChange("In")}
                                    /> LinkedIn
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button type="button" onClick={onClose} className={`${styles.button} ${styles.cancelButton}`}>Cancel</button>
                        <button type="submit" className={`${styles.button} ${styles.saveButton}`}>Save Account</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
