import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, AlertCircle, Users, Camera, BookOpen, X, Plus, CheckCircle } from 'lucide-react';
import { useStore } from '../../store';
import useTabVisibility from '../../hooks/useTabVisibility';
import { examAPI, attemptAPI, proctoringAPI } from '../../services/api';

const TestInterface = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { db } = useStore();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null); // Initialize to null
    const [showWarning, setShowWarning] = useState(false);
    const [showFaceWarning, setShowFaceWarning] = useState(false);
    const [showMultiFaceWarning, setShowMultiFaceWarning] = useState(false);
    const [showNoiseWarning, setShowNoiseWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showCPTModal, setShowCPTModal] = useState(false);
    const [selectedResourceId, setSelectedResourceId] = useState(1); // 1 or 2
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [proctoringError, setProctoringError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const violationCheckRef = useRef({
        face: 0,
        faceStrikes: 0,
        multiFace: 0,
        fullscreenStrikes: 0,
        mic: 0,
        micStrikes: 0,
        noiseStrikes: 0,
        tabStrikes: 0,
        lastTabViolation: 0,
        lastFullscreenViolation: 0,
        hasEnteredFullscreen: false, // Guard for first entry
        startTime: Date.now() // For grace period
    });
    const handleSubmitRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const examRef = useRef(null);
    const showMultiFaceWarningRef = useRef(false);
    const proctoringIntervalRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const noiseIntervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const attemptIdRef = useRef(null);
    const showCPTModalRef = useRef(false);

    const enterFullscreen = () => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen().then(() => {
                violationCheckRef.current.hasEnteredFullscreen = true;
                setIsFullscreen(true);
            }).catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Reset loading state when modal opens or resource changes
    useEffect(() => {
        if (showCPTModal) {
            setIsPdfLoading(true);
        }
    }, [showCPTModal, selectedResourceId]);

    const handleAnswerSelect = (questionId, optionIndex) => {
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const getPdfUrl = useCallback((resourceId = 1) => {
        const baseUrl = resourceId === 1 ? exam?.resource_url : exam?.resource_2_url;
        if (!baseUrl) return null;

        if (isMobile) return baseUrl; // Mobile viewers often prefer clean URLs

        // If it already has the toolbar params, return as is
        if (baseUrl.includes('#toolbar=0')) return baseUrl;
        // Otherwise, append them (handling potential existing hash/params)
        const separator = baseUrl.includes('#') ? '&' : '#';
        return `${baseUrl}${separator}toolbar=0&navpanes=0&scrollbar=0`;
    }, [exam, isMobile]);

    const handleSubmit = useCallback(async (reason = 'Normal submission') => {
        // Grace period check (10 seconds)
        const elapsed = (Date.now() - violationCheckRef.current.startTime) / 1000;
        if (reason !== 'Normal submission' && elapsed < 10) {
            console.log(`Proctoring: Guarded from premature auto-submission ("${reason}") within grace period.`);
            return;
        }

        if (isSubmitting || !attemptId) return;
        setIsSubmitting(true);

        // Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }

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
            await attemptAPI.submit(attemptId, {
                ...results,
                responses: submissionResponses,
                submission_type: reason === 'Normal submission' ? 'Submitted by candidate' : reason,
                tab_switch_count: tabSwitchCount,
                fullscreen_exit_count: violationCheckRef.current.fullscreenStrikes,
                face_detection_violations: violationCheckRef.current.faceStrikes,
                multi_face_violations: violationCheckRef.current.multiFace,
                mic_violations: violationCheckRef.current.micStrikes,
                noise_violations: violationCheckRef.current.noiseStrikes
            });

            // Trigger Finalization (Asynchronous)
            proctoringAPI.finalize(attemptId).catch(err => console.error("Finalization error:", err));

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
        attemptIdRef.current = attemptId;
        showCPTModalRef.current = showCPTModal;
    }, [handleSubmit, isSubmitting, exam, showMultiFaceWarning, attemptId, showCPTModal]);

    // Anti-Cheating Handler
    const onViolation = useCallback((count) => {
        if (isSubmittingRef.current || showCPTModalRef.current) return;
        
        const isInternal = examRef.current?.test_type === 'internal';
        if (isInternal && isMobile) return; // Bypass for internal mobile tests

        const now = Date.now();
        if (now - violationCheckRef.current.lastTabViolation < 1500) return;
        violationCheckRef.current.lastTabViolation = now;

        setTabSwitchCount(count);
        violationCheckRef.current.tabStrikes++;
        console.log(`Proctoring: Tab switch detected. Strike ${violationCheckRef.current.tabStrikes}`);

        if (violationCheckRef.current.tabStrikes <= 2) {
            setShowWarning(true);
        } else {
            console.log("Proctoring: Third tab switch violation. Auto-submitting...");
            handleSubmitRef.current('Auto-submitted due to security violation (Multiple Tab Switches)');
        }
    }, []);

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

            // Only count exits if they have actually entered once
            const isInternal = examRef.current?.test_type === 'internal';
            if (!isFull && !isSubmittingRef.current && !showCPTModalRef.current && examRef.current && violationCheckRef.current.hasEnteredFullscreen) {
                if (isInternal && isMobile) return; // Bypass for internal mobile tests
                const now = Date.now();
                if (now - violationCheckRef.current.lastFullscreenViolation < 1500) return;
                violationCheckRef.current.lastFullscreenViolation = now;

                violationCheckRef.current.fullscreenStrikes++;
                console.log(`Proctoring: Fullscreen exit detected. Strike ${violationCheckRef.current.fullscreenStrikes}`);

                if (violationCheckRef.current.fullscreenStrikes <= 2) {
                    // Just let the !isFullscreen overlay handle the warning
                } else if (violationCheckRef.current.fullscreenStrikes >= 3) {
                    console.log("Proctoring: Third fullscreen violation. Auto-submitting...");
                    handleSubmitRef.current('Auto-submitted: Multiple fullscreen violations');
                }
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
                
                // Absolute Timer Logic: Use sessionStorage to keep a stable end time
                let endTime = sessionStorage.getItem(`exam_end_time_${token}`);
                if (!endTime) {
                    endTime = Date.now() + (assessmentData.duration_minutes * 60 * 1000);
                    sessionStorage.setItem(`exam_end_time_${token}`, endTime);
                }
                
                const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                setTimeLeft(remaining);
                setAttemptId(attempt.id);
            } catch (err) {
                console.error("Test initialization error:", err);
                navigate(`/exam/${token}`);
            }
        };

        initializeTest();
    }, [token, navigate, db.exams]);

    // Timer Logic: Sync with absolute end time
    useEffect(() => {
        if (timeLeft === null || isSubmitting) return;

        const timer = setInterval(() => {
            const endTime = sessionStorage.getItem(`exam_end_time_${token}`);
            if (endTime) {
                const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                setTimeLeft(remaining);
                
                if (remaining <= 0) {
                    clearInterval(timer);
                    console.log("Proctoring: Time limit reached. Submitting...");
                    if (handleSubmitRef.current) handleSubmitRef.current('Auto-submitted: Time limit reached');
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [token, isSubmitting, timeLeft === null]); // Initial trigger

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
    // Proctoring Logic: Initialize and monitor camera/mic
    useEffect(() => {
        const startProctoring = async () => {
            if (!exam) return;

            const actualCamReq = !!exam.require_camera;
            const actualMicReq = !!exam.require_microphone;
            const isInternal = exam.test_type === 'internal';

            console.log(`Proctoring Config: Cam=${actualCamReq}, Mic=${actualMicReq}, Type=${exam.test_type}`);

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
                    if (actualMicReq && audioTrack) {
                        // VERY IMPORTANT: Check if track ended
                        if (audioTrack.readyState === "ended") {
                            console.error("Proctoring: Microphone track ended!");
                            setProctoringError("Microphone disconnected. Please ensure your mic is plugged in and refresh.");
                            return;
                        }

                        // MIC MONITOR WITH STRIKES (SAFE)
                        if (!audioTrack.enabled || audioTrack.muted) {
                            violationCheckRef.current.mic++;
                            console.log("Mic issue detected count:", violationCheckRef.current.mic);

                            // wait 3 intervals (~6 sec)
                            if (violationCheckRef.current.mic >= 3) {
                                violationCheckRef.current.mic = 0;
                                violationCheckRef.current.micStrikes++;
                                console.log("Mic strike:", violationCheckRef.current.micStrikes);

                                if (violationCheckRef.current.micStrikes <= 2) {
                                    setProctoringError(`Microphone issue detected. Warning ${violationCheckRef.current.micStrikes} of 2. Please ensure mic is ON.`);
                                } else {
                                    if (handleSubmitRef.current && !isSubmittingRef.current) {
                                        handleSubmitRef.current('Auto-submitted: Microphone disabled multiple times');
                                    }
                                }
                            }
                        } else {
                            violationCheckRef.current.mic = 0; // reset if normal
                        }
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
                                if (violationCheckRef.current.multiFace <= 2) {
                                    setShowMultiFaceWarning(true);
                                } else {
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

                    // 4. Noise Detection (Safe Monitoring) - ONLY IF REQUIRED
                    if (actualMicReq && !isSubmittingRef.current && !(isInternal && isMobile)) {
                        try {
                            if (!audioContextRef.current) {
                                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                                const analyser = audioContextRef.current.createAnalyser();
                                const source = audioContextRef.current.createMediaStreamSource(stream);
                                source.connect(analyser);
                                analyser.fftSize = 256;
                                const bufferLength = analyser.frequencyBinCount;
                                const dataArray = new Uint8Array(bufferLength);

                                // Monitor every 1 second
                                noiseIntervalRef.current = setInterval(() => {
                                    if (isSubmittingRef.current) return;
                                    analyser.getByteFrequencyData(dataArray);
                                    let sum = 0;
                                    for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                                    const average = sum / bufferLength;

                                    if (average > 65) { // Threshold for loud talking
                                        console.warn("Loud noise detected:", average);
                                        violationCheckRef.current.noiseStrikes++;

                                        if (violationCheckRef.current.noiseStrikes <= 2) {
                                            setShowNoiseWarning(true);
                                        } else if (violationCheckRef.current.noiseStrikes >= 3) {
                                            if (handleSubmitRef.current) {
                                                handleSubmitRef.current('Auto-submitted: Excessive noise detected multiple times');
                                            }
                                        }
                                    }
                                }, 1000);
                            }
                        } catch (audioErr) {
                            console.error("Noise detection setup failed:", audioErr);
                        }
                    }
                }, 2000);

                // 4. Initialize MediaRecorder for Proctoring (Recording Camera & Mic)
                if (actualCamReq || actualMicReq) {
                    const candidate = JSON.parse(sessionStorage.getItem('current_candidate'));
                    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });

                    mediaRecorderRef.current.ondataavailable = async (event) => {
                        if (event.data.size > 0 && attemptIdRef.current) {
                            const formData = new FormData();
                            formData.append('video', event.data);
                            formData.append('attemptId', attemptIdRef.current);
                            formData.append('candidateEmail', candidate.email);
                            formData.append('candidateName', candidate.name);
                            formData.append('timestamp', Date.now());

                            // Robust Background Upload
                            const uploadWithRetry = async (retries = 3) => {
                                try {
                                    await proctoringAPI.uploadChunk(formData);
                                } catch (err) {
                                    if (retries > 0) {
                                        console.warn(`Chunk upload failed, retrying... (${retries} left)`);
                                        setTimeout(() => uploadWithRetry(retries - 1), 3000);
                                    } else {
                                        console.error("Max retries reached for chunk upload:", err);
                                    }
                                }
                            };
                            uploadWithRetry();
                        }
                    };

                    mediaRecorderRef.current.start();
                    console.log("Proctoring: Recording started.");

                    // Force chunk every 10 seconds
                    recordingIntervalRef.current = setInterval(() => {
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                            mediaRecorderRef.current.requestData();
                        }
                    }, 10000);
                }
            } catch (err) {
                console.error("Proctoring: Setup error", err);
                if (actualMicReq) {
                    setProctoringError('Microphone access is required for this assessment.');
                } else if (actualCamReq) {
                    setProctoringError('Camera access is required throughout the exam.');
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
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
            if (noiseIntervalRef.current) {
                clearInterval(noiseIntervalRef.current);
                noiseIntervalRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
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

    const isAllAnswered = questions.every(q => {
        const answer = answers[q.id];
        if (q.type === 'text' || q.type === 'fill_in_the_blank') {
            return answer && typeof answer === 'string' && answer.trim().length > 0;
        }
        return answer !== undefined && answer !== null;
    });

    return (
        <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-deep)', color: 'var(--text-main)' }}>
            <div style={{ 
                padding: 'clamp(1rem, 3vw, 2rem)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'clamp(1rem, 3vw, 2rem)', 
                filter: (!isFullscreen && !isMobile) ? 'blur(10px)' : 'none', 
                pointerEvents: (!isFullscreen && !isMobile) ? 'none' : 'auto' 
            }}>
                {/* Header */}
                <header className="glass container" style={{ 
                    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem)', 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    position: 'sticky', 
                    top: '1rem', 
                    zIndex: 10,
                    gap: '1rem'
                }}>
                    {!isMobile && (
                        <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                            <h3 style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', margin: 0 }}>{exam.title}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Question {currentQuestionIndex + 1} of {questions.length}</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1.5rem', flexWrap: isMobile ? 'nowrap' : 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                        <div className="glass" style={{ padding: isMobile ? '0.25rem 0.6rem' : '0.4rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: timeLeft < 60 ? '1px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                            <Clock size={isMobile ? 14 : 18} color={timeLeft < 60 ? 'var(--danger)' : 'var(--primary)'} />
                            <span style={{ fontWeight: '700', fontSize: isMobile ? '0.85rem' : '1.1rem', color: timeLeft < 60 ? 'var(--danger)' : 'white' }}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <div style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle size={isMobile ? 14 : 18} color="var(--accent)" />
                            {Object.keys(answers).filter(id => {
                                const q = questions.find(question => question.id === id);
                                if (!q) return false;
                                if (q.type === 'text' || q.type === 'fill_in_the_blank') return answers[id]?.trim().length > 0;
                                return answers[id] !== undefined && answers[id] !== null;
                            }).length}/{questions.length} {!isMobile && <span style={{ opacity: 0.8 }}>Answered</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {exam?.resource_url && (
                                <button
                                    className="secondary"
                                    onClick={() => {
                                        setSelectedResourceId(1);
                                        setShowCPTModal(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: isMobile ? '0.25rem 0.6rem' : '0.4rem 1rem',
                                        borderRadius: '2rem',
                                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                                    }}
                                >
                                    <BookOpen size={isMobile ? 12 : 16} /> <span style={{ display: 'inline-block', maxWidth: isMobile ? '50px' : '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.resource_1_title || 'Ref 1'}</span>
                                </button>
                            )}
                            {exam?.resource_2_url && (
                                <button
                                    className="secondary"
                                    onClick={() => {
                                        setSelectedResourceId(2);
                                        setShowCPTModal(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: isMobile ? '0.25rem 0.6rem' : '0.4rem 1rem',
                                        borderRadius: '2rem',
                                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                                    }}
                                >
                                    <BookOpen size={isMobile ? 12 : 16} /> <span style={{ display: 'inline-block', maxWidth: isMobile ? '50px' : '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.resource_2_title || 'Ref 2'}</span>
                                </button>
                            )}
                        </div>

                        <button
                            className="primary"
                            onClick={isAllAnswered ? () => handleSubmit() : undefined}
                            style={{
                                opacity: isAllAnswered ? 1 : 0.5,
                                cursor: isAllAnswered ? 'pointer' : 'not-allowed',
                                filter: isAllAnswered ? 'none' : 'grayscale(0.5)',
                                padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1.25rem',
                                fontSize: isMobile ? '0.8rem' : '0.9rem'
                            }}
                            title={isAllAnswered ? "Submit Test" : "Please answer all questions before submitting"}
                        >
                            {isMobile ? <Send size={14} /> : 'Submit'}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        <div className="card glass fade-in" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
                            <h2 style={{ marginBottom: 'clamp(1.5rem, 5vw, 2.5rem)', lineHeight: '1.4', fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>{currentQuestion.text}</h2>

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
                                            padding: '1.25rem',
                                            borderRadius: '1rem',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            fontSize: '1rem',
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
                                <div className="fade-in" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.25rem)', lineHeight: '1.8' }}>
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
                                                            fontSize: '1rem',
                                                            width: 'clamp(150px, 40vw, 200px)',
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
                                                    padding: '1rem 1.25rem',
                                                    borderRadius: '1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    border: isSelected ? '6px solid var(--primary)' : '2px solid var(--glass-border)',
                                                    background: 'transparent',
                                                    flexShrink: 0
                                                }}></div>
                                                <span style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)', fontWeight: isSelected ? '600' : '400' }}>{option}</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingBottom: '2rem' }}>
                            <button
                                className="secondary"
                                disabled={currentQuestionIndex === 0}
                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                style={{ 
                                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                                    padding: '0.6rem 1rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <ChevronLeft size={18} /> <span style={{ display: 'inline' }}>Prev</span>
                            </button>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '50%' }}>
                                {questions.map((q, idx) => {
                                    const isAnswered = q.type === 'text' || q.type === 'fill_in_the_blank'
                                        ? answers[q.id]?.trim().length > 0
                                        : answers[q.id] !== undefined && answers[q.id] !== null;
                                    const isCurrent = idx === currentQuestionIndex;
                                    
                                    // Limit visible dots on very small screens
                                    if (questions.length > 10 && (idx < currentQuestionIndex - 3 || idx > currentQuestionIndex + 3)) return null;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: isCurrent ? 'var(--primary)' : (isAnswered ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.1)'),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            <button
                                className="primary"
                                disabled={isLastQuestion}
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                style={{ 
                                    opacity: isLastQuestion ? 0.5 : 1,
                                    padding: '0.6rem 1rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <span style={{ display: 'inline' }}>Next</span> <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </main>

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
                            zIndex: 5000, padding: '2rem'
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
                                <strong>Warning {violationCheckRef.current.tabStrikes} of 2:</strong> A third violation will result in an <strong>immediate automatic submission</strong> of your test.
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
                                <strong>Warning {violationCheckRef.current.multiFace} of 2:</strong> A third violation will result in an <strong>immediate automatic submission</strong> of your test.
                            </p>
                            <button className="primary" style={{ background: 'var(--danger)', width: '100%' }} onClick={() => setShowMultiFaceWarning(false)}>
                                I Understand, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Noise Warning Overlay */}
            <AnimatePresence>
                {showNoiseWarning && (
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
                            <AlertTriangle size={64} color="var(--danger)" style={{ marginBottom: '1.5rem' }} />
                            <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Excessive Noise Detected!</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                                Loud noise or talking has been detected. This is strictly prohibited during the assessment.
                                <br /><br />
                                <strong>Warning {violationCheckRef.current.noiseStrikes} of 2:</strong> A third violation will result in an <strong>immediate automatic submission</strong> of your test.
                            </p>
                            <button className="primary" style={{ background: 'var(--danger)', width: '100%' }} onClick={() => setShowNoiseWarning(false)}>
                                I Understand, Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Requirement Overlay */}
            <AnimatePresence>
                {!isFullscreen && !isSubmitting && !isMobile && (
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
                            style={{ maxWidth: '500px', textAlign: 'center', border: violationCheckRef.current.fullscreenStrikes > 0 ? '1px solid var(--warning)' : '1px solid var(--primary)' }}
                        >
                            {violationCheckRef.current.fullscreenStrikes > 0 ? (
                                <AlertTriangle size={64} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                            ) : (
                                <AlertCircle size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                            )}

                            <h2 style={{ marginBottom: '1rem', color: violationCheckRef.current.fullscreenStrikes > 0 ? 'var(--warning)' : 'inherit' }}>
                                {violationCheckRef.current.fullscreenStrikes > 0 ? 'Fullscreen Violation!' : 'Fullscreen Mode Required'}
                            </h2>

                            <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                                {violationCheckRef.current.fullscreenStrikes > 0 ? (
                                    <>
                                        You have exited fullscreen mode. This is prohibited.
                                        <br /><br />
                                        <strong style={{ color: 'var(--warning)' }}>Warning {violationCheckRef.current.fullscreenStrikes} of 2:</strong> A third violation will result in <strong>immediate automatic submission</strong>.
                                    </>
                                ) : (
                                    <>
                                        To maintain examination integrity, you must be in fullscreen mode.
                                        <br />
                                        <strong>Exiting fullscreen will result in automatic submission after two warnings.</strong>
                                    </>
                                )}
                            </p>

                            <button className="primary" style={{ width: '100%', background: violationCheckRef.current.fullscreenStrikes > 0 ? 'var(--warning)' : 'var(--primary)' }} onClick={enterFullscreen}>
                                {violationCheckRef.current.fullscreenStrikes > 0 ? 'Re-enter Fullscreen & Continue' : 'Enter Fullscreen & Start Exam'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CPT Book Modal */}
            <AnimatePresence>
                {showCPTModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 6000, padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass"
                            style={{
                                width: '95vw',
                                height: '90vh',
                                borderRadius: '1.5rem',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '1rem 2rem',
                                borderBottom: '1px solid var(--glass-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isMobile ? 'var(--bg-deep)' : 'rgba(255, 255, 255, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="gradient-bg" style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
                                        <BookOpen size={20} color="white" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                                            {selectedResourceId === 1 ? (exam?.resource_1_title || 'Reference Book 1') : (exam?.resource_2_title || 'Reference Book 2')}
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Use this reference to help with your assessment.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCPTModal(false)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body - Clipped to hide native PDF toolbar */}
                            <div
                                style={{
                                    flex: 1,
                                    background: '#f5f5f5',
                                    position: 'relative',
                                    overflow: isMobile ? 'auto' : 'hidden', // Auto for mobile scrolling
                                    WebkitOverflowScrolling: 'touch'
                                }}
                                onContextMenu={(e) => e.preventDefault()} // Disable right-click
                            >
                                <iframe
                                    src={getPdfUrl(selectedResourceId)}
                                    title={selectedResourceId === 1 ? (exam?.resource_1_title || 'Reference Book 1') : (exam?.resource_2_title || 'Reference Book 2')}
                                    onLoad={() => setIsPdfLoading(false)}
                                    style={{
                                        width: '100%',
                                        height: isMobile ? '100%' : 'calc(100% + 60px)', // Standard height on mobile
                                        marginTop: isMobile ? '0' : '-60px', // Standard margin on mobile
                                        border: 'none',
                                        background: 'white',
                                        opacity: isPdfLoading ? 0 : 1,
                                        transition: 'opacity 0.3s ease'
                                    }}
                                />

                                {isPdfLoading && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f8f9fa',
                                        gap: '1rem',
                                        zIndex: 5
                                    }}>
                                        <div className="spinner" style={{
                                            width: '40px',
                                            height: '40px',
                                            border: '3px solid rgba(99, 102, 241, 0.1)',
                                            borderTopColor: 'var(--primary)',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading reference document...</p>
                                        <style>{`
                                            @keyframes spin {
                                                to { transform: rotate(360deg); }
                                            }
                                        `}</style>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '0.75rem 2rem',
                                borderTop: '1px solid var(--glass-border)',
                                display: 'flex',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)'
                            }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Closing this window will return you to the test exactly where you left off.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

export default TestInterface;
