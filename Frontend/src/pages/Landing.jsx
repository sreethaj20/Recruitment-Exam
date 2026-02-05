import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, ShieldCheck, ArrowRight } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();
    const [inviteToken, setInviteToken] = useState('');

    useEffect(() => {
        const isAdmin = localStorage.getItem('admin_auth') === 'true';
        if (isAdmin) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleCandidateAccess = (e) => {
        e.preventDefault();
        if (inviteToken.trim()) {
            navigate(`/exam/${inviteToken.trim()}`);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                    <span className="gradient-text">Recruitment</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px' }}>
                    Welcome to our secure examination portal. Please select your role to proceed with the recruitment process.
                </p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', width: '100%', maxWidth: '900px' }}>
                {/* Candidate Card */}
                <motion.div
                    whileHover={{ y: -10 }}
                    className="glass card"
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    <div className="gradient-bg" style={{ width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase color="white" />
                    </div>
                    <div>
                        <h3>Candidates</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Have an invitation code? Enter it below to start your application and assessment.
                        </p>
                    </div>
                    <form onSubmit={handleCandidateAccess} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Enter invite code..."
                            value={inviteToken}
                            onChange={(e) => setInviteToken(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="primary" style={{ padding: '0.75rem' }}>
                            <ArrowRight size={20} />
                        </button>
                    </form>
                </motion.div>

                {/* Admin Card */}
                <motion.div
                    whileHover={{ y: -10 }}
                    className="glass card"
                    style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    <div style={{ background: 'var(--secondary)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck color="white" />
                    </div>
                    <div>
                        <h3>Administration</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Access the HR dashboard to manage exams, invite candidates, and review assessment results.
                        </p>
                    </div>
                    <button
                        className="secondary"
                        onClick={() => navigate('/admin/login')}
                        style={{ width: '100%', marginTop: 'auto' }}
                    >
                        HR Portal Login
                    </button>
                </motion.div>
            </div>

            <footer style={{ marginTop: '5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                &copy; 2026 Online Recruitment Examination System. Secure & Verified.
            </footer>
        </div>
    );
};

export default Landing;
