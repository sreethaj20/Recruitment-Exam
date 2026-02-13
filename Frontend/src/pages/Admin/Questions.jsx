import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle, Plus, Edit2, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';

const Questions = () => {
    const location = useLocation();
    const { db, addQuestion, refreshData } = useStore();
    const [selectedExam, setSelectedExam] = useState(location.state?.selectedExamId || db.exams[0]?.id || '');
    const [expandedId, setExpandedId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredQuestions, setFilteredQuestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        keywords: '',
        exam_id: selectedExam
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

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.text.trim() || !formData.exam_id) {
            alert("Please ensure a question text is entered and an exam is selected.");
            return;
        }

        try {
            await addQuestion(formData);
            setShowModal(false);
            setFormData({
                text: '',
                type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: 0,
                keywords: '',
                exam_id: selectedExam
            });
            fetchQuestions(selectedExam);
            refreshData(); // To update the question count in exams list
        } catch (err) {
            console.error("Error adding question:", err);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2>Question Bank</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage assessment questions and correct answers.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        style={{ width: '250px' }}
                    >
                        {db.exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                    <button className="primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Add Question
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredQuestions.length === 0 ? (
                    <div className="glass card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <HelpCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No questions found for this exam.</p>
                        <button className="secondary" style={{ marginTop: '1rem' }}>Create First Question</button>
                    </div>
                ) : filteredQuestions.map((q, idx) => (
                    <div key={q.id} className="glass" style={{ borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer' }}
                        >
                            <div className="gradient-bg" style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>
                                {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>{q.text}</div>
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                                    <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                        {q.type?.toUpperCase() || 'MCQ'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="secondary" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }}><Trash2 size={16} /></button>
                                <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                                    {expandedId === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>

                        {expandedId === q.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                style={{ padding: '0 1.5rem 1.5rem 4.5rem' }}
                            >
                                {q.type === 'text' ? (
                                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Keywords for Grading (Min 3-5 Match):</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {q.keywords?.map((k, kIdx) => (
                                                <span key={kIdx} style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontSize: '0.8rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {q.options.map((option, optIdx) => (
                                                <div
                                                    key={optIdx}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '0.75rem',
                                                        background: optIdx === q.correct_answer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                                        border: optIdx === q.correct_answer ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        border: '2px solid',
                                                        borderColor: optIdx === q.correct_answer ? 'var(--accent)' : 'var(--text-muted)',
                                                        background: optIdx === q.correct_answer ? 'var(--accent)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {optIdx === q.correct_answer && <CheckCircle size={12} color="white" />}
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem', color: optIdx === q.correct_answer ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                        {option}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass card"
                        style={{ maxWidth: '600px', width: '90%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <h3>Add New Question</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Create a multiple-choice question for the selected exam.</p>

                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label>Question Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="mcq">Multiple Choice (MCQ)</option>
                                    <option value="text">Text Response (Keyword Graded)</option>
                                </select>
                            </div>

                            <div>
                                <label>Question Text</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Enter your question here..."
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                />
                            </div>

                            {formData.type === 'mcq' ? (
                                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label>Options (Mark the correct answer)</label>
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input
                                                type="radio"
                                                name="correct_answer"
                                                checked={formData.correct_answer === idx}
                                                onChange={() => setFormData({ ...formData, correct_answer: idx })}
                                                style={{ width: '20px', cursor: 'pointer' }}
                                            />
                                            <input
                                                required
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => updateOption(idx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="fade-in">
                                    <label>Target Keywords (Comma separated)</label>
                                    <input
                                        required
                                        placeholder="e.g. react, hooks, virtual dom, component, state"
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Candidate must match at least 3-5 of these keywords for a correct mark.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary" style={{ flex: 1 }}>Add to Bank</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Questions;
