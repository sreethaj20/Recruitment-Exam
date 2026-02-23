import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, AlertCircle, Users, Camera } from 'lucide-react';
import { useStore } from '../../store';
import useTabVisibility from '../../hooks/useTabVisibility';
import { examAPI, attemptAPI } from '../../services/api';

const TestInterface = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { db } = useStore();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [showFaceWarning, setShowFaceWarning] = useState(false);
    const [showMultiFaceWarning, setShowMultiFaceWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [proctoringError, setProctoringError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const violationCheckRef = useRef({ face: 0, faceStrikes: 0, multiFace: 0 });
    const handleSubmitRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const examRef = useRef(null);
    const showMultiFaceWarningRef = useRef(false);
    const proctoringIntervalRef = useRef(null);

    const enterFullscreen = () => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (questionId, optionIndex) => {
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const handleSubmit = useCallback(async (reason = 'Normal submission') => {
        if (isSubmitting || !attemptId) return;
        setIsSubmitting(true);

        // Calculate Score
        let score = 0;
        questions.forEach(q => {
            if (q.type === 'text') {
                const answer = (answers[q.id] || '').toLowerCase();
                const matchedKeywords = q.keywords.filter(keyword =>
                    answer.includes(keyword.toLowerCase())
                );
                // Mark correct if matches 3 to 5 keywords (as requested)
                if (matchedKeywords.length >= 3) {
                    score++;
                }
            } else if (q.type === 'fill_in_the_blank') {
                const answer = (answers[q.id] || '').toLowerCase().trim();
                const correct = (q.correct_answer || '').toLowerCase().trim();
                if (answer === correct) {
                    score++;
                }
            } else {
                // Default to MCQ logic
                if (answers[q.id] == q.correct_answer) {
                    score++;
                }
            }
        });

        const results = {
            score,
            total_questions: questions.length,
            percentage: questions.length > 0 ? (score / questions.length) * 100 : 0
        };

        try {
            // Ensure all assigned questions are represented in the responses object (even if skipped)
            const submissionResponses = {};
            questions.forEach(q => {
                submissionResponses[q.id] = Object.prototype.hasOwnProperty.call(answers, q.id)
                    ? answers[q.id]
                    : null;
            });

            // Submit attempt to backend
            await attemptAPI.submit(attemptId, { ...results, responses: submissionResponses });

            sessionStorage.setItem('last_result', JSON.stringify({
                ...results,
                submissionType: reason
            }));

            navigate(`/exam/${token}/success`, { replace: true });
        } catch (err) {
            console.error("Submission error:", err);
            setIsSubmitting(false);
        }
    }, [isSubmitting, attemptId, questions, answers, token, navigate]);

    // Update refs whenever state changes
    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
        isSubmittingRef.current = isSubmitting;
        examRef.current = exam;
        showMultiFaceWarningRef.current = showMultiFaceWarning;
    }, [handleSubmit, isSubmitting, exam, showMultiFaceWarning]);

    // Anti-Cheating Handler
    const onViolation = useCallback((count) => {
        if (isSubmitting) return;

        if (count >= 1) {
            handleSubmit('Auto-submitted due to security violation (Tab Switch)');
        }
    }, [isSubmitting, handleSubmit]);

    // Prevent back button
    useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
        };
        window.addEventListener('popstate', handlePopState);

        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull && !isSubmittingRef.current && examRef.current) {
                console.log("Proctoring: Fullscreen exit detected. Auto-submitting...");
                handleSubmitRef.current('Auto-submitted: Exited fullscreen mode');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []); // Clean dependencies

    // Load Exam and Initialize Attempt
    useEffect(() => {
        const initializeTest = async () => {
            const candidate = JSON.parse(sessionStorage.getItem('current_candidate'));
            const attempt = JSON.parse(sessionStorage.getItem('current_attempt'));

            if (!candidate || !attempt) {
                navigate(`/exam/${token}`);
                return;
            }

            try {
                // Fetch both exam and questions for this candidate from backend using the token
                const { invitationAPI } = await import('../../services/api');
                const response = await invitationAPI.getAssessmentData(token);
                const assessmentData = response.data; // This is the Exam object with Questions included

                setExam(assessmentData);
                setQuestions(assessmentData.Questions || []);
                setTimeLeft(assessmentData.duration_minutes * 60);
                setAttemptId(attempt.id);
            } catch (err) {
                console.error("Test initialization error:", err);
                navigate(`/exam/${token}`);
            }
        };

        initializeTest();
    }, [token, navigate, db.exams]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0 || isSubmitting) {
            if (timeLeft === 0 && examRef.current) {
                console.log("Proctoring: Time limit reached. Submitting...");
                handleSubmitRef.current();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isSubmitting]);

    useTabVisibility((count) => {
        console.log(`Proctoring: Visibility violation detected (Count: ${count})`);
        onViolation(count);
    });

    // Load Face-API models
    useEffect(() => {
        const loadModels = async () => {
            const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            if (!window.faceapi) {
                const script = document.createElement('script');
                script.src = SCRIPT_URL;
                script.async = true;
                script.onload = async () => {
                    await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                    setIsModelsLoaded(true);
                };
                document.body.appendChild(script);
            } else {
                setIsModelsLoaded(true);
            }
        };
        loadModels();
    }, []);

    // Proctoring Logic: Initialize and monitor camera/mic
    useEffect(() => {
        const startProctoring = async () => {
            const hardwareRequirements = JSON.parse(sessionStorage.getItem('hardware_requirements')) || { cam: true, mic: true };
            const isInternal = exam?.test_type === 'internal';

            // For internal tests, force cam to false just in case
            const actualCamReq = isInternal ? false : hardwareRequirements.cam;
            const actualMicReq = hardwareRequirements.mic;

            if (!actualCamReq && !actualMicReq) {
                console.log("Proctoring: No hardware monitoring required.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: actualCamReq,
                    audio: actualMicReq
                });
                streamRef.current = stream;
                if (videoRef.current && actualCamReq) {
                    videoRef.current.srcObject = stream;
                }

                if (proctoringIntervalRef.current) {
                    clearInterval(proctoringIntervalRef.current);
                }

                // Monitor stream health and AI conditions
                proctoringIntervalRef.current = setInterval(async () => {
                    const currentStream = streamRef.current;
                    if (!currentStream) return;

                    const videoTrack = actualCamReq ? currentStream.getVideoTracks()[0] : null;
                    const audioTrack = actualMicReq ? currentStream.getAudioTracks()[0] : null;

                    // 1. Check for physical disconnection
                    if ((actualCamReq && (!videoTrack || videoTrack.readyState === 'ended')) ||
                        (actualMicReq && (!audioTrack || audioTrack.readyState === 'ended'))) {
                        console.warn("Proctoring: Required device disconnected!");
                        setProctoringError('Required hardware disconnected. Please check your connection.');
                        return;
                    }

                    setProctoringError(null);

                    // 2. Check for Mic Mute (only if required)
                    if (actualMicReq && audioTrack && (!audioTrack.enabled || audioTrack.muted)) {
                        console.log("Proctoring: Mic muted detected.");
                        if (handleSubmitRef.current && !isSubmittingRef.current) {
                            handleSubmitRef.current('Auto-submitted: Microphone was muted during the exam');
                        }
                        return;
                    }

                    // 3. Face Detection (only if camera is required AND NOT INTERNAL)
                    if (!isInternal && actualCamReq && isModelsLoaded && videoRef.current && videoRef.current.readyState >= 2 && !isSubmittingRef.current && examRef.current) {
                        try {
                            const options = new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 224 });
                            const detections = await window.faceapi.detectAllFaces(videoRef.current, options);

                            if (detections.length === 0) {
                                violationCheckRef.current.face++;
                                if (violationCheckRef.current.face >= 5) {
                                    violationCheckRef.current.face = 0; // Reset minor counter
                                    violationCheckRef.current.faceStrikes++;

                                    if (violationCheckRef.current.faceStrikes < 3) {
                                        setShowFaceWarning(true);
                                    } else {
                                        if (handleSubmitRef.current) {
                                            handleSubmitRef.current('Auto-submitted: No face detected (3 violations)');
                                        }
                                    }
                                }
                            } else if (detections.length > 1) {
                                if (showMultiFaceWarningRef.current) return;
                                violationCheckRef.current.multiFace++;
                                if (violationCheckRef.current.multiFace === 1) {
                                    setShowMultiFaceWarning(true);
                                } else if (violationCheckRef.current.multiFace >= 2) {
                                    if (handleSubmitRef.current) {
                                        handleSubmitRef.current('Auto-submitted: Multiple faces detected multiple times');
                                    }
                                }
                            } else {
                                violationCheckRef.current.face = 0;
                            }
                        } catch (faceErr) {
                            console.error("Proctoring: AI detection error", faceErr);
                        }
                    }
                }, 2000);
            } catch (err) {
                console.error("Proctoring: Setup error", err);
                if (isInternal) {
                    setProctoringError('Microphone access is required for this internal assessment.');
                } else {
                    setProctoringError('Camera and microphone access is required throughout the exam.');
                }
            }
        };

        if (exam) {
            startProctoring();
        }

        return () => {
            if (proctoringIntervalRef.current) {
                clearInterval(proctoringIntervalRef.current);
                proctoringIntervalRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isModelsLoaded, exam]);

    if (!exam || questions.length === 0) return null;

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)', color: 'var(--text)' }}>
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', filter: !isFullscreen ? 'blur(10px)' : 'none', pointerEvents: !isFullscreen ? 'none' : 'auto' }}>
                {/* Header */}
                <header className="glass container" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 10 }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem' }}>{exam.title}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Question {currentQuestionIndex + 1} of {questions.length}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="glass" style={{ padding: '0.5rem 1.25rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: timeLeft < 60 ? '1px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                            <Clock size={20} color={timeLeft < 60 ? 'var(--danger)' : 'var(--primary)'} />
                            <span style={{ fontWeight: '700', fontSize: '1.1rem', color: timeLeft < 60 ? 'var(--danger)' : 'white' }}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <button className="primary" onClick={() => handleSubmit()}>Submit Test</button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        <div className="card glass fade-in" style={{ padding: '3rem' }}>
                            <h2 style={{ marginBottom: '2.5rem', lineHeight: '1.4' }}>{currentQuestion.text}</h2>

                            {currentQuestion.type === 'text' ? (
                                <div className="fade-in">
                                    <label style={{ marginBottom: '1rem', display: 'block', color: 'var(--text-muted)' }}>Enter your answer below:</label>
                                    <textarea
                                        rows={6}
                                        placeholder="Type your response here..."
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '1.5rem',
                                            borderRadius: '1rem',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            fontSize: '1.1rem',
                                            lineHeight: '1.6',
                                            resize: 'none',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onFocus={(e) => e.target.style.border = '2px solid var(--primary)'}
                                        onBlur={(e) => e.target.style.border = '1px solid var(--glass-border)'}
                                    />
                                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Tip: Ensure your answer includes key terminology related to the question.
                                    </p>
                                </div>
                            ) : currentQuestion.type === 'fill_in_the_blank' ? (
                                <div className="fade-in" style={{ fontSize: '1.25rem', lineHeight: '1.8' }}>
                                    {(() => {
                                        const parts = currentQuestion.text.split('________');
                                        if (parts.length > 1) {
                                            return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                                                    {parts[0]}
                                                    <input
                                                        type="text"
                                                        value={answers[currentQuestion.id] || ''}
                                                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                                                        style={{
                                                            padding: '0.2rem 1rem',
                                                            borderRadius: '0.5rem',
                                                            background: 'var(--glass-bg)',
                                                            border: '2px solid var(--primary)',
                                                            fontSize: '1.1rem',
                                                            width: '200px',
                                                            color: 'white'
                                                        }}
                                                        placeholder="answer..."
                                                    />
                                                    {parts[1]}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div>
                                                <h2 style={{ marginBottom: '2rem' }}>{currentQuestion.text}</h2>
                                                <input
                                                    type="text"
                                                    value={answers[currentQuestion.id] || ''}
                                                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '1rem 1.5rem',
                                                        borderRadius: '1rem',
                                                        background: 'var(--glass-bg)',
                                                        border: '2px solid var(--primary)',
                                                        fontSize: '1.1rem',
                                                        color: 'white'
                                                    }}
                                                    placeholder="Enter your answer here..."
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {currentQuestion.options.map((option, idx) => {
                                        const isSelected = answers[currentQuestion.id] === idx;
                                        return (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ x: 5 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleAnswerSelect(currentQuestion.id, idx)}
                                                className="glass"
                                                style={{
                                                    padding: '1.25rem 1.5rem',
                                                    borderRadius: '1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.25rem',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: isSelected ? '6px solid var(--primary)' : '2px solid var(--glass-border)',
                                                    background: 'transparent'
                                                }}></div>
                                                <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? '600' : '400' }}>{option}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                className="secondary"
                                disabled={currentQuestionIndex === 0}
                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={20} /> Previous
                            </button>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {questions.map((_, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: currentQuestionIndex === idx ? 'var(--primary)' : 'var(--glass-border)'
                                        }}
                                    />
                                ))}
                            </div>

                            {isLastQuestion ? (
                                <button className="primary" onClick={() => handleSubmit()} style={{ background: 'var(--accent)' }}>
                                    Final Submission <Send size={18} style={{ marginLeft: '0.5rem' }} />
                                </button>
                            ) : (
                                <button className="secondary" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                                    Next Question <ChevronRight size={20} style={{ marginLeft: '0.5rem' }} />
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            {/* Warning Overlay */}
            <AnimatePresence>
                {showWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 100, padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass card"
                            style={{ maxWidth: '450px', textAlign: 'center', border: '1px solid var(--warning)' }}
                        >
                            <AlertTriangle size={64} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>Security Warning!</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                                You have switched away from the examination window. This is strictly prohibited.
                                <br /><br />
                                <strong>Note:</strong> A second violation will result in an <strong>immediate automatic submission</strong> of your test.
                            </p>
                            <button className="primary" style={{ background: 'var(--warning)', width: '100%' }} onClick={() => setShowWarning(false)}>
                                I Understand, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Face Detection Warning Overlay */}
            <AnimatePresence>
                {showFaceWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 4500, padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass card"
                            style={{ maxWidth: '450px', textAlign: 'center', border: '1px solid var(--warning)' }}
                        >
                            <Camera size={64} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>Face Detection Warning!</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                                The system cannot detect your face. Please ensure you are properly positioned in front of the camera and there is sufficient lighting.
                                <br /><br />
                                <strong>Warning {violationCheckRef.current.faceStrikes} of 2:</strong> A third violation will result in an <strong>immediate automatic submission</strong> of your test.
                            </p>
                            <button className="primary" style={{ background: 'var(--warning)', width: '100%' }} onClick={() => setShowFaceWarning(false)}>
                                I Am Back, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-Submit Overlay */}
            <AnimatePresence>
                {isSubmitting && timeLeft > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 200
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div className="gradient-bg" style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <AlertCircle color="white" size={40} className="spin" />
                            </div>
                            <h2>Submitting Your Responses...</h2>
                            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Please do not close this window.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Continuous Proctoring Preview (Floating Circle) */}
            {(() => {
                const isInternal = exam?.test_type === 'internal';
                const hardwareRequirements = JSON.parse(sessionStorage.getItem('hardware_requirements')) || { cam: true, mic: true };
                if (isInternal || !hardwareRequirements.cam) return null;
                return (
                    <div style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid var(--primary)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        {!streamRef.current && (
                            <div style={{ position: 'absolute', color: 'red', textAlign: 'center', padding: '10px' }}>
                                <AlertCircle size={32} style={{ margin: '0 auto' }} />
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Proctoring Error Overlay */}
            <AnimatePresence>
                {proctoringError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2000
                        }}
                    >
                        <div className="glass card" style={{ maxWidth: '400px', textAlign: 'center', border: '2px solid var(--danger)' }}>
                            <AlertCircle size={64} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
                            <h2 style={{ color: 'var(--danger)' }}>Action Required!</h2>
                            <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>{proctoringError}</p>
                            <button className="primary" style={{ marginTop: '2rem', background: 'var(--danger)' }} onClick={() => window.location.reload()}>
                                Re-enable Access
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Multiple Faces Warning Overlay */}
            <AnimatePresence>
                {showMultiFaceWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 4000, padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass card"
                            style={{ maxWidth: '450px', textAlign: 'center', border: '1px solid var(--danger)' }}
                        >
                            <Users size={64} color="var(--danger)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Unauthorized Person Detected!</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                                Multiple faces have been detected in the camera frame. This is strictly prohibited.
                                <br /><br />
                                <strong>Warning:</strong> Ensure only one person is visible. A second violation will result in an <strong>immediate automatic submission</strong>.
                            </p>
                            <button className="primary" style={{ background: 'var(--danger)', width: '100%' }} onClick={() => setShowMultiFaceWarning(false)}>
                                I Understand, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Requirement Overlay */}
            <AnimatePresence>
                {!isFullscreen && !isSubmitting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 3000, padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass card"
                            style={{ maxWidth: '500px', textAlign: 'center', border: '1px solid var(--primary)' }}
                        >
                            <AlertCircle size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ marginBottom: '1rem' }}>Fullscreen Mode Required</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                                To maintain examination integrity, you must be in fullscreen mode.
                                <br />
                                <strong>Exiting fullscreen will result in immediate automatic submission.</strong>
                            </p>
                            <button className="primary" style={{ width: '100%' }} onClick={enterFullscreen}>
                                Enter Fullscreen & Start Exam
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TestInterface;
