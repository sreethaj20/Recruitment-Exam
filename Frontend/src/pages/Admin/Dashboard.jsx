import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    FileText,
    HelpCircle,
    UserPlus,
    Users,
    LogOut,
    ChevronRight
} from 'lucide-react';

import Stats from './Stats';
import ReviewPanel from './ReviewPanel';
import Invitations from './Invitations';
import Questions from './Questions';
import Exams from './Exams';
import Registrations from './Registrations';
import CandidateResultView from './CandidateResultView';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

    // Prevent back button to login page
    React.useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_user');
        navigate('/admin/login', { replace: true });
    };

    const menuItems = [
        { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/admin/dashboard/exams', label: 'Manage Exams', icon: FileText },
        { path: '/admin/dashboard/questions', label: 'Question Bank', icon: HelpCircle },
        { path: '/admin/dashboard/invites', label: 'Invite Candidates', icon: UserPlus },
        { path: '/admin/dashboard/register', label: 'Register Candidates', icon: Users },
        { path: '/admin/dashboard/review', label: 'Candidate Review', icon: Users },
    ];

    return (
        <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-deep)' }}>
            {/* Sidebar */}
            <aside className="glass admin-sidebar" style={{ width: '280px', margin: '1rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'sticky', top: '1rem', alignSelf: 'flex-start', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}>
                <div style={{ padding: '0.5rem 1rem', marginBottom: '1.5rem' }}>
                    <h2 className="gradient-text" style={{ fontSize: '1.5rem' }}>HR Admin</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname === '/admin/dashboard/');
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    textDecoration: 'none',
                                    color: isActive ? 'white' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <item.icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
                                <span style={{ fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
                                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="secondary"
                    style={{ marginTop: '2rem', width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', fontSize: '0.9rem', padding: '0.75rem 1rem' }}
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="admin-main" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</p>
                        </div>
                        <div className="gradient-bg" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--glass-border)' }}></div>
                    </div>
                </header>

                <div className="card glass" style={{ flex: 1, minHeight: '500px', padding: 'clamp(1rem, 3vw, 2rem)' }}>
                    <Routes>
                        <Route path="/" element={<Stats />} />
                        <Route path="/exams" element={<Exams />} />
                        <Route path="/questions" element={<Questions />} />
                        <Route path="/invites" element={<Invitations />} />
                        <Route path="/register" element={<Registrations />} />
                        <Route path="/review" element={<ReviewPanel />} />
                        <Route path="/results/:attemptId" element={<CandidateResultView />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
