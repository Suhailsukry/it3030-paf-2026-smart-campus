import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiArrowRight, FiBox, FiCalendar, FiTool } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const cards = [
        { title: 'Browse Facilities', icon: <FiBox size={32} />, path: '/resources', color: 'var(--primary)', desc: 'View available rooms, labs, and equipment.' },
        { title: 'My Bookings', icon: <FiCalendar size={32} />, path: '/bookings', color: 'var(--accent)', desc: 'Manage your active reservations.' },
        { title: 'Support Tickets', icon: <FiTool size={32} />, path: '/tickets', color: 'var(--warning)', desc: 'Report incidents or request maintenance.' },
    ];

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Welcome back, <span className="highlight-text">{user?.name}</span></h1>
                <p>Manage your campus activities efficiently with SmartCampus Hub.</p>
            </header>

            <div className="dashboard-grid">
                {cards.map((card, idx) => (
                    <Link to={card.path} key={idx} className="glass-panel stat-card" style={{animationDelay: `${idx * 0.1}s`}}>
                        <div className="stat-icon" style={{color: card.color}}>
                            {card.icon}
                        </div>
                        <h3>{card.title}</h3>
                        <p>{card.desc}</p>
                        <div className="card-action">
                            <span>Open</span> <FiArrowRight />
                        </div>
                    </Link>
                ))}
            </div>
            
            <div className="glass-panel recent-activity">
                <h3>Recent Activity</h3>
                <div className="empty-state">
                    <p>No recent activity right now.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
