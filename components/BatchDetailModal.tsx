"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Bug, Sparkles, ImagePlus, Loader2, CheckCircle2, Circle, Copy, Check } from 'lucide-react';
import styles from './BatchDetailModal.module.css';
import { CalendarBatch, TodayBatchProfile } from '@/lib/rotation-engine';
import { generateBatchContent, fetchSavedBatchContent, togglePostPosted, uploadBatchImage } from '@/app/actions';

interface BatchDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: CalendarBatch | null;
}

interface ProfileContent {
    postId: string;
    title: string;
    hook: string;
    caption: string;
    canvaInstruction: string;
    status: 'Draft' | 'Posted';
    imagePath?: string;
    imageVersion?: number;
}

export default function BatchDetailModal({ isOpen, onClose, batch }: BatchDetailModalProps) {
    const [contentByProfile, setContentByProfile] = useState<Record<string, ProfileContent>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [copiedContentId, setCopiedContentId] = useState<string | null>(null);
    const [copiedRecipeId, setCopiedRecipeId] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        if (!isOpen || !batch) {
            setContentByProfile({});
            setSelectedAccountId(null);
            return;
        }

        const accountIds = batch.profiles.map(p => p.account.id);
        const date = batch.date;

        fetchSavedBatchContent(accountIds, date).then((saved: any) => {
            if (Object.keys(saved).length > 0) {
                setContentByProfile(saved as Record<string, ProfileContent>);
                setSelectedAccountId(batch.profiles[0]?.account.id ?? null);
            }
        });
    }, [isOpen, batch]);

    if (!isOpen || !batch) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).hasAttribute('data-backdrop')) {
            onClose();
        }
    };

    const handleCopy = (text: string, type: 'content' | 'recipe') => {
        navigator.clipboard.writeText(text);
        const setter = type === 'content' ? setCopiedContentId : setCopiedRecipeId;
        setter('copied');
        setTimeout(() => setter(null), 2000);
    };

    const handleGenerateContent = async () => {
        if (!batch) return;
        setIsGenerating(true);
        try {
            const profilesForGen = batch.profiles.map(p => ({
                accountId: p.account.id,
                accountName: p.account.name,
                accountLocation: p.account.location,
                suggestedPest: p.suggestedPest,
                tone: p.tone,
                slot: p.slot
            }));

            const results = await generateBatchContent(profilesForGen, batch.date);

            const newContent: Record<string, ProfileContent> = {};
            results.forEach(r => {
                newContent[r.accountId] = {
                    postId: r.postId,
                    title: r.title,
                    hook: r.hook,
                    caption: r.caption,
                    canvaInstruction: r.canvaInstruction,
                    status: 'Draft'
                };
            });

            setContentByProfile(newContent);
            if (batch.profiles.length > 0) {
                setSelectedAccountId(batch.profiles[0].account.id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTogglePosted = async (accountId: string) => {
        const currentContent = contentByProfile[accountId];
        if (!currentContent) return;

        setTogglingId(accountId);
        try {
            const result = await togglePostPosted(currentContent.postId);
            setContentByProfile(prev => ({
                ...prev,
                [accountId]: { ...prev[accountId], status: result.status as 'Draft' | 'Posted' }
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setTogglingId(null);
        }
    };

    const handleImageUpload = async (accountId: string, file: File, county: string) => {
        const content = contentByProfile[accountId];
        if (!content) return;

        setUploadingId(accountId);
        try {
            const result = await uploadBatchImage(content.postId, file, accountId, county);
            if (result.success && result.path) {
                setContentByProfile(prev => ({
                    ...prev,
                    [accountId]: {
                        ...prev[accountId],
                        imagePath: result.path,
                        imageVersion: (prev[accountId].imageVersion || 0) + 1
                    }
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploadingId(null);
        }
    };

    const getImageSrc = (path: string) => {
        if (path.startsWith('http')) return path;
        return path;
    };

    const selectedProfile = batch.profiles.find(p => p.account.id === selectedAccountId);
    const selectedContent = selectedAccountId ? contentByProfile[selectedAccountId] : null;

    return (
        <div className={styles.overlay} onClick={handleBackdropClick} data-backdrop>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.splitLayout}>
                    {/* Sidebar Navigation */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <div className={styles.sidebarTitle}>Batch Profiles</div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>{batch.profiles.length} Total</div>
                        </div>
                        <div className={styles.sidebarContent}>
                            {batch.profiles.map(({ account }: TodayBatchProfile) => {
                                const content = contentByProfile[account.id];
                                const isSelected = selectedAccountId === account.id;
                                const isCompleted = content?.status === 'Posted' || content?.imagePath;

                                return (
                                    <button
                                        key={account.id}
                                        onClick={() => setSelectedAccountId(account.id)}
                                        className={`${styles.accountNavItem} ${isSelected ? styles.selected : ''}`}
                                    >
                                        <div className={styles.navAvatar} style={{ backgroundColor: account.brandColor || 'var(--brand)' }}>
                                            {account.name.charAt(0)}
                                        </div>
                                        <div className={styles.navAccountName} style={{ fontSize: '0.75rem', fontWeight: 500 }}>{account.name}</div>
                                        <div className={`${styles.statusIndicator} ${isCompleted ? styles.completed : ''}`}>
                                            {isCompleted ? <CheckCircle2 size={14} fill="currentColor" /> : <Circle size={14} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Main Workspace */}
                    <main className={styles.mainWorkspace}>
                        <div className={styles.header}>
                            <div>
                                <div className={styles.dateKicker}>
                                    {new Date(batch.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </div>
                                <h3 className={styles.title}>
                                    {selectedProfile ? selectedProfile.account.name : 'Select a profile'}
                                </h3>
                            </div>
                            <button onClick={onClose} className={styles.closeButton}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            {!selectedContent && !isGenerating && (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                    <div style={{ background: 'var(--muted)', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px dashed var(--border)', maxWidth: '400px', margin: '0 auto' }}>
                                        < Sparkles size={32} style={{ color: 'var(--brand)', marginBottom: '1rem', opacity: 0.5 }} />
                                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>No content generated</h4>
                                        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>Start the workflow by generating content for this batch.</p>
                                        <button
                                            onClick={handleGenerateContent}
                                            disabled={isGenerating}
                                            className={styles.generateButton}
                                            style={{ maxWidth: '300px', margin: '0 auto' }}
                                        >
                                            <Sparkles size={16} />
                                            {isGenerating ? 'Generating...' : 'Generate Batch Content'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isGenerating && (
                                <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)', margin: '0 auto 1rem' }} />
                                    <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>Generating professional content...</p>
                                </div>
                            )}

                            {selectedProfile && selectedContent && (
                                <div className={styles.workspaceLayout}>
                                    {/* Primary Content Column */}
                                    <div className={styles.primaryColumn}>
                                        <div className={styles.detailSection}>
                                            <div className={styles.sectionHeader}>
                                                <div className={styles.sectionLabel}>AI Content Strategy</div>
                                                <button
                                                    className={`${styles.copyButton} ${copiedContentId ? styles.copied : ''}`}
                                                    onClick={() => handleCopy(`${selectedContent.title}\n\n${selectedContent.hook}\n\n${selectedContent.caption}`, 'content')}
                                                >
                                                    {copiedContentId ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Strategy</>}
                                                </button>
                                            </div>
                                            <div style={{ padding: '0.25rem 0' }}>
                                                <div className={styles.contentTitle}>{selectedContent.title}</div>
                                                <div className={styles.contentHook}>{selectedContent.hook}</div>
                                                <div className={styles.contentBody}>{selectedContent.caption}</div>
                                            </div>
                                        </div>

                                        <div className={styles.detailSection}>
                                            <div className={styles.sectionHeader}>
                                                <div className={styles.sectionLabel}>Canva Design Recipe</div>
                                                <button
                                                    className={`${styles.copyButton} ${copiedRecipeId ? styles.copied : ''}`}
                                                    onClick={() => handleCopy(selectedContent.canvaInstruction, 'recipe')}
                                                >
                                                    {copiedRecipeId ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Recipe</>}
                                                </button>
                                            </div>
                                            <div className={styles.recipeBox}>
                                                {selectedContent.canvaInstruction}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Workspace Sidebar / Control Panel */}
                                    <aside className={styles.controlPanel}>
                                        <div className={styles.detailSection}>
                                            <div className={styles.sectionLabel}>Metadata</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div className={`${styles.toneBadge} ${styles[selectedProfile.tone.toLowerCase()] || ''}`} style={{ alignSelf: 'flex-start', fontSize: '0.625rem', padding: '0.2rem 0.5rem' }}>
                                                    {selectedProfile.tone}
                                                </div>
                                                <div className={styles.metaItem} style={{ fontSize: '0.8125rem' }}>
                                                    <MapPin size={12} className={styles.metaIcon} />
                                                    <span style={{ fontWeight: 600 }}>{selectedProfile.county}</span>
                                                </div>
                                                <div className={styles.metaItem} style={{ fontSize: '0.8125rem' }}>
                                                    <Bug size={12} className={styles.metaIcon} />
                                                    <span className={styles.pestText}>{selectedProfile.suggestedPest}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.detailSection}>
                                            <div className={styles.sectionLabel}>Status</div>
                                            <button
                                                onClick={() => handleTogglePosted(selectedProfile.account.id)}
                                                disabled={togglingId === selectedProfile.account.id}
                                                className={styles.statusButton}
                                                style={{
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '0.5rem',
                                                    width: '100%',
                                                    backgroundColor: selectedContent.status === 'Posted' ? 'var(--status-posted-bg)' : 'var(--background)',
                                                    color: selectedContent.status === 'Posted' ? 'var(--status-posted)' : 'var(--foreground)',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {selectedContent.status === 'Posted' ? (
                                                    <><CheckCircle2 size={14} fill="currentColor" style={{ marginRight: '6px' }} /> Posted</>
                                                ) : (
                                                    <><Circle size={14} style={{ marginRight: '6px' }} /> Mark as Posted</>
                                                )}
                                            </button>
                                        </div>

                                        <div className={styles.detailSection}>
                                            <div className={styles.sectionLabel}>Job Output</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {selectedContent.imagePath && (
                                                    <img
                                                        src={getImageSrc(selectedContent.imagePath) + (selectedContent.imageVersion ? `?v=${selectedContent.imageVersion}` : '')}
                                                        alt="Job output"
                                                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                                                    />
                                                )}
                                                <label className={`${styles.imageUploadBtn} ${uploadingId === selectedProfile.account.id ? styles.disabled : ''}`} style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.75rem' }}>
                                                    <input
                                                        ref={(el) => { fileInputRefs.current[selectedProfile.account.id] = el; }}
                                                        type="file"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (f) handleImageUpload(selectedProfile.account.id, f, selectedProfile.county);
                                                            e.target.value = '';
                                                        }}
                                                        disabled={uploadingId === selectedProfile.account.id}
                                                    />
                                                    {uploadingId === selectedProfile.account.id ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                                                    {selectedContent.imagePath ? 'Replace Image' : 'Upload Image'}
                                                </label>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
