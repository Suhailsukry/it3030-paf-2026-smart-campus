import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    FiCheck, FiX, FiAlertCircle, FiUser, FiMapPin,
    FiClock, FiRefreshCw, FiTool, FiSend
} from 'react-icons/fi';
import './TechnicianDashboard.css';

/* ────────────────────────────────────────────────────────────
   Helper functions
   ──────────────────────────────────────────────────────────── */
const getPriorityColor = (priority) => {
    switch (priority) {
        case 'CRITICAL': return 'var(--danger)';
        case 'HIGH':     return 'var(--warning)';
        case 'MEDIUM':   return 'var(--accent)';
        case 'LOW':      return 'var(--success)';
        default:         return 'var(--accent)';
    }
};

const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'OPEN':        return 'badge-pending';
        case 'IN_PROGRESS': return 'badge-info';
        case 'RESOLVED':    return 'badge-active';
        case 'REJECTED':    return 'badge-danger';
        default:            return 'badge-info';
    }
};

/**
 * A ticket is "awaiting technician action" when:
 *   - status is IN_PROGRESS (admin assigned it – may have auto-set IN_PROGRESS)
 *     AND there are no resolutionNotes (technician has not yet explicitly accepted)
 * OR
 *   - status is OPEN and an assignee exists (admin assigned but kept OPEN)
 *
 * Once the technician clicks Accept, we store resolutionNotes so the card switches
 * to "working on it" mode and shows "Mark as Resolved".
 */
const needsTechnicianAction = (ticket) =>
    (ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN') &&
    (!ticket.resolutionNotes || ticket.resolutionNotes.trim() === '');

const isWorking = (ticket) =>
    ticket.status === 'IN_PROGRESS' &&
    ticket.resolutionNotes && ticket.resolutionNotes.trim() !== '';

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */
const TechnicianDashboard = () => {
    const { user } = useContext(AuthContext);

    const [tickets, setTickets]           = useState([]);
    const [loading, setLoading]           = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [toastMessage, setToastMessage] = useState('');

    // Modal state
    // actionModal: { ticketId: number, action: 'ACCEPT' | 'REJECT' | 'RESOLVE' }
    const [actionModal, setActionModal]           = useState(null);
    const [actionDescription, setActionDescription] = useState('');
    const [submitting, setSubmitting]             = useState(false);

    /* ── Data fetching ── */
    const fetchTickets = useCallback(() => {
        if (!user?.id) return;
        setLoading(true);
        api.get(`/tickets/technician/${user.id}`)
            .then(res => {
                setTickets(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching technician tickets:', err);
                // Graceful fallback – mock data so the UI is visible offline
                setTickets([
                    {
                        id: 1,
                        category: 'Equipment',
                        location: 'IT Store Room – Lab B',
                        priority: 'HIGH',
                        status: 'IN_PROGRESS',
                        description: 'Projector starts flickering after 10 minutes of continuous usage.',
                        creator: { id: 2, name: 'John Doe' },
                        assignee: { id: user.id, name: user.name },
                        createdAt: new Date().toISOString(),
                        resolutionNotes: null,
                    },
                    {
                        id: 2,
                        category: 'Network',
                        location: 'Building 1 – 1st Floor',
                        priority: 'MEDIUM',
                        status: 'IN_PROGRESS',
                        description: 'No Wi-Fi signal in the right corner of Lab A.',
                        creator: { id: 4, name: 'Jane Smith' },
                        assignee: { id: user.id, name: user.name },
                        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
                        resolutionNotes: 'Checking router configuration.',
                    },
                ]);
                setLoading(false);
            });
    }, [user]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    /* ── Toast ── */
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4500);
    };

    /* ── Modal helpers ── */
    const openModal = (ticketId, action) => {
        setActionModal({ ticketId, action });
        setActionDescription('');
    };

    const closeModal = () => {
        setActionModal(null);
        setActionDescription('');
    };

    /* ── Submit action ── */
    const handleSubmitAction = () => {
        if (!actionModal) return;
        const { ticketId, action } = actionModal;
        setSubmitting(true);

        if (action === 'RESOLVE') {
            // Use the general status endpoint
            api.patch(`/tickets/${ticketId}/status`, {
                status: 'RESOLVED',
                resolutionNotes: actionDescription || 'Issue resolved.',
            })
                .then(() => {
                    setTickets(prev =>
                        prev.map(t =>
                            t.id === ticketId
                                ? { ...t, status: 'RESOLVED', resolutionNotes: actionDescription || 'Issue resolved.' }
                                : t
                        )
                    );
                    showToast(`✅ Ticket #${ticketId} marked as Resolved. The user has been notified.`);
                    closeModal();
                })
                .catch(() => showToast('Failed to resolve the ticket. Please try again.'))
                .finally(() => setSubmitting(false));
        } else {
            // ACCEPT or REJECT via technician-action endpoint
            api.patch(`/tickets/${ticketId}/technician-action`, {
                action,
                description: actionDescription,
            })
                .then(() => {
                    const newStatus = action === 'ACCEPT' ? 'IN_PROGRESS' : 'REJECTED';
                    setTickets(prev =>
                        prev.map(t =>
                            t.id === ticketId
                                ? { ...t, status: newStatus, resolutionNotes: actionDescription }
                                : t
                        )
                    );
                    const msg =
                        action === 'ACCEPT'
                            ? `✅ Ticket #${ticketId} accepted. The user has been notified you're on it!`
                            : `❌ Ticket #${ticketId} rejected. The user has been notified.`;
                    showToast(msg);
                    closeModal();
                })
                .catch(() => showToast('Action failed. Please try again.'))
                .finally(() => setSubmitting(false));
        }
    };

    /* ── Derived stats ── */
    const awaitingCount  = tickets.filter(needsTechnicianAction).length;
    const workingCount   = tickets.filter(isWorking).length;
    const resolvedCount  = tickets.filter(t => t.status === 'RESOLVED').length;
    const rejectedCount  = tickets.filter(t => t.status === 'REJECTED').length;

    /* ── Filtering ── */
    const getFilteredTickets = () => {
        switch (filterStatus) {
            case 'AWAITING':     return tickets.filter(needsTechnicianAction);
            case 'IN_PROGRESS':  return tickets.filter(isWorking);
            case 'RESOLVED':     return tickets.filter(t => t.status === 'RESOLVED');
            case 'REJECTED':     return tickets.filter(t => t.status === 'REJECTED');
            default:             return tickets;
        }
    };

    const displayedTickets = getFilteredTickets();
    const modalTicket = actionModal ? tickets.find(t => t.id === actionModal.ticketId) : null;

    /* ── Modal copy helpers ── */
    const modalTitle = (action) => {
        if (action === 'ACCEPT')  return { label: 'Accept Ticket',      cls: 'accept' };
        if (action === 'REJECT')  return { label: 'Reject Ticket',      cls: 'reject' };
        if (action === 'RESOLVE') return { label: 'Mark as Resolved',   cls: 'resolve' };
        return { label: '', cls: '' };
    };

    const modalPlaceholder = (action) => {
        if (action === 'ACCEPT')  return 'Describe your plan or initial assessment…';
        if (action === 'REJECT')  return 'Explain why you cannot handle this ticket…';
        if (action === 'RESOLVE') return 'Describe how you resolved the issue…';
        return '';
    };

    const modalLabel = (action) => {
        if (action === 'ACCEPT')  return 'Your Plan / Initial Assessment';
        if (action === 'REJECT')  return 'Reason for Rejection';
        if (action === 'RESOLVE') return 'Resolution Summary';
        return 'Notes';
    };

    /* ─────────────────────────── RENDER ─────────────────────────── */
    return (
        <div className="tech-dashboard animate-fade-in">

            {/* ── Page header ── */}
            <header className="page-header">
                <div>
                    <h1><FiTool style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />My Task Queue</h1>
                    <p>Tickets assigned to you. Accept, work on them, and mark resolved when done.</p>
                </div>
                <button
                    className="btn btn-outline"
                    onClick={fetchTickets}
                    title="Refresh list"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <FiRefreshCw size={16} /> Refresh
                </button>
            </header>

            {/* ── Stats row ── */}
            <div className="tech-stats-row">
                <div className="tech-stat-card glass-panel" onClick={() => setFilterStatus('AWAITING')} style={{ cursor: 'pointer' }}>
                    <span className="tech-stat-num" style={{ color: 'var(--warning)' }}>{awaitingCount}</span>
                    <span className="tech-stat-label">Awaiting Action</span>
                </div>
                <div className="tech-stat-card glass-panel" onClick={() => setFilterStatus('IN_PROGRESS')} style={{ cursor: 'pointer' }}>
                    <span className="tech-stat-num" style={{ color: 'var(--accent)' }}>{workingCount}</span>
                    <span className="tech-stat-label">In Progress</span>
                </div>
                <div className="tech-stat-card glass-panel" onClick={() => setFilterStatus('RESOLVED')} style={{ cursor: 'pointer' }}>
                    <span className="tech-stat-num" style={{ color: 'var(--success)' }}>{resolvedCount}</span>
                    <span className="tech-stat-label">Resolved</span>
                </div>
                <div className="tech-stat-card glass-panel" onClick={() => setFilterStatus('REJECTED')} style={{ cursor: 'pointer' }}>
                    <span className="tech-stat-num" style={{ color: 'var(--danger)' }}>{rejectedCount}</span>
                    <span className="tech-stat-label">Rejected</span>
                </div>
            </div>

            {/* ── Filter tabs ── */}
            <div className="status-tabs" style={{ marginBottom: '1.5rem' }}>
                {[
                    { key: 'ALL',         label: `All (${tickets.length})` },
                    { key: 'AWAITING',    label: `Awaiting (${awaitingCount})` },
                    { key: 'IN_PROGRESS', label: `In Progress (${workingCount})` },
                    { key: 'RESOLVED',    label: `Resolved (${resolvedCount})` },
                    { key: 'REJECTED',    label: `Rejected (${rejectedCount})` },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`tab-btn ${filterStatus === f.key ? 'active' : ''}`}
                        onClick={() => setFilterStatus(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Ticket grid ── */}
            {loading ? (
                <div className="loading-state">Loading your assigned tickets…</div>
            ) : (
                <div className="tickets-grid">
                    {displayedTickets.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                            No tickets found for this filter.
                        </p>
                    )}

                    {displayedTickets.map(ticket => {
                        const awaitingAction = needsTechnicianAction(ticket);
                        const working        = isWorking(ticket);
                        const resolved       = ticket.status === 'RESOLVED';
                        const rejected       = ticket.status === 'REJECTED';

                        return (
                            <div
                                key={ticket.id}
                                className="glass-panel tech-ticket-card"
                                style={{ borderLeft: `4px solid ${getPriorityColor(ticket.priority)}` }}
                            >
                                {/* ─ Card header ─ */}
                                <div className="ticket-header">
                                    <span className="ticket-category">{ticket.category}</span>
                                    <span className="ticket-id">#{ticket.id}</span>
                                </div>

                                {/* ─ Location ─ */}
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-light)', margin: 0 }}>
                                    <FiAlertCircle style={{ color: getPriorityColor(ticket.priority), flexShrink: 0 }} />
                                    {ticket.location}
                                </h4>

                                {/* ─ Description ─ */}
                                <p className="ticket-desc">{ticket.description}</p>

                                {/* ─ Meta: raised by + priority ─ */}
                                <div className="tech-ticket-meta">
                                    <span>
                                        <FiUser size={13} />
                                        <strong>Raised by:</strong>&nbsp;{ticket.creator?.name || 'Unknown'}
                                    </span>
                                    <span>
                                        <FiMapPin size={13} />
                                        {ticket.location}
                                    </span>
                                    <span>
                                        <FiClock size={13} />
                                        {new Date(ticket.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                {/* ─ Technician notes (visible to ticket owner also) ─ */}
                                {ticket.resolutionNotes && ticket.resolutionNotes.trim() !== '' && (
                                    <div className="tech-notes-box">
                                        <span className="tech-notes-label">
                                            {rejected ? 'Rejection Reason' : resolved ? 'Resolution Notes' : 'Your Notes'}
                                            &nbsp;— visible to ticket owner
                                        </span>
                                        <p>{ticket.resolutionNotes}</p>
                                    </div>
                                )}

                                {/* ─ Footer: priority + status badge ─ */}
                                <div className="ticket-footer">
                                    <div className="ticket-stats">
                                        <span style={{ color: getPriorityColor(ticket.priority), fontWeight: 600, fontSize: '0.8rem' }}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                                        {awaitingAction
                                            ? 'AWAITING ACTION'
                                            : ticket.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* ─ Action buttons ─ */}
                                {awaitingAction && (
                                    <div className="tech-action-buttons">
                                        <button
                                            id={`accept-btn-${ticket.id}`}
                                            className="btn tech-btn-accept"
                                            onClick={() => openModal(ticket.id, 'ACCEPT')}
                                        >
                                            <FiCheck /> Accept
                                        </button>
                                        <button
                                            id={`reject-btn-${ticket.id}`}
                                            className="btn tech-btn-reject"
                                            onClick={() => openModal(ticket.id, 'REJECT')}
                                        >
                                            <FiX /> Reject
                                        </button>
                                    </div>
                                )}

                                {working && (
                                    <div className="tech-action-buttons">
                                        <button
                                            id={`resolve-btn-${ticket.id}`}
                                            className="btn tech-btn-resolve"
                                            onClick={() => openModal(ticket.id, 'RESOLVE')}
                                        >
                                            <FiCheck /> Mark as Resolved
                                        </button>
                                    </div>
                                )}

                                {resolved && (
                                    <div className="tech-resolved-strip">
                                        <FiCheck /> Ticket Resolved
                                    </div>
                                )}

                                {rejected && (
                                    <div className="tech-rejected-strip">
                                        <FiX /> Ticket Rejected
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Toast notification ── */}
            {toastMessage && (
                <div className="toast-notification show">{toastMessage}</div>
            )}

            {/* ── Action modal ── */}
            {actionModal && modalTicket && (() => {
                const { label, cls } = modalTitle(actionModal.action);
                return (
                    <div className="modal-backdrop" onClick={closeModal}>
                        <div className="modal glass-panel" onClick={e => e.stopPropagation()}>

                            {/* Title */}
                            <h2 className={`modal-action-title ${cls}`}>
                                {label} &nbsp;
                                <span style={{ fontWeight: 400, opacity: 0.7 }}>— Ticket #{modalTicket.id}</span>
                            </h2>

                            {/* Mini ticket summary */}
                            <div className="modal-ticket-summary glass-panel">
                                <p style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                                    {modalTicket.category}&ensp;·&ensp;{modalTicket.location}
                                </p>
                                <p className="summary-meta">{modalTicket.description}</p>
                                <p className="summary-meta" style={{ marginTop: '0.35rem' }}>
                                    <FiUser size={12} style={{ verticalAlign: 'middle' }} />
                                    &nbsp;Raised by: <strong>{modalTicket.creator?.name || 'Unknown'}</strong>
                                </p>
                            </div>

                            {/* Notes input */}
                            <div className="input-group" style={{ marginTop: '1.5rem' }}>
                                <label className="input-label">{modalLabel(actionModal.action)}</label>
                                <textarea
                                    id="action-description-input"
                                    className="input-field"
                                    rows="4"
                                    placeholder={modalPlaceholder(actionModal.action)}
                                    value={actionDescription}
                                    onChange={e => setActionDescription(e.target.value)}
                                />
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                                    📢 This note will be visible to the ticket owner via notification.
                                </small>
                            </div>

                            {/* Buttons */}
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={closeModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                {actionModal.action === 'ACCEPT' && (
                                    <button
                                        id="confirm-accept-btn"
                                        className="btn tech-btn-accept"
                                        onClick={handleSubmitAction}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Processing…' : <><FiCheck /> Confirm Accept</>}
                                    </button>
                                )}
                                {actionModal.action === 'REJECT' && (
                                    <button
                                        id="confirm-reject-btn"
                                        className="btn tech-btn-reject"
                                        onClick={handleSubmitAction}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Processing…' : <><FiX /> Confirm Reject</>}
                                    </button>
                                )}
                                {actionModal.action === 'RESOLVE' && (
                                    <button
                                        id="confirm-resolve-btn"
                                        className="btn tech-btn-resolve"
                                        onClick={handleSubmitAction}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Processing…' : <><FiSend /> Mark Resolved</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default TechnicianDashboard;
