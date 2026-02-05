import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';
import useTabVisibility from '../../hooks/useTabVisibility';
import { examAPI, attemptAPI } from '../../services/api';

const TestInterface = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { db } = useStore();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptId, setAttemptId] = useState(null);

    // Prevent back button
    useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Load Exam and Initialize Attempt
    useEffect(() => {
        const initializeTest = async () => {
            const candidate = JSON.parse(sessionStorage.getItem('current_candidate'));
            const attempt = JSON.parse(sessionStorage.getItem('current_attempt'));

            if (!candidate || !attempt) {
                navigate(`/exam/${token}`);
                return;
            }

            try {
                // Fetch both exam and questions for this candidate from backend using the token
                const { invitationAPI } = await import('../../services/api');
                const response = await invitationAPI.getAssessmentData(token);
                const assessmentData = response.data; // This is the Exam object with Questions included

                setExam(assessmentData);
                setQuestions(assessmentData.Questions || []);
                setTimeLeft(assessmentData.duration_minutes * 60);
                setAttemptId(attempt.id);
            } catch (err) {
                console.error("Test initialization error:", err);
                navigate(`/exam/${token}`);
            }
        };

        initializeTest();
    }, [token, navigate, db.exams]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0 || isSubmitting) {
            if (timeLeft === 0 && exam) handleSubmit();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isSubmitting, exam]);

    // Anti-Cheating Handler
    const onViolation = useCallback((count) => {
        if (isSubmitting) return;

        if (count === 1) {
            setShowWarning(true);
        } else if (count >= 2) {
            handleSubmit('Auto-submitted due to security violation');
        }
    }, [isSubmitting]);

    useTabVisibility(onViolation);

    const handleAnswerSelect = (questionId, optionIndex) => {
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const handleSubmit = async (reason = 'Normal submission') => {
        if (isSubmitting || !attemptId) return;
        setIsSubmitting(true);

        // Calculate Score
        let score = 0;
        questions.forEach(q => {
            if (q.type === 'text') {
                const answer = (answers[q.id] || '').toLowerCase();
                const matchedKeywords = q.keywords.filter(keyword =>
                    answer.includes(keyword.toLowerCase())
                );
                // Mark correct if matches 3 to 5 keywords (as requested)
                if (matchedKeywords.length >= 3) {
                    score++;
                }
            } else {
                if (answers[q.id] === q.correct_answer) {
                    score++;
                }
            }
        });

        const results = {
            score,
            total_questions: questions.length,
            percentage: questions.length > 0 ? (score / questions.length) * 100 : 0
        };

        try {
            // Submit attempt to backend
            await attemptAPI.submit(attemptId, results);

            sessionStorage.setItem('last_result', JSON.stringify({
                ...results,
                submissionType: reason
            }));

            navigate(`/exam/${token}/success`, { replace: true });
        } catch (err) {
            console.error("Submission error:", err);
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!exam || questions.length === 0) return null;

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <header className="glass container" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 10 }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem' }}>{exam.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '0.5rem 1.25rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: timeLeft < 60 ? '1px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                        <Clock size={20} color={timeLeft < 60 ? 'var(--danger)' : 'var(--primary)'} />
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: timeLeft < 60 ? 'var(--danger)' : 'white' }}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <button className="primary" onClick={() => handleSubmit()}>Submit Test</button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <div className="card glass fade-in" style={{ padding: '3rem' }}>
                        <h2 style={{ marginBottom: '2.5rem', lineHeight: '1.4' }}>{currentQuestion.text}</h2>

                        {currentQuestion.type === 'text' ? (
                            <div className="fade-in">
                                <label style={{ marginBottom: '1rem', display: 'block', color: 'var(--text-muted)' }}>Enter your answer below:</label>
                                <textarea
                                    rows={6}
                                    placeholder="Type your response here..."
                                    value={answers[currentQuestion.id] || ''}
                                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '1.5rem',
                                        borderRadius: '1rem',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        fontSize: '1.1rem',
                                        lineHeight: '1.6',
                                        resize: 'none',
                                        transition: 'all 0.3s ease',
                                    }}
                                    onFocus={(e) => e.target.style.border = '2px solid var(--primary)'}
                                    onBlur={(e) => e.target.style.border = '1px solid var(--glass-border)'}
                                />
                                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Tip: Ensure your answer includes key terminology related to the question.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {currentQuestion.options.map((option, idx) => {
                                    const isSelected = answers[currentQuestion.id] === idx;
                                    return (
                                        <motion.div
                                            key={idx}
                                            whileHover={{ x: 5 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleAnswerSelect(currentQuestion.id, idx)}
                                            className="glass"
                                            style={{
                                                padding: '1.25rem 1.5rem',
                                                borderRadius: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.25rem',
                                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: isSelected ? '6px solid var(--primary)' : '2px solid var(--glass-border)',
                                                background: 'transparent'
                                            }}></div>
                                            <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? '600' : '400' }}>{option}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            className="secondary"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                        >
                            <ChevronLeft size={20} /> Previous
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {questions.map((_, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: currentQuestionIndex === idx ? 'var(--primary)' : 'var(--glass-border)'
                                    }}
                                />
                            ))}
                        </div>

                        {isLastQuestion ? (
                            <button className="primary" onClick={() => handleSubmit()} style={{ background: 'var(--accent)' }}>
                                Final Submission <Send size={18} style={{ marginLeft: '0.5rem' }} />
                            </button>
                        ) : (
                            <button className="secondary" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                                Next Question <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} />
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* Warning Overlay */}
            <AnimatePresence>
                {showWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 100, padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass card"
                            style={{ maxWidth: '450px', textAlign: 'center', border: '1px solid var(--warning)' }}
                        >
                            <AlertTriangle size={64} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>Security Warning!</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                                You have switched away from the examination window. This is strictly prohibited.
                                <br /><br />
                                <strong>Note:</strong> A second violation will result in an <strong>immediate automatic submission</strong> of your test.
                            </p>
                            <button className="primary" style={{ background: 'var(--warning)', width: '100%' }} onClick={() => setShowWarning(false)}>
                                I Understand, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-Submit Overlay */}
            <AnimatePresence>
                {isSubmitting && timeLeft > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 200
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div className="gradient-bg" style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <AlertCircle color="white" size={40} className="spin" />
                            </div>
                            <h2>Submitting Your Responses...</h2>
                            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Please do not close this window.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TestInterface;
