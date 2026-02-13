import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, Clock, Users, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';

const Exams = () => {
    const navigate = useNavigate();
    const { db, addExam, updateExam, addDepartment, refreshData } = useStore();
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [customDeptName, setCustomDeptName] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        department_id: db.departments[0]?.id || '',
        candidate_type_id: db.candidateTypes[0]?.id || '',
        duration_minutes: 30,
        question_pool_size: ''
    });

    const handleDeleteExam = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam?')) {
            try {
                const { examAPI } = await import('../../services/api');
                await examAPI.delete(id);
                refreshData();
            } catch (err) {
                console.error("Error deleting exam:", err);
            }
        }
    };

    const openCreateModal = () => {
        setEditingExam(null);
        setFormData({
            title: '',
            department_id: db.departments[0]?.id || '',
            candidate_type_id: db.candidateTypes[0]?.id || '',
            duration_minutes: 30,
            question_pool_size: ''
        });
        setShowModal(true);
    };

    const openEditModal = (exam) => {
        setEditingExam(exam);
        setFormData({
            title: exam.title,
            department_id: exam.department_id,
            candidate_type_id: exam.candidate_type_id,
            duration_minutes: exam.duration_minutes,
            question_pool_size: exam.question_pool_size || ''
        });
        setShowModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        let finalDepartmentId = formData.department_id;

        // Create new department if "Others" was selected
        if (formData.department_id === 'others') {
            if (!customDeptName.trim()) return;
            const newDept = addDepartment(customDeptName);
            finalDepartmentId = newDept.id;
        }

        const payload = {
            ...formData,
            department_id: finalDepartmentId,
            question_pool_size: formData.question_pool_size === '' ? null : parseInt(formData.question_pool_size)
        };

        try {
            if (editingExam) {
                await updateExam(editingExam.id, payload);
            } else {
                await addExam(payload);
            }
            setShowModal(false);
            setCustomDeptName('');
            setFormData({
                title: '',
                department_id: db.departments[0]?.id || '',
                candidate_type_id: db.candidateTypes[0]?.id || '',
                duration_minutes: 30,
                question_pool_size: ''
            });
        } catch (err) {
            console.error("Error saving exam:", err);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2>Exam Management</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Create and organize assessments for different departments.</p>
                </div>
                <button className="primary" onClick={openCreateModal}>
                    <Plus size={20} /> New Exam
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {db.exams.map((exam, idx) => {
                    const dept = db.departments.find(d => d.id === exam.department_id);
                    const type = db.candidateTypes.find(t => t.id === exam.candidate_type_id);

                    return (
                        <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass"
                            style={{ padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="gradient-bg" style={{ padding: '0.75rem', borderRadius: '1rem' }}>
                                    <FileText size={20} color="white" />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="secondary"
                                        style={{ padding: '0.5rem', color: 'var(--danger)' }}
                                        onClick={() => handleDeleteExam(exam.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{exam.title}</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                                    <span className="glass" style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--primary)' }}>
                                        {dept?.name}
                                    </span>
                                    <span className="glass" style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--secondary)' }}>
                                        {type?.name}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <Clock size={14} /> {exam.duration_minutes} Mins
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <Users size={14} /> {exam.question_pool_size ? `${exam.question_pool_size} (Pool: ${exam.questions_count})` : `${exam.questions_count} Questions`}
                                </div>
                            </div>

                            <button
                                className="secondary"
                                style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}
                                onClick={() => navigate('/admin/dashboard/questions', { state: { selectedExamId: exam.id } })}
                            >
                                View Questions <ArrowRight size={16} />
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass card"
                        style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}
                    >
                        <h3>{editingExam ? 'Edit Exam' : 'Create New Exam'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                            {editingExam ? 'Update assessment module details.' : 'Define a new assessment module for candidates.'}
                        </p>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label>Exam Title</label>
                                <input
                                    required
                                    placeholder="e.g. Senior Medical Coder Assessment"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label>Department</label>
                                    <select
                                        value={formData.department_id}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    >
                                        {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        <option value="others" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Others (Add New)</option>
                                    </select>
                                </div>
                                {formData.department_id === 'others' && (
                                    <div className="fade-in" style={{ gridColumn: 'span 2' }}>
                                        <label>New Department Name</label>
                                        <input
                                            required
                                            placeholder="e.g. Human Resources"
                                            value={customDeptName}
                                            onChange={(e) => setCustomDeptName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                )}
                                <div>
                                    <label>Candidate Type</label>
                                    <select
                                        value={formData.candidate_type_id}
                                        onChange={(e) => setFormData({ ...formData, candidate_type_id: e.target.value })}
                                    >
                                        {db.candidateTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label>Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.duration_minutes || ''}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label>Question Pool Size (Optional)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Pick N random questions"
                                        value={formData.question_pool_size || ''}
                                        onChange={(e) => setFormData({ ...formData, question_pool_size: parseInt(e.target.value) || '' })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary" style={{ flex: 1 }}>{editingExam ? 'Save Changes' : 'Create Exam'}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Exams;
