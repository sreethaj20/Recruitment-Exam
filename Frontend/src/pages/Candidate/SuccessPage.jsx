import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const SuccessPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear session but keep context for this view
        sessionStorage.removeItem('current_candidate');
        sessionStorage.removeItem('last_result');
    }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass card"
                style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '4rem 3rem' }}
            >
                <div className="gradient-bg" style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2rem',
                    background: 'var(--accent)'
                }}>
                    <ShieldCheck size={40} color="white" />
                </div>

                <h1 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>
                    Assessment Submitted
                </h1>

                <p style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: '500', marginBottom: '1.5rem' }}>
                    Thank You for Your Participation
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Your assessment has been successfully submitted.
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '3rem', lineHeight: '1.6' }}>
                    The results have been forwarded to the HR Department, they will reach out to you with the official status soon.
                </p>

                <button
                    className="secondary"
                    style={{ width: '100%', border: '1px solid var(--glass-border)' }}
                    onClick={() => navigate('/')}
                >
                    Return to Portal Home <ArrowRight size={18} style={{ marginLeft: '1rem' }} />
                </button>
            </motion.div>
        </div>
    );
};

export default SuccessPage;
