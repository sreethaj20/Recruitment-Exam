import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mic, CheckCircle, XCircle, RefreshCw, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { invitationAPI } from '../../services/api';

const SystemCheck = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [status, setStatus] = useState({
        camera: 'pending', // 'pending', 'success', 'error'
        microphone: 'pending',
        error: ''
    });
    const [isChecking, setIsChecking] = useState(false);
    const [invitation, setInvitation] = useState(null);

    const checkSystems = async () => {
        setIsChecking(true);
        setStatus({ camera: 'pending', microphone: 'pending', error: '' });

        try {
            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            streamRef.current = stream;

            // Check if both tracks are active
            const hasVideo = stream.getVideoTracks().some(track => track.readyState === 'live');
            const hasAudio = stream.getAudioTracks().some(track => track.readyState === 'live');

            setStatus({
                camera: hasVideo ? 'success' : 'error',
                microphone: hasAudio ? 'success' : 'error',
                error: ''
            });
        } catch (err) {
            console.error('System check error:', err);
            let errorMessage = 'Please enable camera and microphone to start the exam.';

            if (err.name === 'NotAllowedError') {
                errorMessage = 'Permission denied. Please allow camera and microphone access in your browser settings.';
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'Camera or Microphone not found. Please connect the devices and try again.';
            }

            setStatus({
                camera: 'error',
                microphone: 'error',
                error: errorMessage
            });
        } finally {
            setIsChecking(false);
        }
    };

    // Attach stream to video element when it becomes available
    useEffect(() => {
        if (status.camera === 'success' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
    }, [status.camera, isChecking]);

    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const response = await invitationAPI.validate(token);
                setInvitation(response.data);
            } catch (err) {
                console.error("Error fetching invitation:", err);
            }
        };
        fetchInvitation();
        checkSystems();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [token]);

    const isInternal = invitation?.test_type === 'internal';

    const handleStartExam = () => {
        const canProceed = isInternal ? status.microphone === 'success' : (status.camera === 'success' && status.microphone === 'success');
        if (canProceed) {
            navigate(`/exam/${token}/test`, { replace: true });
        }
    };

    const isSystemReady = isInternal ? status.microphone === 'success' : (status.camera === 'success' && status.microphone === 'success');

    return (
        <div style={{ padding: '4rem 1rem' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="container glass card"
                style={{ maxWidth: '800px' }}
            >
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: 'var(--primary)'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>System Integrity Check</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Ensure your devices are working properly for the proctored examination.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
                    {/* Camera Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                            aspectRatio: '16/9',
                            background: '#0a0a0a',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid var(--glass-border)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}>
                            {status.camera === 'success' ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.3)',
                                    gap: '1rem'
                                }}>
                                    <Camera size={48} />
                                    <span>Camera preview unavailable</span>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Live Feed</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: status.camera === 'success' ? '#10b981' : '#ef4444',
                                    boxShadow: status.camera === 'success' ? '0 0 8px #10b981' : 'none'
                                }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {status.camera === 'success' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Indicators */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Camera Status */}
                            <div className="glass" style={{
                                padding: '1.25rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                border: `1px solid ${status.camera === 'success' ? 'rgba(16, 185, 129, 0.2)' : (isInternal ? 'rgba(59, 130, 246, 0.2)' : 'var(--glass-border)')}`
                            }}>
                                <div style={{
                                    padding: '0.75rem',
                                    background: status.camera === 'success' ? 'rgba(16, 185, 129, 0.1)' : (isInternal ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)'),
                                    borderRadius: '0.75rem',
                                    color: status.camera === 'success' ? '#10b981' : (isInternal ? 'var(--primary)' : 'var(--text-muted)')
                                }}>
                                    <Camera size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Camera {isInternal && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'normal' }}>(Optional)</span>}</h4>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: status.camera === 'success' ? '#10b981' : 'var(--text-muted)' }}>
                                        {status.camera === 'success' ? 'Enabled' : (isInternal ? 'Skipped for internal test' : 'Not enabled')}
                                    </p>
                                </div>
                                {status.camera === 'success' ? (
                                    <CheckCircle size={24} style={{ color: '#10b981' }} />
                                ) : (
                                    isInternal ? (
                                        <Info size={24} style={{ color: 'var(--primary)' }} />
                                    ) : (
                                        <XCircle size={24} style={{ color: '#ef4444' }} />
                                    )
                                )}
                            </div>

                            {/* Microphone Status */}
                            <div className="glass" style={{
                                padding: '1.25rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                border: `1px solid ${status.microphone === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'var(--glass-border)'}`
                            }}>
                                <div style={{
                                    padding: '0.75rem',
                                    background: status.microphone === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.75rem',
                                    color: status.microphone === 'success' ? '#10b981' : 'var(--text-muted)'
                                }}>
                                    <Mic size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Microphone</h4>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: status.microphone === 'success' ? '#10b981' : 'var(--text-muted)' }}>
                                        {status.microphone === 'success' ? 'Enabled' : 'Not enabled'}
                                    </p>
                                </div>
                                {status.microphone === 'success' ? (
                                    <CheckCircle size={24} style={{ color: '#10b981' }} />
                                ) : (
                                    <XCircle size={24} style={{ color: '#ef4444' }} />
                                )}
                            </div>
                        </div>

                        {status.error && (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '0.75rem',
                                color: '#ef4444',
                                fontSize: '0.875rem',
                                display: 'flex',
                                gap: '0.75rem',
                                alignItems: 'flex-start'
                            }}>
                                <XCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{status.error}</span>
                            </div>
                        )}

                        <button
                            onClick={checkSystems}
                            disabled={isChecking}
                            className="glass"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <RefreshCw size={18} className={isChecking ? 'spin' : ''} />
                            {isChecking ? 'Checking...' : 'Recheck Devices'}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={handleStartExam}
                        disabled={!isSystemReady}
                        className="primary"
                        style={{
                            padding: '1rem 3rem',
                            opacity: isSystemReady ? 1 : 0.5,
                            cursor: isSystemReady ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '1.125rem'
                        }}
                    >
                        Start Exam <ArrowRight size={20} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SystemCheck;
