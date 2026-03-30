import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle, User, Book, Clock, BarChart3, Info } from 'lucide-react';
import { attemptAPI } from '../../services/api';

const CandidateResultView = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await attemptAPI.getById(attemptId);
                setAttempt(response.data);
            } catch (err) {
                console.error("Error fetching results:", err);
                setError('Failed to load candidate results. The attempt may not exist or responses weren\'t stored.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [attemptId]);

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading evaluation details...</div>;
    if (error) return (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="glass card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <Info size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                <h3>Error Loading Results</h3>
                <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>{error}</p>
                <button className="primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        </div>
    );

    const { Candidate: candidate, Exam: exam } = attempt;
    const responses = attempt.responses || {};
    // Filter questions to only show those the candidate actually received (present in responses)
    const questions = (exam?.Questions || []).filter(q =>
        Object.prototype.hasOwnProperty.call(responses, q.id)
    );

    const getStatusColor = (percentage) => {
        if (percentage >= 90) return 'var(--accent)';
        if (percentage >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '4rem' }}>
            {/* Header */}
            <div className="admin-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="glass"
                    style={{ padding: '0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)', margin: 0 }}>Performance Analysis</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Detailed breakdown of candidate responses and evaluation.</p>
                </div>
            </div>

            <div className="performance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
                {/* Left Side: Question Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {questions.length === 0 ? (
                        <div className="glass card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <HelpCircle size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                            <p>No question data available for this attempt snapshot.</p>
                        </div>
                    ) : (
                        questions.map((q, idx) => {
                            const candidateAnswer = responses[q.id];
                            const isMCQ = q.type === 'mcq' || !q.type;
                            const isCorrect = isMCQ
                                ? candidateAnswer == q.correct_answer
                                : (q.type === 'fill_in_the_blank'
                                    ? candidateAnswer?.toLowerCase()?.trim() === q.correct_answer?.toLowerCase()?.trim()
                                    : false 
                                );

                            const isText = q.type === 'text';
                            let textStatus = 'pending';
                            if (isText && candidateAnswer) {
                                const matchedKeywords = q.keywords?.filter(k => candidateAnswer.toLowerCase().includes(k.toLowerCase())) || [];
                                textStatus = matchedKeywords.length >= 3 ? 'accepted' : 'rejected';
                            }

                            return (
                                <div key={q.id} className="glass card" style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', borderLeft: `4px solid ${isMCQ || q.type === 'fill_in_the_blank' ? (isCorrect ? 'var(--accent)' : 'var(--danger)') : (textStatus === 'accepted' ? 'var(--accent)' : 'var(--danger)')}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                                            Question {idx + 1} • {q.type?.replace('_', ' ').toUpperCase() || 'MCQ'}
                                        </span>
                                        {isText ? (
                                            <span style={{ color: textStatus === 'accepted' ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem', fontWeight: '700' }}>
                                                {textStatus.toUpperCase()}
                                            </span>
                                        ) : (
                                            <span style={{ color: isCorrect ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem', fontWeight: '700' }}>
                                                {isCorrect ? 'CORRECT' : 'INCORRECT'}
                                            </span>
                                        )}
                                    </div>
                                    <h4 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>{q.text}</h4>

                                    <div className="performance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Candidate's Response:</p>
                                            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: (isMCQ || q.type === 'fill_in_the_blank') ? (isCorrect ? 'var(--accent)' : 'var(--danger)') : 'white', wordBreak: 'break-word' }}>
                                                {isMCQ
                                                    ? (candidateAnswer !== undefined && candidateAnswer !== null ? q.options[candidateAnswer] : 'No response')
                                                    : (candidateAnswer || 'No response')
                                                }
                                            </p>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Correct Reference:</p>
                                            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--accent)', wordBreak: 'break-word' }}>
                                                {isMCQ ? q.options[q.correct_answer] : (isText ? `Keywords: ${q.keywords?.slice(0, 3).join(', ')}...` : q.correct_answer)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Side: Score Summary */}
                <div style={{ position: 'sticky', top: '1rem', alignSelf: 'start' }}>
                    <div className="glass card" style={{ padding: '1.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                margin: '0 auto 1.25rem',
                                borderRadius: '50%',
                                border: `6px solid ${getStatusColor(attempt.percentage)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 0 15px -5px ${getStatusColor(attempt.percentage)}`
                            }}>
                                <span style={{ fontSize: '1.75rem', fontWeight: '800' }}>{Math.round(attempt.percentage)}%</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>SCORE</span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem' }}>{candidate?.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{candidate?.email}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                                    <Book size={16} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Assessment</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam?.title}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: 'var(--accent)' }}>
                                    <BarChart3 size={16} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Raw Score</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: 0 }}>{attempt.score} / {attempt.total_questions}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', color: 'var(--warning)' }}>
                                    <Clock size={16} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Completed On</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new Date(attempt.completed_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: attempt.percentage >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '0.8rem', textAlign: 'center', border: `1px solid ${attempt.percentage >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                            <p style={{ fontWeight: '700', color: attempt.percentage >= 90 ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem', letterSpacing: '0.5px', margin: 0 }}>
                                {attempt.percentage >= 90 ? 'RECO. FOR PROCEEDING' : 'THRESHOLD NOT MET'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default CandidateResultView;
