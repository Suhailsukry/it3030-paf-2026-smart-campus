import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiCalendar, FiClock, FiCheck, FiX, FiFilter } from 'react-icons/fi';
import './Bookings.css';

const Bookings = () => {
    const { user } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        const fetchBookings = user.role === 'ADMIN' 
            ? api.get('/bookings') 
            : api.get(`/bookings/user/${user.id}`);
            
        fetchBookings
            .then(res => {
                setBookings(res.data);
                setLoading(false);
            })
            .catch(err => {
                // Fallback to local storage or mock if DB is strictly offline
                console.error("Database offline, falling back locally:", err);
                const storedBookings = localStorage.getItem('mockBookings');
                if (storedBookings) {
                    let parsed = JSON.parse(storedBookings);
                    setBookings(user.role === 'ADMIN' ? parsed : parsed.filter(b => b.userId === user.id || b.user?.id === user.id));
                }
                setLoading(false);
            });
    }, [user]);

    const handleAction = (id, newStatus, reason = null) => {
        // Attempt to update Database
        api.patch(`/bookings/admin/${id}/status`, { status: newStatus, reason: reason || 'Processed by Admin' })
            .then(res => {
                const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
                setBookings(updated);
            })
            .catch(err => {
                console.error("DB update failed:", err);
                if (err.response) {
                    const errorMsg = err.response.data?.message || err.response.data || err.message;
                    alert(`Action failed: ${errorMsg}`);
                    return;
                }
                
                // Fallback ONLY if backend completely offline
                const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
                setBookings(updated);
                
                const allStored = JSON.parse(localStorage.getItem('mockBookings') || '[]');
                const globallyUpdated = allStored.map(b => b.id === id ? { ...b, status: newStatus } : b);
                localStorage.setItem('mockBookings', JSON.stringify(globallyUpdated));
            });
    };

    const displayedBookings = bookings.filter(b => filterStatus === 'ALL' || b.status === filterStatus);

    const getStatusClass = (status) => {
        switch(status) {
            case 'APPROVED': return 'badge-active';
            case 'PENDING': return 'badge-pending';
            case 'REJECTED': return 'badge-danger';
            case 'CANCELLED': return 'badge-info';
            default: return 'badge-info';
        }
    };

    return (
        <div className="bookings-page animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>{user?.role === 'ADMIN' ? 'All Bookings' : 'My Bookings'}</h1>
                    <p>Track and manage {user?.role === 'ADMIN' ? 'all' : 'your'} resource reservations.</p>
                </div>
                
                <div className="status-tabs">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => (
                        <button 
                            key={status}
                            className={`tab-btn ${filterStatus === status ? 'active' : ''}`}
                            onClick={() => setFilterStatus(status)}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? <div className="loading-state">Loading...</div> : (
                <div className="bookings-list">
                    {displayedBookings.length === 0 ? (
                        <div className="glass-panel" style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>
                            No bookings found for this filter.
                        </div>
                    ) : displayedBookings.map(booking => (
                        <div key={booking.id} className="glass-panel booking-card">
                            <div className="booking-info">
                                <h3>{booking.resource.name}</h3>
                                <p className="purpose">{booking.purpose}</p>
                                
                                <div className="booking-meta">
                                    <span className="meta-item"><FiCalendar /> {new Date(booking.startDateTime).toLocaleDateString()}</span>
                                    <span className="meta-item"><FiClock /> {new Date(booking.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(booking.endDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                {booking.reviewReason && <p className="review-reason">Reason: {booking.reviewReason}</p>}
                            </div>
                            
                            <div className="booking-status-actions">
                                <span className={`badge ${getStatusClass(booking.status)}`}>
                                    {booking.status}
                                </span>
                                
                                {user?.role === 'ADMIN' && booking.status === 'PENDING' && (
                                    <div className="admin-actions">
                                        <button onClick={() => handleAction(booking.id, 'APPROVED')} className="icon-btn approve" title="Approve"><FiCheck /></button>
                                        <button onClick={() => handleAction(booking.id, 'REJECTED', 'Rejected logically by Admin')} className="icon-btn reject" title="Reject"><FiX /></button>
                                    </div>
                                )}
                                
                                {user?.role === 'USER' && booking.status === 'APPROVED' && (
                                    <button onClick={() => handleAction(booking.id, 'CANCELLED', 'User cancelled')} className="btn btn-outline" style={{padding: '0.2rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem'}}>
                                        Cancel Booking
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Bookings;
