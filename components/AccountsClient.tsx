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
            <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.025em", color: "var(--foreground)" }}>Accounts</h1>
                </div>
                <button
                    onClick={handleAdd}
                    style={{
                        backgroundColor: "var(--brand)",
                        color: "var(--brand-foreground)",
                        padding: "0.5rem 1rem",
                        borderRadius: "var(--radius)",
                        border: "none",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxShadow: "var(--shadow-sm)",
                        transition: "all 0.2s ease"
                    }}
                >
                    <Plus size={18} />
                    Add Account
                </button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
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
