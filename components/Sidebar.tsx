"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    BarChart3,
    Settings,
    Bug
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Accounts", href: "/accounts", icon: Users },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Content Bank", href: "/content", icon: FileText },
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <Bug className={styles.icon} size={28} color="var(--brand)" />
                <span className={styles.logoText}>PestContent OS</span>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                        >
                            <item.icon className={styles.icon} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.userSection}>
                <div className={styles.avatar}>JD</div>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>John Doe</span>
                    <span className={styles.userRole}>Manager</span>
                </div>
            </div>
        </div>
    );
}
