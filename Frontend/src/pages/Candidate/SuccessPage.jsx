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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'clamp(1rem, 5vw, 2rem)' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass card"
                style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: 'clamp(2rem, 8vw, 4rem) clamp(1.5rem, 5vw, 3rem)' }}
            >
                <div className="gradient-bg" style={{
                    width: 'clamp(60px, 15vw, 80px)',
                    height: 'clamp(60px, 15vw, 80px)',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    background: 'var(--accent)'
                }}>
                    <ShieldCheck size={clamp(32, 40)} color="white" />
                </div>

                <h1 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: 'clamp(1.5rem, 6vw, 2.25rem)' }}>
                    Assessment Submitted
                </h1>

                <p style={{ color: 'var(--text-main)', fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: '500', marginBottom: '1.25rem' }}>
                    Thank You for Your Participation
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.875rem, 3.5vw, 1.05rem)', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                    Your assessment has been successfully submitted.
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.875rem, 3.5vw, 1.05rem)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                    The results have been forwarded to HR. They will contact you with the official status soon.
                </p>

                <button
                    className="secondary"
                    style={{ width: '100%', border: '1px solid var(--glass-border)', padding: '0.9rem', fontSize: '1rem' }}
                    onClick={() => navigate('/')}
                >
                    Return to Portal <ArrowRight size={18} style={{ marginLeft: '0.75rem' }} />
                </button>
            </motion.div>
        </div>
    );
};

export default SuccessPage;
