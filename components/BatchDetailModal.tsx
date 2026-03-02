"use client";

import { X, MapPin, Bug, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { CalendarBatch } from "@/lib/rotation-engine";
import { useState, useEffect } from "react";
import { generateBatchContent, fetchSavedBatchContent, togglePostPosted } from "@/app/actions";

interface ProfileContent {
    accountId: string;
    title: string;
    hook: string;
    caption: string;
    canvaInstruction: string;
    postId?: string;
    status?: string;
}

interface BatchDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: CalendarBatch | null;
}

export default function BatchDetailModal({ isOpen, onClose, batch }: BatchDetailModalProps) {
    const [contentByProfile, setContentByProfile] = useState<Record<string, ProfileContent>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !batch) {
            setContentByProfile({});
            return;
        }
        setContentByProfile({});
        const accountIds = batch.profiles.map(p => p.account.id);
        const date = new Date(batch.date);
        fetchSavedBatchContent(accountIds, date).then(saved => {
            if (Object.keys(saved).length > 0) {
                setContentByProfile(saved as Record<string, ProfileContent>);
                setExpandedId(batch.profiles[0]?.account.id ?? null);
            }
        });
    }, [isOpen, batch]);

    if (!isOpen || !batch) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).dataset.backdrop) onClose();
    };

    const handleGenerateContent = async () => {
        setIsGenerating(true);
        try {
            const profiles = batch.profiles.map(p => ({
                accountId: p.account.id,
                accountName: p.account.name,
                accountLocation: p.account.location,
                suggestedPest: p.suggestedPest,
                tone: p.tone,
                slot: p.slot
            }));
            const date = new Date(batch.date);
            const results = await generateBatchContent(profiles, date);
            const byId: Record<string, ProfileContent> = {};
            for (const r of results) {
                byId[r.accountId] = r;
            }
            setContentByProfile(byId);
            setExpandedId(batch.profiles[0]?.account.id ?? null);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTogglePosted = async (accountId: string) => {
        const content = contentByProfile[accountId];
        if (!content?.postId) return;
        setTogglingId(accountId);
        try {
            await togglePostPosted(content.postId);
            setContentByProfile((prev) => ({
                ...prev,
                [accountId]: {
                    ...prev[accountId],
                    status: prev[accountId].status === "Posted" ? "Draft" : "Posted"
                }
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div
            data-backdrop
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
                style={{
                    backgroundColor: 'var(--card)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
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
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        {new Date(batch.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {batch.profiles.length} profile{batch.profiles.length !== 1 ? 's' : ''} in this batch
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                        Generate content ideas and Canva recipes for each profile.
                    </p>

                    {Object.keys(contentByProfile).length === 0 && (
                        <button
                            onClick={handleGenerateContent}
                            disabled={isGenerating}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: 'none',
                                backgroundColor: 'var(--brand)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: isGenerating ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Sparkles size={18} />
                            {isGenerating ? 'Generating...' : 'Generate content for this batch'}
                        </button>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {batch.profiles.map(({ account, county, suggestedPest, tone }) => {
                            const content = contentByProfile[account.id];
                            const isExpanded = expandedId === account.id;

                            return (
                                <div
                                    key={account.id}
                                    style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius)',
                                        overflow: 'hidden',
                                        backgroundColor: 'var(--muted)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : account.id)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '0.75rem 1rem',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                color: 'inherit',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    backgroundColor: account.brandColor || 'var(--brand)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {account.name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600 }}>{account.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                    <MapPin size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {county} · <Bug size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {suggestedPest} · <span style={{ fontWeight: 500 }}>{tone}</span>
                                                </div>
                                            </div>
                                            {content && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                                        </button>
                                        {content?.postId && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTogglePosted(account.id); }}
                                                disabled={togglingId === account.id}
                                                title={content.status === 'Posted' ? 'Mark as not posted' : 'Mark as posted'}
                                                style={{
                                                    padding: '0.5rem',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: togglingId === account.id ? 'wait' : 'pointer',
                                                    color: content.status === 'Posted' ? 'var(--status-posted)' : 'var(--muted-foreground)',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {content.status === 'Posted' ? (
                                                    <CheckCircle2 size={24} fill="var(--status-posted)" />
                                                ) : (
                                                    <Circle size={24} />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {content && isExpanded && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: 4 }}>Content idea</div>
                                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{content.title}</div>
                                                <div style={{ fontSize: '0.875rem', fontStyle: 'italic', marginBottom: 4 }}>{content.hook}</div>
                                                <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{content.caption}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: 4 }}>Canva design recipe</div>
                                                <div
                                                    style={{
                                                        padding: '0.75rem',
                                                        backgroundColor: 'white',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '0.875rem',
                                                        color: '#0f172a',
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: 1.5
                                                    }}
                                                >
                                                    {content.canvaInstruction}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
