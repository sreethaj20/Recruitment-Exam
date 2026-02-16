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
                mobile: formData.mobile
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
        <div style={{ padding: '4rem 1rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="container glass card"
                style={{ maxWidth: '800px' }}
            >
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Candidate Verification</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Please provide your details to verify your registration for {exam.title}.</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--danger)',
                            color: 'var(--danger)',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}
                    >
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Common Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                                <User size={20} /> Personal Information
                            </h4>

                            <div>
                                <label>Full Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
                            </div>

                            <div>
                                <label>Email Address</label>
                                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required />
                            </div>

                            <div>
                                <label>Mobile Number</label>
                                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+1 234 567 890" required />
                            </div>
                        </div>

                        {/* Dynamic Specific Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                                {isFresher ? <GraduationCap size={20} /> : <Briefcase size={20} />}
                                {isFresher ? 'Academic Details' : 'Professional Experience'}
                            </h4>

                            {isFresher ? (
                                <>
                                    <div>
                                        <label>Highest Qualification</label>
                                        <input name="qualification" value={formData.qualification} onChange={handleChange} placeholder="B.Tech Computer Science" required />
                                    </div>
                                    <div>
                                        <label>Year of Passing</label>
                                        <input name="yearOfPassing" type="number" value={formData.yearOfPassing} onChange={handleChange} placeholder="2024" required />
                                    </div>
                                    <div>
                                        <label>College/University Name</label>
                                        <input name="collegeName" value={formData.collegeName} onChange={handleChange} placeholder="Global Tech Institute" required />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label>Total Experience (Years)</label>
                                        <input name="totalExperience" type="number" value={formData.totalExperience} onChange={handleChange} placeholder="5" required />
                                    </div>
                                    <div>
                                        <label>Current Company</label>
                                        <input name="currentCompany" value={formData.currentCompany} onChange={handleChange} placeholder="Tech Corp Inc." required />
                                    </div>
                                    <div>
                                        <label>Notice Period (Days)</label>
                                        <input name="noticePeriod" type="number" value={formData.noticePeriod} onChange={handleChange} placeholder="30" required />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Dept:</span> {exam.department_id.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Type:</span> {isFresher ? 'Fresher' : 'Experienced'}
                            </div>
                        </div>

                        <button type="submit" className="primary" style={{ padding: '1rem 2.5rem' }}>
                            Start Examination <ArrowRight size={20} style={{ marginLeft: '1rem' }} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ApplicationForm;
