# Smart Campus Hub - Integrated Management System

## Project Overview
This repository contains the source code for the Smart Campus Hub, a full-stack application developed for the IT3030 - Practical Agile Development (PAF) module.

## Tech Stack
- **Backend:** Spring Boot 3.x (Java 21)
- **Frontend:** React.js (Vite)
- **Database:** MySQL 8.0
- **DevOps:** GitHub Actions (CI/CD)

## Repository Structure
- `/backend`: Spring Boot application containing core business logic and REST APIs.
- `/frontend`: React dashboard and user interface components.
- `.github/workflows`: Automated build and test pipelines.

## Project Progress (Milestone: April 27)
- [x] Initial Project Setup & Architecture
- [x] Branching Strategy Implementation
- [x] CI/CD Pipeline Configuration
- [x] **Module C: Incident Ticketing (Completed)**
- [x] Module A: Facility Management (In Development)
- [x] Module B: Campus Resource Booking (In Development)
- [x] Module D: Notification System (In Development)

## How to Run Locally
1. **Database:** Import the `smart_campus_initial_data.sql` script into your local MySQL instance.
2. **Backend:** Navigate to `/backend`, update `application.properties` with your credentials, and run `mvn spring-boot:run`.
3. **Frontend:** Navigate to `/frontend`, run `npm install` and `npm run dev`.

---
*Maintained by Suhail Sukry (Project Lead)*
