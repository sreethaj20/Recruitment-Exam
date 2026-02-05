import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Phone, User, Trash2, Search } from 'lucide-react';
import { useStore } from '../../store';

const Registrations = () => {
    const { db, addCandidate, refreshData } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: ''
    });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.mobile) return;

        try {
            setLoading(true);
            await addCandidate(formData);
            setFormData({ name: '', email: '', mobile: '' });
            refreshData();
        } catch (err) {
            console.error("Error registering candidate:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCandidate = async (id) => {
        if (window.confirm('Delete this candidate?')) {
            try {
                const { candidateAPI } = await import('../../services/api');
                await candidateAPI.delete(id);
                refreshData();
            } catch (err) {
                console.error("Error deleting candidate:", err);
            }
        }
    };

    const candidates = db.candidates || [];
    const filteredCandidates = candidates.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile?.includes(searchTerm)
    );

    return (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
            {/* Registration Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <h2>Register Candidate</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Add new candidates to the system for future assessments.</p>
                </div>

                <div className="glass card" style={{ padding: '2.5rem' }}>
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} color="var(--primary)" /> Full Name
                            </label>
                            <input
                                required
                                placeholder="Enter candidate's full name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} color="var(--primary)" /> Email Address
                            </label>
                            <input
                                required
                                type="email"
                                placeholder="candidate@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} color="var(--primary)" /> Mobile Number
                            </label>
                            <input
                                required
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            />
                        </div>

                        <button className="primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                            <UserPlus size={20} /> {loading ? 'Registering...' : 'Complete Registration'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Candidate List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Registered Candidates</h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            placeholder="Search candidates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.5rem', width: '250px', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {filteredCandidates.length === 0 ? (
                        <div className="glass card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <User size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>No candidates found.</p>
                        </div>
                    ) : filteredCandidates.slice().reverse().map((candidate, idx) => (
                        <motion.div
                            key={candidate.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass"
                            style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="gradient-bg" style={{ width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                    {candidate.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{candidate.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Mail size={12} /> {candidate.email}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Phone size={12} /> {candidate.mobile}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="secondary"
                                style={{ padding: '0.6rem', color: 'var(--danger)' }}
                                onClick={() => handleDeleteCandidate(candidate.id)}
                            >
                                <Trash2 size={18} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Registrations;
