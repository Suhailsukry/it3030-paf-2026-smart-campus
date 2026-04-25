-- Create Database if it doesn't exist
CREATE DATABASE IF NOT EXISTS smart_campus_db;
USE smart_campus_db;

-- DDL: Create Tables
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    capacity INT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    availability_windows VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    start_date_time DATETIME NOT NULL,
    end_date_time DATETIME NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    expected_attendees INT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    review_reason VARCHAR(500) NULL,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NULL,
    user_id BIGINT NOT NULL, -- Creator
    location VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    contact_details VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    assignee_id BIGINT NULL,
    resolution_notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- DML: Insert Dummy Data
-- Users
INSERT INTO users (email, name, role) VALUES 
('admin@smartcampus.edu', 'System Admin', 'ADMIN'),
('john.doe@student.edu', 'John Doe', 'USER'),
('tech@smartcampus.edu', 'James Technician', 'TECHNICIAN');

-- Resources
INSERT INTO resources (name, type, capacity, location, status, availability_windows) VALUES 
('Lab A', 'Lab', 30, 'Building 1 - 1st Floor', 'ACTIVE', 'Mon-Fri 08:00-18:00'),
('Lecture Hall B', 'Lecture Hall', 150, 'Building 2 - Ground Floor', 'ACTIVE', 'Mon-Fri 08:00-20:00'),
('Projector 4K', 'Equipment', NULL, 'IT Store Room', 'ACTIVE', 'Mon-Sun 08:00-22:00'),
('Meeting Room C', 'Meeting Room', 10, 'Building 1 - 2nd Floor', 'OUT_OF_SERVICE', 'Mon-Fri 08:00-17:00');

-- Bookings
INSERT INTO bookings (resource_id, user_id, start_date_time, end_date_time, purpose, expected_attendees, status, review_reason) VALUES 
(1, 2, '2026-05-10 09:00:00', '2026-05-10 11:00:00', 'Group Study', 5, 'APPROVED', 'Approved by Admin'),
(2, 2, '2026-05-12 14:00:00', '2026-05-12 16:00:00', 'Student Society Meeting', 50, 'PENDING', NULL),
(1, 2, '2026-05-11 10:00:00', '2026-05-11 12:00:00', 'Lab Experiment', 2, 'REJECTED', 'Lab maintenance scheduled');

-- Tickets
INSERT INTO tickets (resource_id, user_id, location, category, description, priority, contact_details, status, assignee_id, resolution_notes) VALUES 
(3, 2, 'IT Store Room', 'Equipment', 'Projector starts flickering after 10 mins of usage', 'HIGH', '+94711234567', 'IN_PROGRESS', 3, NULL),
(1, 2, 'Building 1 - 1st Floor', 'Network', 'No Wi-Fi signal in the right corner', 'MEDIUM', '+94711234567', 'OPEN', NULL, NULL);

-- Ticket Attachments
INSERT INTO ticket_attachments (ticket_id, image_url) VALUES 
(1, '/api/files/sample-flicker.jpg');

-- Comments
INSERT INTO comments (ticket_id, user_id, content) VALUES 
(1, 3, 'Noted, I will try to replace the lamp today.'),
(1, 2, 'Thank you! Let me know when it is ready.');

-- Notifications
INSERT INTO notifications (user_id, message, is_read) VALUES 
(2, 'Your booking request for Lab A has been Rejected. Reason: Lab maintenance scheduled', TRUE),
(2, 'Your booking request for Group Study has been Approved.', FALSE),
(2, 'James Technician commented on your ticket (Projector starts flickering)', FALSE);
