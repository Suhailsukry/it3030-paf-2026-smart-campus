import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiMessageSquare, FiAlertCircle, FiPaperclip, FiX, FiCheck, FiChevronRight, FiSend, FiEdit2, FiTrash2, FiUserPlus } from 'react-icons/fi';
import './Tickets.css';

const Tickets = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [comments, setComments] = useState([]);
    const [resources, setResources] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [toastMessage, setToastMessage] = useState('');
    const [technicians, setTechnicians] = useState([]);
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (user?.role === 'ADMIN') {
             api.get('/users/admin').then(res => {
                 setTechnicians(res.data.filter(u => u.role === 'TECHNICIAN'));
             }).catch(err => console.error("Could not fetch technicians for assignment dropdown", err));
        }
    }, [user]);

    useEffect(() => {
        fetchTickets();
    }, [user]);

    const fetchTickets = () => {
        let endpoint;
        if (user?.role === 'ADMIN') {
            endpoint = '/tickets';
        } else if (user?.role === 'TECHNICIAN') {
            endpoint = `/tickets/technician/${user?.id}`;
        } else {
            endpoint = `/tickets/user/${user?.id}`;
        }
        api.get(endpoint)
            .then(res => {
                setTickets(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Backend offline, using mock data", err);
                const mock = [
                    { id: 1, category: 'Equipment', location: 'IT Store Room', priority: 'HIGH', status: 'IN_PROGRESS', description: 'Projector starts flickering after 10 mins of usage', creator: { id: 2, name: 'John Doe' }, assignee: { id: 3, name: 'James Technician' }, createdAt: new Date().toISOString(), contactDetails: '+94711234567' },
                    { id: 2, category: 'Network', location: 'Building 1 - 1st Floor', priority: 'MEDIUM', status: 'OPEN', description: 'No Wi-Fi signal in the right corner of Lab A', creator: { id: 2, name: 'John Doe' }, assignee: null, createdAt: new Date(Date.now() - 86400000).toISOString(), contactDetails: '+94711234567' }
                ];
                setTickets(mock);
                setLoading(false);
            });

        // Also fetch resources for the dropdown
        api.get('/resources')
            .then(res => setResources(res.data))
            .catch(() => setResources([]));
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        const cleaned = value.replace(/[^0-9]/g, '');
        if (cleaned.length <= 10) {
            e.target.value = cleaned;
            if (cleaned.length > 0 && cleaned.length < 10) {
                setPhoneError(`Enter ${10 - cleaned.length} more number(s)`);
            } else if (cleaned.length === 10) {
                setPhoneError('');
            } else {
                setPhoneError('');
            }
        }
    };

    const handleCreateTicket = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const phone = formData.get('contactDetails');
        
        if (phone && phone.trim() !== '') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone.trim())) {
                setPhoneError('Enter exactly 10 numbers (e.g., 7712345678)');
                return;
            }
        }
        
        setPhoneError('');
        
        const ticketData = {
            creator: { id: user.id },
            location: formData.get('location'),
            category: formData.get('category'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            contactDetails: phone,
            resource: formData.get('resourceId') ? { id: parseInt(formData.get('resourceId')) } : null
        };

        const fd = new FormData();
        fd.append('ticket', new Blob([JSON.stringify(ticketData)], { type: 'application/json' }));
        
        // Attach up to 3 files
        const files = formData.getAll('files');
        files.slice(0, 3).forEach(file => {
            if (file.size > 0) fd.append('files', file);
        });

        api.post('/tickets', fd)
            .then(res => {
                showToast('Ticket created successfully!');
                setShowCreateModal(false);
                fetchTickets();
            })
            .catch(err => {
                console.error("Error creating ticket:", err);
                const errorMsg = err.response?.data?.message || err.response?.data || err.message;

                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    showToast(`Security Error: ${errorMsg}. Please login again.`);
                } else if (err.response) {
                    showToast(`Server Error: ${errorMsg}`);
                } else {
                    // Fallback mock ONLY if server is completely unreachable
                    const newTicket = {
                        id: Date.now(),
                        ...ticketData,
                        creator: { id: user.id, name: user.name },
                        status: 'OPEN',
                        createdAt: new Date().toISOString(),
                        assignee: null
                    };
                    setTickets(prev => [newTicket, ...prev]);
                    setShowCreateModal(false);
                    showToast('Ticket created locally (Backend Offline)');
                }
            });
    };

    const handleStatusChange = (ticketId, newStatus, resolutionNotes = '') => {
        api.patch(`/tickets/${ticketId}/status`, { status: newStatus, resolutionNotes })
            .then(res => {
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus, resolutionNotes } : t));
                if (selectedTicket?.id === ticketId) setSelectedTicket(prev => ({ ...prev, status: newStatus, resolutionNotes }));
                showToast(`Ticket #${ticketId} updated to ${newStatus}`);
            })
            .catch(err => {
                const errorMsg = err.response?.data?.message || err.response?.data || err.message;
                showToast(`Failed to update status: ${errorMsg}`);
            });
    };

    const handleCloseTicket = (ticketId) => {
        api.patch(`/tickets/${ticketId}/close`, { userId: user.id, isAdmin: user.role === 'ADMIN' })
            .then(res => {
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'CLOSED' } : t));
                if (selectedTicket?.id === ticketId) setSelectedTicket(prev => ({ ...prev, status: 'CLOSED' }));
                showToast(`Ticket #${ticketId} has been closed`);
            })
            .catch(err => {
                const errorMsg = err.response?.data?.message || err.response?.data || err.message;
                showToast(`Failed to close ticket: ${errorMsg}`);
            });
    };

    const handleAssignTechnician = (ticketId, techId, techName) => {
        api.patch(`/tickets/admin/${ticketId}/assign`, { assigneeId: techId })
            .then(res => {
                // Status stays OPEN until the technician accepts; only assignee changes
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignee: { id: techId, name: techName } } : t));
                showToast(`Technician assigned to ticket #${ticketId} – awaiting their acceptance.`);
            })
            .catch(err => {
                const errorMsg = err.response?.data?.message || err.response?.data || err.message;
                showToast(`Failed to assign technician: ${errorMsg}`);
            });
    };

    const openTicketDetail = (ticket) => {
        setSelectedTicket(ticket);
        api.get(`/tickets/${ticket.id}/comments`)
            .then(res => setComments(res.data))
            .catch(() => setComments([]));
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const commentData = { user: { id: user.id }, content: newComment };
        
        api.post(`/tickets/${selectedTicket.id}/comments`, commentData)
            .then(res => {
                setComments(prev => [...prev, res.data]);
                setNewComment('');
            })
            .catch(() => {
                const mockComment = { id: Date.now(), user: { id: user.id, name: user.name }, content: newComment, createdAt: new Date().toISOString() };
                setComments(prev => [...prev, mockComment]);
                setNewComment('');
            });
    };

    const handleEditComment = (commentId) => {
        const content = editingComment.content;
        api.put(`/tickets/comments/${commentId}`, { userId: String(user.id), content })
            .then(res => {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, content } : c));
                setEditingComment(null);
            })
            .catch(() => {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, content } : c));
                setEditingComment(null);
            });
    };

    const handleDeleteComment = (commentId) => {
        api.delete(`/tickets/comments/${commentId}?userId=${user.id}`)
            .then(() => setComments(prev => prev.filter(c => c.id !== commentId)))
            .catch(() => setComments(prev => prev.filter(c => c.id !== commentId)));
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'CRITICAL': return 'var(--danger)';
            case 'HIGH': return 'var(--warning)';
            case 'MEDIUM': return 'var(--accent)';
            case 'LOW': return 'var(--success)';
            default: return 'var(--accent)';
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'OPEN': return 'badge-pending';
            case 'IN_PROGRESS': return 'badge-info';
            case 'RESOLVED': return 'badge-active';
            case 'CLOSED': return 'badge-info';
            case 'REJECTED': return 'badge-danger';
            default: return 'badge-info';
        }
    };

    const displayedTickets = tickets.filter(t => filterStatus === 'ALL' || t.status === filterStatus);

    return (
        <div className="tickets-page animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Incident Tickets</h1>
                    <p>Report issues and track maintenance progress.</p>
                </div>
                    {user?.role !== 'TECHNICIAN' && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Raise Ticket</button>
                    )}
            </header>

            {/* Status Filter Tabs */}
            <div className="status-tabs" style={{ marginBottom: '1.5rem' }}>
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        className={`tab-btn ${filterStatus === status ? 'active' : ''}`}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? <div className="loading-state">Loading...</div> : (
                <div className="tickets-grid">
                    {displayedTickets.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No tickets found for this filter.</p>}
                    {displayedTickets.map(ticket => (
                        <div key={ticket.id} className="glass-panel ticket-card" style={{borderLeft: `4px solid ${getPriorityColor(ticket.priority)}`}} onClick={() => openTicketDetail(ticket)}>
                            <div className="ticket-header">
                                <span className="ticket-category">{ticket.category}</span>
                                <span className="ticket-id">#{ticket.id}</span>
                            </div>
                            
                            <h4><FiAlertCircle style={{color: getPriorityColor(ticket.priority)}}/> {ticket.location}</h4>
                            <p className="ticket-desc">{ticket.description}</p>

                            {ticket.assignee && (
                                <p className="ticket-assignee">
                                    <FiUserPlus size={14} /> Assigned to: <strong>{ticket.assignee.name}</strong>
                                </p>
                            )}
                            
                            <div className="ticket-footer">
                                <div className="ticket-stats">
                                    <span title="Priority" style={{color: getPriorityColor(ticket.priority), fontWeight: 600, fontSize: '0.8rem'}}>{ticket.priority}</span>
                                    <span title="Created">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className={`badge ${getStatusBadge(ticket.status)}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Admin Actions */}
                            {user?.role === 'ADMIN' && ticket.status === 'OPEN' && (
                                <div className="admin-ticket-actions" onClick={e => e.stopPropagation()}>
                                    <select 
                                        className="input-field" 
                                        style={{ width: '130px', margin: 0, padding: '0.2rem', fontSize: '0.8rem', height: '32px' }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const techId = parseInt(e.target.value);
                                                const techName = technicians.find(t => t.id === techId)?.name;
                                                handleAssignTechnician(ticket.id, techId, techName);
                                                e.target.value = '';
                                            }
                                        }}
                                        title="Assign Technician"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Assign Tech...</option>
                                        {technicians.map(tech => (
                                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                                        ))}
                                    </select>
                                    <button className="icon-btn reject" title="Reject" onClick={() => handleStatusChange(ticket.id, 'REJECTED', 'Not a valid issue')}><FiX /></button>
                                </div>
                            )}
                            {user?.role === 'ADMIN' && ticket.status === 'IN_PROGRESS' && (
                                <div className="admin-ticket-actions" onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn approve" title="Mark Resolved" onClick={() => handleStatusChange(ticket.id, 'RESOLVED', 'Issue fixed')}><FiCheck /></button>
                                </div>
                            )}
                            {ticket.status === 'RESOLVED' && (
                                <div className="admin-ticket-actions" onClick={e => e.stopPropagation()}>
                                    {(user?.role === 'ADMIN' || ticket.creator?.id === user?.id) ? (
                                        <button className="icon-btn approve" title="Close Ticket" onClick={() => handleCloseTicket(ticket.id)}><FiCheck /></button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && <div className="toast-notification show">{toastMessage}</div>}

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
                        <h2>Raise New Ticket</h2>
                        <form onSubmit={handleCreateTicket}>
                            <div className="input-group">
                                <label className="input-label">Category</label>
                                <select name="category" className="input-field" required>
                                    <option value="">Select Category</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Network">Network</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="HVAC">HVAC / Air Conditioning</option>
                                    <option value="Furniture">Furniture</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Related Resource (Optional)</label>
                                <select name="resourceId" className="input-field">
                                    <option value="">-- No Specific Resource --</option>
                                    {resources.map(res => (
                                        <option key={res.id} value={res.id}>{res.name} ({res.location})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Location / Specific Area</label>
                                <input type="text" name="location" placeholder="E.g., Building 1 - Lab A" className="input-field" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea name="description" placeholder="Describe the issue in detail..." className="input-field" rows="3" required></textarea>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Priority</label>
                                <select name="priority" className="input-field" defaultValue="MEDIUM" required>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Phone Number</label>
                                <input 
                                    type="tel" 
                                    name="contactDetails" 
                                    placeholder="Enter 10-digit phone number"
                                    className="input-field"
                                    onChange={handlePhoneChange}
                                    maxLength={10}
                                />
                                {phoneError && <small style={{color: 'var(--danger)', marginTop: '0.25rem', display: 'block'}}>{phoneError}</small>}
                            </div>
                            <div className="input-group">
                                <label className="input-label">Evidence Images (max 3)</label>
                                <input 
                                    type="file" 
                                    name="files" 
                                    multiple 
                                    accept="image/*" 
                                    className="input-field" 
                                    onChange={(e) => {
                                        if (e.target.files.length > 3) {
                                            showToast("only 3 attachment allowed");
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <small style={{color: 'var(--text-muted)'}}>Attach photos of the damage or error screen</small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ticket Detail Slide-over */}
            {selectedTicket && (
                <div className="modal-backdrop" onClick={() => { setSelectedTicket(null); setComments([]); }}>
                    <div className="ticket-detail-panel glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="detail-header">
                            <div>
                                <h2>Ticket #{selectedTicket.id}</h2>
                                <span className={`badge ${getStatusBadge(selectedTicket.status)}`}>{selectedTicket.status.replace('_', ' ')}</span>
                            </div>
                            <button className="btn btn-outline" onClick={() => { setSelectedTicket(null); setComments([]); }}><FiX /></button>
                        </div>

                        <div className="detail-body">
                            <div className="detail-field">
                                <label>Category</label><span>{selectedTicket.category}</span>
                            </div>
                            <div className="detail-field">
                                <label>Location</label><span>{selectedTicket.location}</span>
                            </div>
                            <div className="detail-field">
                                <label>Priority</label>
                                <span style={{color: getPriorityColor(selectedTicket.priority), fontWeight: 700}}>{selectedTicket.priority}</span>
                            </div>
                            <div className="detail-field">
                                <label>Description</label>
                                <p>{selectedTicket.description}</p>
                            </div>
                            <div className="detail-field">
                                <label>Reporter</label><span>{selectedTicket.creator?.name || 'Unknown'}</span>
                            </div>
                            {selectedTicket.assignee && (
                                <div className="detail-field">
                                    <label>Assigned To</label><span>{selectedTicket.assignee.name}</span>
                                </div>
                            )}
                            {selectedTicket.contactDetails && (
                                <div className="detail-field">
                                    <label>Contact</label><span>{selectedTicket.contactDetails}</span>
                                </div>
                            )}
                            {selectedTicket.resolutionNotes && (
                                <div className="detail-field">
                                    <label>Resolution Notes</label><p>{selectedTicket.resolutionNotes}</p>
                                </div>
                            )}

                            {/* Close Button for RESOLVED tickets */}
                            {selectedTicket.status === 'RESOLVED' && (user?.role === 'ADMIN' || selectedTicket.creator?.id === user?.id) && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{marginTop: '1rem', width: '100%'}}
                                    onClick={() => handleCloseTicket(selectedTicket.id)}
                                >
                                    <FiCheck /> Close Ticket
                                </button>
                            )}

                            {/* Comments Section */}
                            <div className="comments-section">
                                <h3><FiMessageSquare /> Comments ({comments.length})</h3>
                                <div className="comments-list">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-header">
                                                <strong>{comment.user?.name || 'User'}</strong>
                                                <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                                            </div>
                                            {editingComment?.id === comment.id ? (
                                                <div className="comment-edit">
                                                    <input
                                                        type="text"
                                                        value={editingComment.content}
                                                        onChange={e => setEditingComment({ ...editingComment, content: e.target.value })}
                                                        className="input-field"
                                                    />
                                                    <button className="icon-btn approve" onClick={() => handleEditComment(comment.id)}><FiCheck /></button>
                                                    <button className="icon-btn reject" onClick={() => setEditingComment(null)}><FiX /></button>
                                                </div>
                                            ) : (
                                                <div className="comment-body">
                                                    <p>{comment.content}</p>
                                                    {comment.user?.id === user?.id && (
                                                        <div className="comment-actions">
                                                            <button onClick={() => setEditingComment({ id: comment.id, content: comment.content })} title="Edit"><FiEdit2 /></button>
                                                            <button onClick={() => handleDeleteComment(comment.id)} title="Delete"><FiTrash2 /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="comment-input">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Add a comment..."
                                        className="input-field"
                                    />
                                    <button className="btn btn-primary" onClick={handleAddComment}><FiSend /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tickets;
