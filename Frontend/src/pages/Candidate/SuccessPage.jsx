import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, Mail, ArrowRight, XCircle } from 'lucide-react';

const SuccessPage = () => {
    const navigate = useNavigate();
    const [result, setResult] = useState(null);

    useEffect(() => {
        const lastResult = JSON.parse(sessionStorage.getItem('last_result'));
        setResult(lastResult);
        // Clear session but keep result for this view
        sessionStorage.removeItem('current_candidate');
    }, []);

    const isQualified = result && result.percentage >= 95;

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
                    background: isQualified ? 'var(--accent)' : 'var(--danger)'
                }}>
                    {isQualified ? <CheckCircle size={40} color="white" /> : <XCircle size={40} color="white" />}
                </div>

                <h1 style={{ marginBottom: '1rem', color: isQualified ? 'var(--accent)' : 'var(--danger)' }}>
                    {isQualified ? 'Congratulations, you have qualified!' : 'Oops, you haven’t cleared the test'}
                </h1>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    {isQualified
                        ? 'Great job! Your performance has met our qualification criteria. Our HR team will reach out to you shortly for the next steps.'
                        : 'Unfortunately, your score did not meet the minimum requirement to clear this assessment. We appreciate your interest and effort.'
                    }
                </p>

                <div style={{ marginBottom: '3rem' }}>
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', border: `1px solid ${isQualified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Score</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: isQualified ? 'var(--accent)' : 'var(--danger)' }}>
                            {result ? Math.round(result.percentage) : 0}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            ({result?.score || 0} correct out of {result?.total_questions || 0})
                        </div>
                    </div>
                </div>

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
