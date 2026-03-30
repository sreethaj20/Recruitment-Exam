import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle, Plus, Edit2, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';

const Questions = () => {
    const location = useLocation();
    const { db, addQuestion, updateQuestion, refreshData } = useStore();
    const [selectedExam, setSelectedExam] = useState(location.state?.selectedExamId || db.exams[0]?.id || '');
    const [expandedId, setExpandedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [filteredQuestions, setFilteredQuestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        keywords: '',
        exam_id: selectedExam,
        difficulty: 'easy'
    });

    const fetchQuestions = async (examId) => {
        if (!examId) return;
        try {
            setLoading(true);
            const { examAPI } = await import('../../services/api');
            const response = await examAPI.getQuestions(examId);
            setFilteredQuestions(response.data);
        } catch (err) {
            console.error("Error fetching questions:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-select first exam when exams are loaded
    useEffect(() => {
        if (!selectedExam && db.exams.length > 0) {
            setSelectedExam(db.exams[0].id);
        }
    }, [db.exams]);

    // Update form's exam_id and fetch questions when selectedExam changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, exam_id: selectedExam }));
        fetchQuestions(selectedExam);
    }, [selectedExam]);

    const openCreateModal = () => {
        setEditingQuestion(null);
        setFormData({
            text: '',
            type: 'mcq',
            options: ['', '', '', ''],
            correct_answer: 0,
            keywords: '',
            exam_id: selectedExam,
            difficulty: 'easy'
        });
        setShowModal(true);
    };

    const openEditModal = (q) => {
        setEditingQuestion(q);
        setFormData({
            text: q.text,
            type: q.type || 'mcq',
            options: q.options || ['', '', '', ''],
            correct_answer: q.correct_answer,
            keywords: Array.isArray(q.keywords) ? q.keywords.join(', ') : (q.keywords || ''),
            exam_id: selectedExam,
            difficulty: q.difficulty || 'easy'
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.text.trim() || !formData.exam_id) {
            alert("Please ensure a question text is entered and an exam is selected.");
            return;
        }

        try {
            if (editingQuestion) {
                await updateQuestion(editingQuestion.id, formData);
            } else {
                await addQuestion(formData);
            }
            setShowModal(false);
            setEditingQuestion(null);
            setFormData({
                text: '',
                type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: 0,
                keywords: '',
                exam_id: selectedExam,
                difficulty: 'easy'
            });
            fetchQuestions(selectedExam);
            refreshData(); // To update the question count in exams list
        } catch (err) {
            console.error("Error saving question:", err);
        }
    };

    const updateOption = (idx, value) => {
        const newOptions = [...formData.options];
        newOptions[idx] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const handleDeleteQuestion = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                const { examAPI } = await import('../../services/api');
                await examAPI.deleteQuestion(id);
                fetchQuestions(selectedExam);
                refreshData();
            } catch (err) {
                console.error("Error deleting question:", err);
            }
        }
    };

    return (
        <div className="fade-in">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>Question Bank</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage assessment questions and correct answers.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        style={{ minWidth: '200px', flex: '1 1 auto', fontSize: '0.9rem' }}
                    >
                        {db.exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                    <button className="primary" onClick={openCreateModal} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', flexShrink: 0 }}>
                        <Plus size={18} /> Add Question
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredQuestions.length === 0 ? (
                    <div className="glass card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <HelpCircle size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No questions found for this exam.</p>
                        <button className="secondary" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Create First Question</button>
                    </div>
                ) : filteredQuestions.map((q, idx) => (
                    <div key={q.id} className="glass" style={{ borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                        >
                            <div className="gradient-bg" style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', flexShrink: 0 }}>
                                {idx + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</div>
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                        {q.type?.toUpperCase() || 'MCQ'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.6rem',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '4px',
                                        background: q.difficulty === 'hard' ? 'rgba(239, 68, 68, 0.1)' : q.difficulty === 'moderate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: q.difficulty === 'hard' ? '#ef4444' : q.difficulty === 'moderate' ? '#f59e0b' : '#10b981',
                                        border: '1px solid currentColor',
                                        textTransform: 'uppercase'
                                    }}>
                                        {q.difficulty || 'easy'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--primary)' }} onClick={(e) => { e.stopPropagation(); openEditModal(q); }}><Edit2 size={14} /></button>
                                <button className="secondary" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}><Trash2 size={14} /></button>
                                <div style={{ padding: '0.4rem', color: 'var(--text-muted)' }}>
                                    {expandedId === q.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </div>
                        </div>

                        {expandedId === q.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                style={{ padding: '0 1.25rem 1.25rem' }}
                            >
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', marginLeft: '2.5rem' }}>
                                    {q.type === 'text' ? (
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Keywords for Grading:</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                {q.keywords?.map((k, kIdx) => (
                                                    <span key={kIdx} style={{ padding: '0.25rem 0.6rem', borderRadius: '2rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontSize: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                                        {k}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : q.type === 'fill_in_the_blank' ? (
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>Correct Answer:</div>
                                            <div style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '0.9rem' }}>{q.correct_answer}</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '0.75rem' }}>
                                                {q.options.map((option, optIdx) => (
                                                    <div
                                                        key={optIdx}
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '0.75rem',
                                                            background: optIdx == q.correct_answer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                                            border: optIdx == q.correct_answer ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            borderRadius: '50%',
                                                            border: '2px solid',
                                                            borderColor: optIdx == q.correct_answer ? 'var(--accent)' : 'var(--text-muted)',
                                                            background: optIdx == q.correct_answer ? 'var(--accent)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {optIdx == q.correct_answer && <CheckCircle size={10} color="white" />}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', color: optIdx == q.correct_answer ? 'var(--text-main)' : 'var(--text-muted)', lineHeight: '1.4' }}>
                                                            {option}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>
            {showModal && createPortal(
                <div className="modal-overlay" style={{ padding: '1rem' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass card"
                        style={{ maxWidth: '600px', width: '100%', padding: 'clamp(1.5rem, 5vw, 2rem)', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <h3>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{editingQuestion ? 'Modify the question details below.' : 'Create a multiple-choice question for the selected exam.'}</p>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="performance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem' }}>Question Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                        <option value="text">Text Response</option>
                                        <option value="fill_in_the_blank">Fill in the Blank</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem' }}>Difficulty Level</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem' }}>Question Text</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder={formData.type === 'fill_in_the_blank' ? "Use ________ (8 underscores) to represent the blank. E.g. The capital of France is ________." : "Enter your question here..."}
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </div>

                            {formData.type === 'mcq' ? (
                                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ fontSize: '0.85rem' }}>Options (Mark correct)</label>
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input
                                                type="radio"
                                                name="correct_answer"
                                                checked={formData.correct_answer === idx}
                                                onChange={() => setFormData({ ...formData, correct_answer: idx })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <input
                                                required
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => updateOption(idx, e.target.value)}
                                                style={{ fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : formData.type === 'text' ? (
                                <div className="fade-in">
                                    <label style={{ fontSize: '0.85rem' }}>Keywords (Comma separated)</label>
                                    <input
                                        required
                                        placeholder="e.g. react, hooks, virtual dom"
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                        Candidate must match 3-5 keywords for a correct mark.
                                    </p>
                                </div>
                            ) : (
                                <div className="fade-in">
                                    <label style={{ fontSize: '0.85rem' }}>Correct Answer</label>
                                    <input
                                        required
                                        placeholder="Enter phrase"
                                        value={typeof formData.correct_answer === 'string' ? formData.correct_answer : ''}
                                        onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                        Case-insensitive grading.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" className="secondary" style={{ flex: 1, fontSize: '0.9rem', padding: '0.6rem' }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary" style={{ flex: 1, fontSize: '0.9rem', padding: '0.6rem' }}>{editingQuestion ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Questions;
