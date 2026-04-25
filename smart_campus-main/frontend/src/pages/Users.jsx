import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiUsers, FiMail, FiShield, FiSave } from 'react-icons/fi';
import './Users.css';

const Users = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [pendingRoles, setPendingRoles] = useState({});

    useEffect(() => {
        // Prevent non-admins from loading this data (frontend guard)
        if (user?.role !== 'ADMIN') {
            setLoading(false);
            return;
        }

        api.get('/users/admin')
            .then(res => {
                setUsers(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.log("Using mock data for Users (backend might be down)", err);
                // Fallback to mock logic if backend isn't ready
                setUsers([
                    { id: 1, name: 'Alice Admin', email: 'admin@smartcampus.edu', role: 'ADMIN' },
                    { id: 2, name: 'Bob Student', email: 'student1@smartcampus.edu', role: 'USER' },
                    { id: 3, name: 'James Technician', email: 'tech1@smartcampus.edu', role: 'TECHNICIAN' },
                    { id: 4, name: 'Sarah Miller', email: 'student2@smartcampus.edu', role: 'USER' },
                    { id: 5, name: 'David Lee', email: 'tech2@smartcampus.edu', role: 'TECHNICIAN' }
                ]);
                setLoading(false);
            });
    }, [user]);

    const handleRoleChange = (userId, newRole) => {
        api.patch(`/users/admin/${userId}/role`, { role: newRole })
            .then(res => {
                setUsers(users.map(u => u.id === userId ? { ...u, role: res.data.role } : u));
                setPendingRoles(prev => { const p = {...prev}; delete p[userId]; return p; });
                setToastMessage('Role updated successfully!');
                setTimeout(() => setToastMessage(''), 4000);
            })
            .catch(err => {
                console.error("Backend error updating role, mocking result:", err);
                // Mock update if backend is off
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
                setPendingRoles(prev => { const p = {...prev}; delete p[userId]; return p; });
                setToastMessage('Role updated locally (Backend Offline)');
                setTimeout(() => setToastMessage(''), 4000);
            });
    };

    if (user?.role !== 'ADMIN') {
        return <div className="page-container"><p>Access Denied: Admins Only.</p></div>;
    }

    return (
        <div className="users-page animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>User Management</h1>
                    <p>Manage platform access and assign user roles.</p>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">Loading users...</div>
            ) : (
                <div className="users-grid">
                    {users.map(u => (
                        <div key={u.id} className="glass-panel user-card">
                            <div className="user-info">
                                <h3>{u.name}</h3>
                                <p><FiMail style={{marginRight: '6px', opacity: 0.7}}/> {u.email}</p>
                            </div>
                            
                            <div className="user-actions">
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label" style={{fontSize: '0.75rem', marginBottom: '0.2rem'}}><FiShield style={{marginRight: '4px'}}/> Access Role</label>
                                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                        <select 
                                            className="input-field" 
                                            value={pendingRoles[u.id] || u.role}
                                            onChange={(e) => setPendingRoles({...pendingRoles, [u.id]: e.target.value})}
                                            disabled={u.email === user.email} // Prevent admins from demoting themselves
                                            style={{marginBottom: 0}}
                                        >
                                            <option value="USER">User (Default)</option>
                                            <option value="TECHNICIAN">Technician</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                        
                                        {pendingRoles[u.id] && pendingRoles[u.id] !== u.role && (
                                            <button 
                                                className="btn btn-primary" 
                                                style={{padding: '0.4rem 0.8rem'}}
                                                onClick={() => handleRoleChange(u.id, pendingRoles[u.id])}
                                                title="Save Role"
                                            >
                                                <FiSave />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="toast-notification animate-fade-in">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default Users;
