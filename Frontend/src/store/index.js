import { useState, useEffect, useCallback } from 'react';
import { examAPI, invitationAPI, candidateAPI, attemptAPI } from '../services/api';

export const useStore = () => {
  const [db, setDb] = useState({
    exams: [],
    questions: [],
    invitations: [],
    candidates: [],
    attempts: [],
    departments: [
      { id: 'ar_calling', name: 'AR Calling' },
      { id: 'medical_coding', name: 'Medical Coding' },
      { id: 'qa', name: 'Quality Assurance (QA)' }
    ],
    candidateTypes: [
      { id: 'fresher', name: 'Fresher' },
      { id: 'experienced', name: 'Experienced' }
    ]
  });

  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      setLoading(true);
      const [exams, invites, candidates, attempts] = await Promise.all([
        examAPI.getAll(),
        invitationAPI.getAll(),
        candidateAPI.getAll(),
        attemptAPI.getAll()
      ]);

      setDb(prev => ({
        ...prev,
        exams: exams.data,
        invitations: invites.data,
        candidates: candidates.data,
        attempts: attempts.data
      }));
    } catch (error) {
      console.error('Error fetching data from API:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isAdmin = localStorage.getItem('admin_token');
    if (isAdmin) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, [refreshData]);

  const addExam = async (examData) => {
    await examAPI.create(examData);
    refreshData();
  };

  const addQuestion = async (questionData) => {
    await examAPI.addQuestion(questionData);
    refreshData();
  };

  const updateExam = async (id, examData) => {
    // Assuming backend supports PUT/PATCH on /exams/:id. Let's check api.js or add it.
    await examAPI.update(id, examData);
    refreshData();
  };

  const addInvitation = async (invitationData) => {
    await invitationAPI.create(invitationData);
    refreshData();
  };

  const addCandidate = async (candidateData) => {
    const response = await candidateAPI.register(candidateData);
    const isAdmin = localStorage.getItem('admin_token');
    if (isAdmin) refreshData();
    return response.data;
  };

  const addAttempt = async (attemptData) => {
    const response = await attemptAPI.start(attemptData);
    const isAdmin = localStorage.getItem('admin_token');
    if (isAdmin) refreshData();
    return response.data;
  };

  const submitAttempt = async (attemptId, results) => {
    await attemptAPI.submit(attemptId, results);
    const isAdmin = localStorage.getItem('admin_token');
    if (isAdmin) refreshData();
  };

  // Placeholder for now as we haven't implemented dept management in backend yet
  const addDepartment = (name) => {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newDept = { id, name };
    setDb(prev => ({ ...prev, departments: [...prev.departments, newDept] }));
    return newDept;
  };

  const updateDb = async (newData) => {
    // Generic update - mostly used for legacy code compatibility
    // If it's a candidate update, use the registration endpoint
    if (newData.candidates) {
      // Logic would go here if needed
    }
  };

  return {
    db,
    loading,
    refreshData,
    addExam,
    addQuestion,
    addInvitation,
    addCandidate,
    addAttempt,
    submitAttempt,
    addDepartment,
    updateDb
  };
};

// Legacy Export for code that expects getDB (but now it should be discouraged)
export const getDB = () => {
  console.warn("getDB is deprecated. Use useStore hook for API data.");
  return {
    exams: [],
    questions: [],
    invitations: [],
    candidates: [],
    attempts: []
  };
};
