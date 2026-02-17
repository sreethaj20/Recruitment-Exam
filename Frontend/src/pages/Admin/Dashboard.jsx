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
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-deep)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <aside className="glass" style={{ width: '280px', margin: '1rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <div style={{ padding: '1rem', marginBottom: '2rem' }}>
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
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <item.icon size={20} color={isActive ? 'var(--primary)' : 'currentColor'} />
                                <span style={{ fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
                                {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="secondary"
                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem' }}>Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: '600' }}>{user.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</p>
                        </div>
                        <div className="gradient-bg" style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid var(--glass-border)' }}></div>
                    </div>
                </header>

                <div className="card glass" style={{ flex: 1, minHeight: '500px' }}>
                    <Routes>
                        <Route path="/" element={<Stats />} />
                        <Route path="/exams" element={<Exams />} />
                        <Route path="/questions" element={<Questions />} />
                        <Route path="/invites" element={<Invitations />} />
                        <Route path="/register" element={<Registrations />} />
                        <Route path="/review" element={<ReviewPanel />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
