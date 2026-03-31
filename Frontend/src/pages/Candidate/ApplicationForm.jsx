import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Briefcase, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';
import { invitationAPI, candidateAPI } from '../../services/api';

const ApplicationForm = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { addAttempt } = useStore();

    const [exam, setExam] = useState(null);
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        qualification: '',
        yearOfPassing: '',
        collegeName: '',
        totalExperience: '',
        currentCompany: '',
        noticePeriod: ''
    });

    useEffect(() => {
        const validateToken = async () => {
            try {
                setLoading(true);
                const response = await invitationAPI.validate(token);
                setInvitation(response.data);
                setExam(response.data.Exam);
            } catch (err) {
                navigate(`/exam/${token}`);
            } finally {
                setLoading(false);
            }
        };
        validateToken();
    }, [token, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Verify candidate against pre-registered list in backend
            const response = await candidateAPI.verify({
                email: formData.email,
                mobile: formData.mobile,
                token: token
            });

            const candidate = response.data;

            // Start an attempt in the backend
            const attempt = await addAttempt({
                candidate_id: candidate.id,
                exam_id: exam.id,
                token: token
            });

            // Store candidate and attempt info for current session
            sessionStorage.setItem('current_candidate', JSON.stringify(candidate));
            sessionStorage.setItem('current_attempt', JSON.stringify(attempt));

            navigate(`/exam/${token}/system-check`, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please contact HR.');
        }
    };

    if (!exam) return null;

    const isFresher = exam.candidate_type_id === 'fresher';

    return (
        <div style={{ padding: 'clamp(2rem, 8vw, 4rem) 1rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="container glass card"
                style={{ maxWidth: '800px', padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}
            >
                <div style={{ marginBottom: 'clamp(1.5rem, 6vw, 3rem)' }}>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Candidate Verification</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Please provide your details for {exam.title}.</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--danger)',
                            color: 'var(--danger)',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.85rem'
                        }}
                    >
                        <AlertCircle size={18} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '2rem' }}>
                        {/* Common Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontSize: '1rem' }}>
                                <User size={18} /> Personal Info
                            </h4>

                            <div>
                                <label style={{ fontSize: '0.85rem' }}>Full Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required style={{ fontSize: '0.9rem' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem' }}>Email Address</label>
                                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="abc@gmail.com" required style={{ fontSize: '0.9rem' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem' }}>Mobile Number</label>
                                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="9999999999" required style={{ fontSize: '0.9rem' }} />
                            </div>
                        </div>

                        {/* Specific Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--secondary)', fontSize: '1rem' }}>
                                {isFresher ? <GraduationCap size={18} /> : <Briefcase size={18} />}
                                {isFresher ? 'Academic Details' : 'Professional Exp'}
                            </h4>

                            {isFresher ? (
                                <>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>Qualification</label>
                                        <input name="qualification" value={formData.qualification} onChange={handleChange} placeholder="Degree Name" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>Year of Passing</label>
                                        <input name="yearOfPassing" type="number" value={formData.yearOfPassing} onChange={handleChange} placeholder="2024" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>College Name</label>
                                        <input name="collegeName" value={formData.collegeName} onChange={handleChange} placeholder="Institute Name" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>Total Exp (Years)</label>
                                        <input name="totalExperience" type="number" value={formData.totalExperience} onChange={handleChange} placeholder="5" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>Current Company</label>
                                        <input name="currentCompany" value={formData.currentCompany} onChange={handleChange} placeholder="Company Name" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem' }}>Notice Period (Days)</label>
                                        <input name="noticePeriod" type="number" value={formData.noticePeriod} onChange={handleChange} placeholder="30" required style={{ fontSize: '0.9rem' }} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Dept:</span> {exam.department_id.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Type:</span> {isFresher ? 'Fresher' : 'Experienced'}
                            </div>
                        </div>

                        <button type="submit" className="primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem', flex: '1 1 auto', justifyContent: 'center' }}>
                            Start Test <ArrowRight size={18} style={{ marginLeft: '0.75rem' }} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ApplicationForm;
