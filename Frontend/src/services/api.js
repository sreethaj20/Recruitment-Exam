import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "https://api.assessmentcenter.mercuresolution.com";
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for Auth Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials)
};

export const examAPI = {
    getAll: () => api.get('/exams'),
    create: (data) => api.post('/exams', data),
    delete: (id) => api.delete(`/exams/${id}`),
    getQuestions: (examId) => api.get(`/exams/questions/${examId}`),
    addQuestion: (data) => api.post('/exams/questions', data),
    deleteQuestion: (id) => api.delete(`/exams/questions/${id}`)
};

export const invitationAPI = {
    getAll: () => api.get('/invites'),
    create: (data) => api.post('/invites', data),
    validate: (token) => api.get(`/invites/validate/${token}`),
    getAssessmentData: (token) => api.get(`/invites/${token}/assessment-data`),
    delete: (id) => api.delete(`/invites/${id}`)
};

export const candidateAPI = {
    getAll: () => api.get('/candidates'),
    register: (data) => api.post('/candidates/register', data),
    verify: (data) => api.post('/candidates/verify', data),
    delete: (id) => api.delete(`/candidates/${id}`),
    updateStatus: (id, data) => api.patch(`/candidates/${id}/status`, data)
};

export const attemptAPI = {
    getAll: () => api.get('/attempts'),
    start: (data) => api.post('/attempts/start', data),
    submit: (id, data) => api.put(`/attempts/submit/${id}`, data)
};

export default api;
