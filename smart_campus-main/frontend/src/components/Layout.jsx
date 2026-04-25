import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FiHome, FiBox, FiCalendar, FiTool, FiLogOut, FiBell, FiCheck, FiCheckCircle, FiUsers } from 'react-icons/fi';
import './Layout.css';

const Layout = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);

    const fetchNotifications = useCallback(() => {
        if (!user) return;
        
        api.get(`/notifications/user/${user.id}`)
            .then(res => {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            })
            .catch(() => {
                // Fallback mock if backend offline
                const mockNotifs = [
                    { id: 1, message: 'Your booking request for Lab A has been Rejected. Reason: Lab maintenance scheduled', read: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
                    { id: 2, message: 'Your booking request for Group Study has been Approved.', read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
                    { id: 3, message: 'James Technician commented on your ticket (Projector starts flickering)', read: false, createdAt: new Date().toISOString() }
                ];
                setNotifications(mockNotifs);
                setUnreadCount(mockNotifs.filter(n => !n.read).length);
            });
    }, [user]);

    // Initial fetch + polling every 15 seconds for real-time feel
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id) => {
        api.patch(`/notifications/${id}/read`)
            .then(() => {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            })
            .catch(() => {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            });
    };

    const markAllAsRead = () => {
        api.patch(`/notifications/user/${user.id}/read-all`)
            .then(() => {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            })
            .catch(() => {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            });
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const navLinks = [
        { path: '/', label: 'Overview', icon: <FiHome /> },
        { path: '/resources', label: 'Facilities', icon: <FiBox /> },
        { path: '/bookings', label: 'Bookings', icon: <FiCalendar /> },
        { path: '/tickets', label: 'Tickets', icon: <FiTool /> },
        ...(user?.role === 'TECHNICIAN' ? [{ path: '/technician-dashboard', label: 'My Tasks', icon: <FiTool /> }] : []),
        ...(user?.role === 'ADMIN' ? [{ path: '/users', label: 'Users', icon: <FiUsers /> }] : []),
    ];

    return (
        <div className="layout-root">
            <nav className="glass-navbar">
                <div className="nav-brand">
                    <h2>SmartCampus</h2>
                </div>
                <div className="nav-links">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.path} 
                            to={link.path} 
                            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        >
                            {link.icon} {link.label}
                        </Link>
                    ))}
                </div>
                <div className="nav-actions">
                    <div className="notification-bell" ref={notifRef}>
                        <div className="bell-icon" onClick={() => setShowNotifications(!showNotifications)}>
                            <FiBell size={20} />
                            {unreadCount > 0 && <span className="badge-indicator">{unreadCount}</span>}
                        </div>
                        
                        {showNotifications && (
                            <div className="notifications-dropdown glass-panel animate-fade-in">
                                <div className="notif-dropdown-header">
                                    <h3>Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button className="mark-all-btn" onClick={markAllAsRead} title="Mark all as read">
                                            <FiCheckCircle size={16} /> Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="notifications-list">
                                    {notifications.length === 0 ? (
                                        <p className="no-notifs">You have no notifications.</p>
                                    ) : (
                                        notifications.map(notif => (
                                            <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                                                <div className="notif-content">
                                                    <p>{notif.message}</p>
                                                    <span className="notif-time">{getTimeAgo(notif.createdAt)}</span>
                                                </div>
                                                {!notif.read && (
                                                    <button onClick={() => markAsRead(notif.id)} className="mark-read-btn" title="Mark as Read">
                                                        <FiCheck size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="user-profile">
                        <span className="user-name">{user?.name} ({user?.role})</span>
                        <button onClick={logout} className="btn btn-outline" style={{padding: '0.4rem 0.8rem'}}>
                            <FiLogOut /> Logout
                        </button>
                    </div>
                </div>
            </nav>
            <main className="page-container animate-fade-in">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
