import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, ExternalLink, CheckCircle, XCircle, Clock, MoreVertical, MessageSquare, Download } from 'lucide-react';
import { useStore } from '../../store';
import * as XLSX from 'xlsx';

const ReviewPanel = () => {
    const navigate = useNavigate();
    const { db, refreshData } = useStore();
    const [selectedDept, setSelectedDept] = useState('all');
    const [remarkModal, setRemarkModal] = useState({ isOpen: false, candidateId: null, text: '' });

    const candidates = db.candidates || [];
    const attempts = db.attempts || [];
    const exams = db.exams || [];
    const departments = db.departments || [];

    const getReviewData = () => {
        // Only show candidates who have completed an attempt
        return attempts
            .filter(a => a.status === 'completed')
            .map(attempt => {
                const candidate = candidates.find(c => c.id === attempt.candidate_id);
                const exam = exams.find(e => e.id === attempt.exam_id);
                const dept = departments.find(d => d.id === exam?.department_id);
                const deptName = dept?.name || (exam?.department_id ? exam.department_id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown Department');

                return {
                    id: attempt.id,
                    candidate_id: attempt.candidate_id,
                    name: candidate?.name || 'Unknown Candidate',
                    email: candidate?.email || 'No email provided',
                    status: candidate?.status || 'pending',
                    remarks: candidate?.remarks || '',
                    attempt,
                    exam,
                    deptName
                };
            })
            .filter(item => {
                // Filter by Department
                if (selectedDept !== 'all' && item.exam?.department_id !== selectedDept) return false;

                return true;
            });
    };


    const handleRemarksSave = async () => {
        try {
            const { candidateAPI } = await import('../../services/api');
            await candidateAPI.updateStatus(remarkModal.candidateId, { remarks: remarkModal.text });
            setRemarkModal({ isOpen: false, candidateId: null, text: '' });
            refreshData();
        } catch (err) {
            console.error("Error saving remarks:", err);
        }
    };

    const handleDownloadExcel = () => {
        const dataToExport = reviewData.map(item => ({
            'Candidate Name': item.name,
            'Email': item.email,
            'Department': item.deptName,
            'Exam Title': item.exam?.title || 'N/A',
            'Score': item.attempt?.score || 0,
            'Total Questions': item.attempt?.total_questions || 0,
            'Percentage': `${Math.round(item.attempt?.percentage || 0)}%`,
            'Status': (item.attempt?.percentage >= 90) ? 'CLEARED' : 'NOT CLEARED',
            'Submitted': item.attempt?.submission_type || 'Submitted by candidate',
            'Remarks': item.remarks || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');

        // Set column widths
        const wscols = [
            { wch: 25 }, // Name
            { wch: 30 }, // Email
            { wch: 20 }, // Dept
            { wch: 30 }, // Exam
            { wch: 10 }, // Score
            { wch: 15 }, // Total
            { wch: 12 }, // Percentage
            { wch: 15 }, // Status
            { wch: 25 }, // Submitted
            { wch: 40 }  // Remarks
        ];
        worksheet['!cols'] = wscols;

        const fileName = `Candidate_Report_${selectedDept === 'all' ? 'All' : selectedDept}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const reviewData = getReviewData();

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2>Candidate Review</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Evaluate performances and manage hiring decisions.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} color="var(--text-muted)" />
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            style={{ width: '200px' }}
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="secondary"
                        onClick={handleDownloadExcel}
                        disabled={reviewData.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} /> Download Excel
                    </button>
                </div>
            </div>

            <div className="glass" style={{ width: '100%', overflowX: 'auto', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Candidate</th>
                            <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Dept / Type</th>
                            <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</th>
                            <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Submitted</th>
                            <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reviewData.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No completed assessments found matching your criteria.
                                </td>
                            </tr>
                        ) : reviewData.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.email}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => navigate(`/admin/dashboard/results/${item.id}`)}
                                                title="View Detailed Results"
                                                style={{ padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => setRemarkModal({ isOpen: true, candidateId: item.candidate_id, text: item.remarks })}
                                                title="Add/Edit Remarks"
                                                style={{ padding: '0.4rem', borderRadius: '0.4rem', background: item.remarks ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: item.remarks ? 'var(--primary)' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ fontSize: '0.9rem' }}>{item.deptName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.exam?.title}</div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    {item.attempt ? (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.4rem' }}>
                                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{Math.round(item.attempt.percentage || 0)}%</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.attempt.score}/{item.attempt.total_questions})</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${item.attempt.percentage}%`,
                                                    height: '100%',
                                                    background: item.attempt.percentage >= 60 ? 'var(--accent)' : item.attempt.percentage >= 40 ? 'var(--warning)' : 'var(--danger)'
                                                }}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No attempt</span>
                                    )}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                        {item.attempt?.submission_type || 'Submitted by candidate'}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    {(() => {
                                        const isCleared = item.attempt?.percentage >= 90;
                                        return (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '2rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                background: isCleared ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: isCleared ? 'var(--accent)' : 'var(--danger)',
                                                border: isCleared ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                            }}>
                                                {isCleared ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {isCleared ? 'CLEARED' : 'NOT CLEARED'}
                                            </div>
                                        );
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Remarks Modal */}
            {remarkModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>HR Internal Remarks</h3>
                        <textarea
                            rows={6}
                            value={remarkModal.text}
                            onChange={(e) => setRemarkModal({ ...remarkModal, text: e.target.value })}
                            placeholder="Add evaluation notes, interview results, etc."
                            style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--border)', fontSize: '0.95rem', resize: 'none' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="secondary" onClick={() => setRemarkModal({ isOpen: false, candidateId: null, text: '' })}>Cancel</button>
                            <button className="primary" onClick={handleRemarksSave}>Save Remarks</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ReviewPanel;
