"use client";

import { useEffect, useRef } from "react";
import { X, Calendar as CalendarIcon, MapPin, Share2 } from "lucide-react";

interface PostPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        title: string;
        caption: string;
        pest: string;
        date: Date;
        accountName: string;
        status: string;
        canvaInstruction?: string;
    } | null;
}

export default function PostPreviewModal({ isOpen, onClose, post }: PostPreviewModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden"; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !post) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                padding: '1rem',
                backdropFilter: 'blur(4px)'
            }}
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                style={{
                    backgroundColor: 'var(--card)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '800px', // Wider to accommodate side-by-side layout
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    position: 'relative'
                }}
                className="animate-in fade-in zoom-in-95 duration-200"
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'var(--secondary)',
                        cursor: 'pointer',
                        color: 'var(--muted-foreground)',
                        zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {/* Left Column: Canva Instruction */}
                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--muted)',
                        borderRight: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--foreground)' }}>
                            Canva Design Recipe
                        </h3>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--muted-foreground)',
                            marginBottom: '1.5rem'
                        }}>
                            Use this AI-generated recipe to quickly create a matching graphic in Canva.
                        </p>

                        <div style={{
                            backgroundColor: 'white',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                            flexGrow: 1,
                            fontSize: '0.9rem',
                            color: '#0f172a'
                        }}>
                            {post.canvaInstruction || "No instructions provided. Use a clean, localized background with bold text."}
                        </div>
                    </div>

                    {/* Right Column: Content */}
                    <div style={{ padding: '2rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--muted-foreground)',
                                fontSize: '0.875rem',
                                marginBottom: '0.5rem'
                            }}>
                                <CalendarIcon size={16} />
                                <span>{new Date(post.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--muted-foreground)',
                                fontSize: '0.875rem',
                                marginBottom: '1rem'
                            }}>
                                <MapPin size={16} />
                                <span>{post.accountName}</span>
                            </div>

                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: 1.2, marginBottom: '1rem' }}>
                                {post.title}
                            </h2>

                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                backgroundColor: 'var(--secondary)',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}>
                                {post.pest}
                            </div>
                        </div>

                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--foreground)', marginBottom: '2rem' }}>
                            {post.caption}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <button style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--secondary)',
                                color: 'var(--foreground)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}>
                                Edit Content
                            </button>
                            <button style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: 'none',
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}>
                                <Share2 size={18} />
                                Post Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
