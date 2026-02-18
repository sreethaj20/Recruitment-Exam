import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { invitationAPI } from '../../services/api';

const ExamLanding = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateLink = async () => {
            try {
                setLoading(true);
                const response = await invitationAPI.validate(token);
                const invite = response.data;
                const targetExam = invite.Exam;

                if (invite.status === 'used') {
                    setError('This invitation link has already been used for an assessment attempt.');
                } else {
                    setExam(targetExam);
                    setInvitation(invite);
                }
            } catch (err) {
                setError('Invalid or expired invitation link. Please contact HR.');
            } finally {
                setLoading(false);
            }
        };
        validateLink();
    }, [token]);

    const [camChoice, setCamChoice] = useState(null);
    const [micChoice, setMicChoice] = useState(null);
    const [showHardwareCheck, setShowHardwareCheck] = useState(false);

    const handleProceed = () => {
        if (invitation.test_type === 'internal') {
            setShowHardwareCheck(true);
            setCamChoice('no'); // Force no camera for internal
        } else {
            // For external, we assume mandatory
            sessionStorage.setItem('hardware_requirements', JSON.stringify({
                cam: true,
                mic: true
            }));
            navigate(`/exam/${token}/form`);
        }
    };

    const handleHardwareSubmit = () => {
        const isInternal = invitation.test_type === 'internal';
        if (micChoice === null || (!isInternal && camChoice === null)) {
            alert("Please select an option for the required hardware.");
            return;
        }
        sessionStorage.setItem('hardware_requirements', JSON.stringify({
            cam: isInternal ? false : (camChoice === 'yes'),
            mic: micChoice === 'yes'
        }));
        navigate(`/exam/${token}/form`);
    };

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
                <div className="glass card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                    <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                    <h2>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>{error}</p>
                    <button className="primary" style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>Back to Home</button>
                </div>
            </div>
        );
    }

    if (!exam) return null;

    if (showHardwareCheck) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass card"
                    style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}
                >
                    <h2 style={{ marginBottom: '2rem' }}>Hardware Check</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Please confirm your hardware availability for this internal assessment.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
                        {invitation.test_type !== 'internal' && (
                            <div>
                                <p style={{ fontWeight: '600', marginBottom: '1rem' }}>Are you having a camera?</p>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button
                                        className={camChoice === 'yes' ? "primary" : "secondary"}
                                        onClick={() => setCamChoice('yes')}
                                        style={{ flex: 1 }}
                                    >Yes</button>
                                    <button
                                        className={camChoice === 'no' ? "primary" : "secondary"}
                                        onClick={() => setCamChoice('no')}
                                        style={{ flex: 1 }}
                                    >No</button>
                                </div>
                            </div>
                        )}

                        <div>
                            <p style={{ fontWeight: '600', marginBottom: '1rem' }}>Are you having a microphone?</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    className={micChoice === 'yes' ? "primary" : "secondary"}
                                    onClick={() => setMicChoice('yes')}
                                    style={{ flex: 1 }}
                                >Yes</button>
                                <button
                                    className={micChoice === 'no' ? "primary" : "secondary"}
                                    onClick={() => setMicChoice('no')}
                                    style={{ flex: 1 }}
                                >No</button>
                            </div>
                        </div>
                    </div>

                    <button className="primary" style={{ width: '100%' }} onClick={handleHardwareSubmit}>
                        Confirm & Continue
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass card"
                style={{ maxWidth: '600px', width: '100%' }}
            >
                <div className="gradient-bg" style={{ padding: '2rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'center', color: 'white' }}>
                    <BookOpen size={40} style={{ marginBottom: '1rem' }} />
                    <h2>{exam.title}</h2>
                    <p style={{ opacity: 0.9 }}>Merit Matters</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="glass" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={24} color="var(--primary)" />
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration</p>
                            <p style={{ fontWeight: '600' }}>{exam.duration_minutes} Minutes</p>
                        </div>
                    </div>
                    <div className="glass" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <CheckCircle2 size={24} color="var(--accent)" />
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format</p>
                            <p style={{ fontWeight: '600' }}>Mixed-Format Assessment</p>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Exam Instructions</h4>
                    <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.25rem' }}>
                        <li>Ensure you have a stable internet connection.</li>
                        <li>Once started, the timer cannot be paused.</li>
                        <li>Switching tabs or leaving the exam window will result in immediate <strong>automatic submission</strong> of your test.</li>
                        <li>Do not refresh the page during the examination.</li>
                    </ul>
                </div>

                <button
                    className="primary"
                    style={{ width: '100%', padding: '1rem' }}
                    onClick={handleProceed}
                >
                    Proceed to Registration
                </button>
            </motion.div>
        </div>
    );
};

export default ExamLanding;
