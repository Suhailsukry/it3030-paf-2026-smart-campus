import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiSearch, FiFilter, FiMapPin, FiUsers } from 'react-icons/fi';
import './Resources.css';

const Resources = () => {
    const { user } = useContext(AuthContext);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [bookingModal, setBookingModal] = useState(null); // stores the resource being booked
    const [showAddModal, setShowAddModal] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        // Attempt to fetch from API, fallback to mock if backend not running
        api.get('/resources')
            .then(res => {
                setResources(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.log("Using mock data for Resources (backend might be down)", err);
                setResources([
                    { id: 1, name: 'Lab A', type: 'Lab', capacity: 30, location: 'Building 1', status: 'ACTIVE', availabilityWindows: 'Mon-Fri 08:00-18:00' },
                    { id: 2, name: 'Lecture Hall B', type: 'Lecture Hall', capacity: 150, location: 'Building 2', status: 'ACTIVE', availabilityWindows: 'Mon-Fri 08:00-20:00' },
                    { id: 3, name: '4K Projector', type: 'Equipment', capacity: null, location: 'Store Room', status: 'ACTIVE', availabilityWindows: '24/7' },
                    { id: 4, name: 'Meeting Rm C', type: 'Meeting Room', capacity: 10, location: 'Building 1', status: 'OUT_OF_SERVICE', availabilityWindows: 'Mon-Fri' },
                    { id: 5, name: 'Main Auditorium', type: 'Lecture Hall', capacity: 400, location: 'Building 3', status: 'ACTIVE', availabilityWindows: 'Mon-Sun 08:00-22:00' },
                    { id: 6, name: 'Robotics Lab', type: 'Lab', capacity: 25, location: 'Building 2', status: 'ACTIVE', availabilityWindows: 'Mon-Fri 09:00-17:00' },
                    { id: 7, name: 'Oculus VR Kit', type: 'Equipment', capacity: null, location: 'IT Store', status: 'ACTIVE', availabilityWindows: 'Max 3 Days' },
                    { id: 8, name: 'Sony A7IV Camera', type: 'Equipment', capacity: null, location: 'Media Studio', status: 'ACTIVE', availabilityWindows: 'Mon-Fri 10:00-16:00' },
                    { id: 9, name: 'Conference Alpha', type: 'Meeting Room', capacity: 20, location: 'Building 1', status: 'ACTIVE', availabilityWindows: 'Mon-Fri 08:00-18:00' },
                    { id: 10, name: 'Mac Lab', type: 'Lab', capacity: 40, location: 'Building 2', status: 'UNDER_MAINTENANCE', availabilityWindows: 'Unavailable' }
                ]);
                setLoading(false);
            });
    }, []);

    const filtered = resources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType ? r.type === filterType : true;
        const matchesLocation = filterLocation ? r.location.includes(filterLocation) : true;
        return matchesSearch && matchesType && matchesLocation;
    });

    const handleBookNow = (e, resource) => {
        e.preventDefault();
        setBookingModal(resource);
    };

    const submitBooking = (e) => {
        e.preventDefault();
        
        let startRaw = e.target[0].value;
        let endRaw = e.target[1].value;
        const purpose = e.target[2].value;
        const attendeesRaw = e.target[3] ? e.target[3].value : 0;
        
        // Ensure standard ISO formatting for Java's LocalDateTime parsing
        if (startRaw && startRaw.length === 16) startRaw += ":00";
        if (endRaw && endRaw.length === 16) endRaw += ":00";
        
        const start = new Date(startRaw).getTime();
        const end = new Date(endRaw).getTime();

        if (start >= end) {
            setToastMessage("Error: End time must be after start time!");
            setTimeout(() => setToastMessage(''), 4000);
            return;
        }
        
        const newBookingAPI = {
             user: { id: user.id },
             resource: { id: bookingModal.id },
             startDateTime: startRaw,
             endDateTime: endRaw,
             purpose: purpose,
             expectedAttendees: parseInt(attendeesRaw) || 0
        };

        api.post('/bookings', newBookingAPI)
           .then(res => {
               setToastMessage(`Database updated: Booking requested for ${bookingModal.name}!`);
               setBookingModal(null);
               setTimeout(() => setToastMessage(''), 4000);
           })
           .catch(err => {
               // Fallback conflict detection if backend offline
               if (err.response && err.response.status === 400) {
                    const errorMsg = err.response.data?.message || err.response.data || "this time is booked in this place book another time";
                    setToastMessage(errorMsg);
                    setTimeout(() => setToastMessage(''), 4000);
                    return;
               }
               
               console.error("Backend offline, doing local mock insert:", err);
               const allBookings = JSON.parse(localStorage.getItem('mockBookings') || '[]');
               const hasConflict = allBookings.some(b => {
                    if (b.resource.id === bookingModal.id && (b.status === 'APPROVED' || b.status === 'PENDING')) {
                        const bStart = new Date(b.startDateTime).getTime();
                        const bEnd = new Date(b.endDateTime).getTime();
                        return (start < bEnd && end > bStart);
                    }
                    return false;
               });

               if (hasConflict) {
                    setToastMessage("this time is booked in this place book another time");
                    setTimeout(() => setToastMessage(''), 4000);
                    return;
               }

               const newBookingMock = {
                    id: Date.now(),
                    userId: user.id,
                    user: { id: user.id },
                    resource: { id: bookingModal.id, name: bookingModal.name },
                    startDateTime: startRaw,
                    endDateTime: endRaw,
                    purpose: purpose,
                    status: 'PENDING',
                    expectedAttendees: parseInt(attendeesRaw) || 0
               };
               allBookings.push(newBookingMock);
               localStorage.setItem('mockBookings', JSON.stringify(allBookings));

               setToastMessage(`Mock DB updated: Booking created for ${bookingModal.name}.`);
               setBookingModal(null);
               setTimeout(() => setToastMessage(''), 4000);
           });
    };

    const handleCreateResource = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newResource = {
            name: formData.get('name'),
            type: formData.get('type'),
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null,
            location: formData.get('location'),
            availabilityWindows: formData.get('availabilityWindows'),
            status: formData.get('status') || 'ACTIVE'
        };

        api.post('/resources/admin', newResource)
            .then(res => {
                setResources(prev => [...prev, res.data]);
                setShowAddModal(false);
                setToastMessage('Facility added successfully!');
                setTimeout(() => setToastMessage(''), 4000);
            })
            .catch(err => {
                console.error("Error adding resource:", err);
                const mockResource = { id: Date.now(), ...newResource };
                setResources(prev => [...prev, mockResource]);
                setShowAddModal(false);
                setToastMessage('Facility added locally (Backend Offline)');
                setTimeout(() => setToastMessage(''), 4000);
            });
    };

    return (
        <div className="resources-page animate-fade-in">
            <header className="page-header">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%'}}>
                    <div>
                        <h1>Facilities & Assets</h1>
                        <p>Browse and locate campus resources.</p>
                    </div>
                    {user?.role === 'ADMIN' && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Facility</button>
                    )}
                </div>
                <div className="action-bar flex-wrap">
                    <div className="search-box">
                        <FiSearch className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search by name..." 
                            className="input-field"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <select className="input-field select-filter" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="Lab">Lab</option>
                        <option value="Lecture Hall">Lecture Hall</option>
                        <option value="Meeting Room">Meeting Room</option>
                        <option value="Equipment">Equipment</option>
                    </select>

                    <select className="input-field select-filter" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                        <option value="">All Locations</option>
                        <option value="Building 1">Building 1</option>
                        <option value="Building 2">Building 2</option>
                        <option value="Store Room">Store Room</option>
                    </select>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">Loading resources...</div>
            ) : (
                <div className="resource-grid">
                    {filtered.map(resource => (
                        <div key={resource.id} className="glass-panel resource-card">
                            <div className="card-top">
                                <span className={`badge ${resource.status === 'ACTIVE' ? 'badge-active' : 'badge-danger'}`}>
                                    {resource.status.replace('_', ' ')}
                                </span>
                                <h3>{resource.name}</h3>
                                <p className="resource-type">{resource.type}</p>
                            </div>
                            
                            <div className="card-details">
                                <div className="detail-item">
                                    <FiMapPin /> {resource.location}
                                </div>
                                {resource.capacity && (
                                    <div className="detail-item">
                                        <FiUsers /> Up to {resource.capacity} people
                                    </div>
                                )}
                            </div>
                            
                            <div className="card-footer">
                                <p className="availability">{resource.availabilityWindows}</p>
                                {/* Only show Book Now button to basic users, Admin manages behind the scenes */}
                                {user?.role === 'USER' && (
                                    <button 
                                        className="btn btn-primary" 
                                        disabled={resource.status !== 'ACTIVE'}
                                        onClick={(e) => handleBookNow(e, resource)}
                                    >
                                        Book Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Booking Modal */}
            {bookingModal && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content animate-fade-in">
                        <h3>Book {bookingModal.name}</h3>
                        <form onSubmit={submitBooking} className="booking-form">
                            <div className="input-group">
                                <label className="input-label">Date & Time Start</label>
                                <input type="datetime-local" className="input-field" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Date & Time End</label>
                                <input type="datetime-local" className="input-field" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Purpose</label>
                                <input type="text" placeholder="E.g., Group Study" className="input-field" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Expected Attendees</label>
                                <input type="number" min="0" placeholder="Number of attendees" className="input-field" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setBookingModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Confirm Booking</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Facility Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content animate-fade-in" style={{maxHeight: '90vh', overflowY: 'auto'}}>
                        <h3>Add New Facility</h3>
                        <form onSubmit={handleCreateResource} className="booking-form">
                            <div className="input-group">
                                <label className="input-label">Facility Name</label>
                                <input name="name" type="text" className="input-field" placeholder="e.g., Physics Lab" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Type</label>
                                <select name="type" className="input-field" required>
                                    <option value="">Select Type</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Lecture Hall">Lecture Hall</option>
                                    <option value="Meeting Room">Meeting Room</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Capacity (Optional)</label>
                                <input name="capacity" type="number" className="input-field" min="1" placeholder="e.g., 30" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Location</label>
                                <input name="location" type="text" className="input-field" placeholder="e.g., Building 1" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Availability Windows</label>
                                <input name="availabilityWindows" type="text" className="input-field" placeholder="e.g., Mon-Fri 08:00-18:00" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Initial Status</label>
                                <select name="status" className="input-field" defaultValue="ACTIVE" required>
                                    <option value="ACTIVE">Active</option>
                                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                                    <option value="OUT_OF_SERVICE">Out of Service</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Facility</button>
                            </div>
                        </form>
                    </div>
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

export default Resources;
