import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Copy, Check, Send, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useStore } from '../../store';

const Invitations = () => {
    const { db, addInvitation, refreshData } = useStore();
    const [copied, setCopied] = useState(null);
    const [selectedExam, setSelectedExam] = useState(db.exams[0]?.id || '');
    const [isMultiUse, setIsMultiUse] = useState(false);
    const [testType, setTestType] = useState('internal');
    const [requireCamera, setRequireCamera] = useState(true);
    const [requireMicrophone, setRequireMicrophone] = useState(true);
    const [selectedCandidates, setSelectedCandidates] = useState([]); // Array for multi-select
    const [assignToCandidate, setAssignToCandidate] = useState(false);
    const [showCandidatesId, setShowCandidatesId] = useState(null); // For "Show Candidates" toggle
    const [loading, setLoading] = useState(false);

    // Auto-select first exam when exams are loaded
    React.useEffect(() => {
        if (!selectedExam && db.exams.length > 0) {
            setSelectedExam(db.exams[0].id);
        }
    }, [db.exams]);

    const generateInvite = async () => {
        if (!selectedExam) {
            alert("Please select an exam first.");
            return;
        }
        try {
            setLoading(true);
            await addInvitation({
                exam_id: selectedExam,
                candidate_ids: assignToCandidate ? selectedCandidates : [],
                is_multi_use: isMultiUse,
                test_type: testType,
                require_camera: requireCamera,
                require_microphone: requireMicrophone
            });
            setSelectedCandidates([]);
            setAssignToCandidate(false);
            refreshData();
        } catch (err) {
            console.error("Error generating invite:", err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text, id) => {
        const link = `${window.location.origin}/exam/${text}`;
        navigator.clipboard.writeText(link);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDeleteInvite = async (id) => {
        if (window.confirm('Delete this invitation?')) {
            try {
                const { invitationAPI } = await import('../../services/api');
                await invitationAPI.delete(id);
                refreshData();
            } catch (err) {
                console.error("Error deleting invite:", err);
            }
        }
    };

    return (
        <div className="fade-in performance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Create Invitation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="admin-header" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>Invite Candidates</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate secure, one-time assessment links.</p>
                </div>

                <div className="glass card" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem' }}>Select Target Exam</label>
                        <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} style={{ fontSize: '0.9rem' }}>
                            {db.exams.map(exam => (
                                <option key={exam.id} value={exam.id}>{exam.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem' }}>Link Usage Type</label>
                        <select value={isMultiUse ? 'multiple' : 'single'} onChange={(e) => setIsMultiUse(e.target.value === 'multiple')} style={{ fontSize: '0.9rem' }}>
                            <option value="single">Single Use (Expiry 1 entry)</option>
                            <option value="multiple">Multiple Use (Shared link)</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                            <input
                                type="checkbox"
                                id="assignCandidate"
                                checked={assignToCandidate}
                                onChange={(e) => setAssignToCandidate(e.target.checked)}
                                style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                            />
                            <label htmlFor="assignCandidate" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}>
                                Assign to Registered Candidate(s)
                            </label>
                        </div>

                        {assignToCandidate && (
                            <div style={{ marginTop: '0.75rem' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {isMultiUse ? "Select Multiple (Ctrl/Cmd click)" : "Select One Candidate"}
                                </label>
                                <select
                                    multiple={isMultiUse}
                                    value={isMultiUse ? selectedCandidates : (selectedCandidates[0] || '')}
                                    onChange={(e) => {
                                        if (isMultiUse) {
                                            const values = Array.from(e.target.selectedOptions, option => option.value);
                                            setSelectedCandidates(values);
                                        } else {
                                            setSelectedCandidates([e.target.value]);
                                        }
                                    }}
                                    style={{ height: isMultiUse ? '100px' : 'auto', fontSize: '0.85rem' }}
                                >
                                    {!isMultiUse && <option value="">Choose a candidate...</option>}
                                    {db.candidates
                                        .filter(c => !db.invitations.some(i => (i.candidate_id === c.id || (i.Candidates && i.Candidates.some(ic => ic.id === c.id)))))
                                        .map(candidate => (
                                            <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.email})</option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem' }}>Exam Type</label>
                        <select value={testType} onChange={(e) => setTestType(e.target.value)} style={{ fontSize: '0.9rem' }}>
                            <option value="internal">Internal (Quick Config)</option>
                            <option value="external">External (Strict Proctoring)</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', marginBottom: '0.4rem', display: 'block' }}>Camera</label>
                            <button
                                className={requireCamera ? "primary" : "secondary"}
                                onClick={() => setRequireCamera(!requireCamera)}
                                style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }}
                            >
                                {requireCamera ? "Active" : "Off"}
                            </button>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.7rem', marginBottom: '0.4rem', display: 'block' }}>Mic</label>
                            <button
                                className={requireMicrophone ? "primary" : "secondary"}
                                onClick={() => setRequireMicrophone(!requireMicrophone)}
                                style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }}
                            >
                                {requireMicrophone ? "Active" : "Off"}
                            </button>
                        </div>
                    </div>

                    <button className="primary" onClick={generateInvite} style={{ width: '100%', fontSize: '0.9rem', padding: '0.75rem' }} disabled={loading}>
                        <UserPlus size={18} /> {loading ? 'Wait...' : 'Generate Invite'}
                    </button>
                </div>

                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <Send size={16} color="var(--primary)" /> How it works
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                        Links are unique and valid for one attempt. Share via email/chat. Once submitted, it links to their profile.
                    </p>
                </div>
            </div>

            {/* Invitations List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Invitations</h3>
                    <span style={{ fontSize: '0.7rem', background: 'var(--glass-bg)', padding: '0.2rem 0.6rem', borderRadius: '1rem', color: 'var(--text-muted)' }}>
                        {db.invitations.length} Total
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {db.invitations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No invitations generated yet.
                        </div>
                    ) : db.invitations.slice().reverse().map((invite) => {
                        const exam = db.exams.find(e => e.id === invite.exam_id);
                        const isExpired = invite.status === 'pending' && (new Date() - new Date(invite.createdAt)) / (1000 * 60 * 60) > 8;
                        const displayStatus = isExpired ? 'EXPIRED' : invite.status.toUpperCase();
                        const statusColor = isExpired ? 'var(--danger)' : (invite.status === 'used' ? 'var(--accent)' : 'var(--warning)');

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={invite.id}
                                className="glass"
                                style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam?.title}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                            {new Date(invite.createdAt).toLocaleDateString()} at {new Date(invite.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '600', marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span>{invite.is_multi_use ? 'Multi' : (invite.candidate_id || (invite.Candidates && invite.Candidates.length > 0) ? 'Assigned' : 'Single')}</span>
                                            <span>•</span>
                                            <span style={{ color: invite.test_type === 'external' ? 'var(--accent)' : 'var(--warning)' }}>
                                                {invite.test_type?.toUpperCase()}
                                            </span>

                                            {(invite.Candidate || (invite.Candidates && invite.Candidates.length > 0)) && (
                                                <>
                                                    <span>•</span>
                                                    <button
                                                        onClick={() => setShowCandidatesId(showCandidatesId === invite.id ? null : invite.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--accent)',
                                                            padding: 0,
                                                            fontSize: '0.6rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline'
                                                        }}
                                                    >
                                                        {showCandidatesId === invite.id ? 'Hide' : 'Show'}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {showCandidatesId === invite.id && (
                                            <div className="glass" style={{ marginTop: '0.5rem', padding: '0.6rem', fontSize: '0.65rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.05)' }}>
                                                {invite.Candidates && invite.Candidates.length > 0 ? (
                                                    invite.Candidates.map(c => (
                                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem', marginBottom: '0.2rem' }}>
                                                            <span>{c.name}</span>
                                                            <span style={{ opacity: 0.6 }}>{c.email}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    invite.Candidate && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{invite.Candidate.name}</span>
                                                            <span style={{ opacity: 0.6 }}>{invite.Candidate.email}</span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: '0.6rem',
                                        fontWeight: '700',
                                        padding: '0.15rem 0.35rem',
                                        borderRadius: '4px',
                                        background: statusColor,
                                        color: 'white',
                                        flexShrink: 0
                                    }}>
                                        {displayStatus}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <div className="glass" style={{ flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                        {invite.token}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(invite.token, invite.id)}
                                        className="secondary"
                                        style={{ padding: '0.45rem', borderRadius: '0.5rem' }}
                                    >
                                        {copied === invite.id ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteInvite(invite.id)}
                                        className="secondary"
                                        style={{ padding: '0.45rem', borderRadius: '0.5rem', color: 'var(--danger)' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Invitations;
