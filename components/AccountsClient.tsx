"use client";

import AccountCard from "@/components/AccountCard";
import AccountModal from "@/components/AccountModal";
import styles from "@/app/Dashboard.module.css";
import { Account } from "@/types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { addAccount, saveAccount } from "@/app/actions";
import { useRouter } from "next/navigation";

interface AccountsClientProps {
    initialAccounts: Account[];
}

export default function AccountsClient({ initialAccounts }: AccountsClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const router = useRouter();

    const handleEdit = (account: Account) => {
        setSelectedAccount(account);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedAccount(null);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (selectedAccount) {
                // Update existing
                await saveAccount({
                    ...selectedAccount,
                    ...data
                });
            } else {
                // Add new
                await addAccount(data);
            }
            setIsModalOpen(false);
            router.refresh(); // Refresh server components to get updated data
        } catch (error) {
            console.error("Failed to save account:", error);
            alert("Failed to save account. Please try again.");
        }
    };

    return (
        <div>
            <header style={{ marginBottom: "var(--spacing-lg)", paddingBottom: "var(--spacing-sm)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)", margin: 0 }}>Accounts</h1>
                    <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Manage active social media profiles</span>
                </div>
                <button
                    onClick={handleAdd}
                    style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        padding: "0.625rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--primary)",
                        fontWeight: "500",
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        transition: "all 0.15s ease"
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--primary)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary)";
                        e.currentTarget.style.color = "var(--primary-foreground)";
                    }}
                >
                    <Plus size={16} />
                    Add Account
                </button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--spacing-md)", alignItems: "start" }}>
                {initialAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} onEdit={handleEdit} />
                ))}
            </div>

            <AccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                account={selectedAccount}
                onSave={handleSave}
            />
        </div>
    );
}
