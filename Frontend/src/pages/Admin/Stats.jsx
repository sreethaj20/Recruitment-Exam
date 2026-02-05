import React from 'react';
import { motion } from 'framer-motion';
import { Users, FileCheck, Award, Zap, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store';

const Stats = () => {
    const { db } = useStore();

    const totalCandidates = db.candidates.length;
    const completedAttempts = db.attempts.filter(a => a.status === 'completed').length;
    const avgScore = db.attempts.length > 0
        ? Math.round(db.attempts.reduce((acc, curr) => {
            const p = parseFloat(curr.percentage);
            return acc + (isNaN(p) ? 0 : p);
        }, 0) / db.attempts.length)
        : 0;

    const passCount = db.attempts.filter(a => parseFloat(a.percentage || 0) >= 60).length;
    const passRate = db.attempts.length > 0 ? Math.round((passCount / db.attempts.length) * 100) : 0;

    const statCards = [
        { label: 'Total Candidates', value: totalCandidates, icon: Users, color: 'var(--primary)', trend: '+12%' },
        { label: 'Exams Completed', value: completedAttempts, icon: FileCheck, color: 'var(--accent)', trend: '+5%' },
        { label: 'Average Score', value: `${avgScore}%`, icon: Award, color: 'var(--secondary)', trend: '-2%' },
        { label: 'Pass Rate', value: `${passRate}%`, icon: Zap, color: 'var(--warning)', trend: '+8%' },
    ];

    const getDeptPerformance = () => {
        // Get unique department IDs from all exams to include custom ones
        const uniqueDeptIds = [...new Set(db.exams.map(e => e.department_id))];

        return uniqueDeptIds.map(deptId => {
            const dept = db.departments.find(d => d.id === deptId);
            const deptName = dept?.name || deptId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            const deptExams = db.exams.filter(e => e.department_id === deptId);
            const deptExamIds = deptExams.map(e => e.id);
            const deptAttempts = db.attempts.filter(a => deptExamIds.includes(a.exam_id) && a.status === 'completed');

            const avg = deptAttempts.length > 0
                ? Math.round(deptAttempts.reduce((acc, curr) => {
                    const p = parseFloat(curr.percentage);
                    return acc + (isNaN(p) ? 0 : p);
                }, 0) / deptAttempts.length)
                : 0;

            return { id: deptId, name: deptName, avg };
        });
    };

    const deptPerformance = getDeptPerformance();

    return (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {statCards.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass"
                        style={{ padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ background: `rgba(${stat.color === 'var(--primary)' ? '99, 102, 241' : stat.color === 'var(--accent)' ? '16, 185, 129' : stat.color === 'var(--secondary)' ? '168, 85, 247' : '245, 158, 11'}, 0.1)`, padding: '0.75rem', borderRadius: '1rem' }}>
                                <stat.icon size={24} color={stat.color} />
                            </div>
                            {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: stat.trend.startsWith('+') ? 'var(--accent)' : 'var(--danger)', fontSize: '0.75rem', fontWeight: '600' }}>
                                {stat.trend} <TrendingUp size={12} />
                            </div> */}
                        </div>
                        <h3 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{stat.value}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="glass" style={{ padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3>Recent Activity</h3>
                        <button className="secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {db.attempts.slice(-4).reverse().map((attempt, idx) => {
                            const candidate = db.candidates.find(c => c.id === attempt.candidate_id);
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="gradient-bg" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                        {(candidate?.name || 'C').charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{candidate?.name || 'A candidate'} submitted an exam</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'Just now'}</p>
                                    </div>
                                    <div style={{ fontWeight: '700', color: parseFloat(attempt.percentage) >= 60 ? 'var(--accent)' : 'var(--danger)' }}>
                                        {Math.round(parseFloat(attempt.percentage) || 0)}%
                                    </div>
                                </div>
                            );
                        })}
                        {db.attempts.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No recent activity to show.</p>}
                    </div>
                </div>

                <div className="glass" style={{ padding: '2rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3>Performance Index</h3>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
                        {deptPerformance.map((dept, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                    <span>{dept.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{dept.avg}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${dept.avg}%`,
                                        height: '100%',
                                        background: dept.avg >= 60 ? 'var(--accent)' : dept.avg >= 40 ? 'var(--warning)' : 'var(--danger)',
                                        borderRight: '2px solid rgba(255,255,255,0.2)',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Stats;
