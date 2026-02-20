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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="glass"
                    style={{ padding: '0.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 style={{ fontSize: '2rem' }}>Performance Analysis</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Detailed breakdown of candidate responses and evaluation.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
                {/* Left Side: Question Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {questions.length === 0 ? (
                        <div className="glass card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <HelpCircle size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
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
                                    : false // Manual/Subjective logic would go here if needed
                                );

                            // Special display for text/subjective if responses exist
                            const isText = q.type === 'text';
                            let textStatus = 'pending';
                            if (isText && candidateAnswer) {
                                const matchedKeywords = q.keywords?.filter(k => candidateAnswer.toLowerCase().includes(k.toLowerCase())) || [];
                                textStatus = matchedKeywords.length >= 3 ? 'accepted' : 'rejected';
                            }

                            return (
                                <div key={q.id} className="glass card" style={{ padding: '2rem', borderLeft: `4px solid ${isMCQ || q.type === 'fill_in_the_blank' ? (isCorrect ? 'var(--accent)' : 'var(--danger)') : (textStatus === 'accepted' ? 'var(--accent)' : 'var(--danger)')}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                                            Question {idx + 1} • {q.type?.replace('_', ' ').toUpperCase() || 'MCQ'}
                                        </span>
                                        {isText ? (
                                            <span style={{ color: textStatus === 'accepted' ? 'var(--accent)' : 'var(--danger)', fontSize: '0.8rem', fontWeight: '700' }}>
                                                {textStatus.toUpperCase()} ({q.keywords?.filter(k => candidateAnswer?.toLowerCase().includes(k.toLowerCase())).length || 0} Keywords Matched)
                                            </span>
                                        ) : (
                                            <span style={{ color: isCorrect ? 'var(--accent)' : 'var(--danger)', fontSize: '0.8rem', fontWeight: '700' }}>
                                                {isCorrect ? 'CORRECT' : 'INCORRECT'}
                                            </span>
                                        )}
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{q.text}</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Candidate's Response:</p>
                                            <p style={{ fontWeight: '600', color: (isMCQ || q.type === 'fill_in_the_blank') ? (isCorrect ? 'var(--accent)' : 'var(--danger)') : 'white' }}>
                                                {isMCQ
                                                    ? (candidateAnswer !== undefined && candidateAnswer !== null ? q.options[candidateAnswer] : 'No response')
                                                    : (candidateAnswer || 'No response')
                                                }
                                            </p>
                                        </div>
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Correct Reference:</p>
                                            <p style={{ fontWeight: '600', color: 'var(--accent)' }}>
                                                {isMCQ ? q.options[q.correct_answer] : (isText ? `Keywords: ${q.keywords?.join(', ')}` : q.correct_answer)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Side: Score Summary */}
                <div style={{ position: 'sticky', top: '2rem' }}>
                    <div className="glass card" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                margin: '0 auto 1.5rem',
                                borderRadius: '50%',
                                border: `8px solid ${getStatusColor(attempt.percentage)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 0 20px -5px ${getStatusColor(attempt.percentage)}`
                            }}>
                                <span style={{ fontSize: '2rem', fontWeight: '800' }}>{Math.round(attempt.percentage)}%</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>SCORE</span>
                            </div>
                            <h3 style={{ fontSize: '1.5rem' }}>{candidate?.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{candidate?.email}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                                    <Book size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assessment</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{exam?.title}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: 'var(--accent)' }}>
                                    <BarChart3 size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Raw Score</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{attempt.score} / {attempt.total_questions} Correct</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', color: 'var(--warning)' }}>
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed On</p>
                                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{new Date(attempt.completed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: attempt.percentage >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem', textAlign: 'center', border: `1px solid ${attempt.percentage >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                            <p style={{ fontWeight: '700', color: attempt.percentage >= 90 ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem', letterSpacing: '1px' }}>
                                {attempt.percentage >= 90 ? 'RECOMMENDED FOR PROCEEDING' : 'DID NOT MEET THE THRESHOLD'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateResultView;
