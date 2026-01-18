# 🎓 ITC Student Management System - Project Summary

## 📌 Project Overview
The **ITC Student Management System (SMS)** is a comprehensive web-based platform designed to digitize and streamline the academic and administrative operations of the Institute of Technology of Cambodia (ITC). It serves three primary user roles: **Administrators**, **Lecturers**, and **Students**.

## 🏗️ System Architecture
*   **Frontend:**
    *   **HTML5 & Tailwind CSS:** For a responsive, modern, and clean user interface.
    *   **Vanilla JavaScript (ES6+):** For dynamic client-side logic, API interactions, and DOM manipulation.
    *   **Design:** Follows a consistent blue/white color scheme with clear navigation and role-based visibility.
*   **Backend:**
    *   **Node.js & Express:** Robust RESTful API server.
    *   **TypeScript:** Ensures type safety and code maintainability.
    *   **PostgreSQL:** Relational database for structured data storage.
    *   **Authentication:** JWT (JSON Web Tokens) for secure, stateless authentication.

## ✅ Implemented Modules (100% Complete)

### 1. **Core System**
*   **Authentication:** Secure Login/Register with password hashing (bcrypt) and JWT.
*   **Dashboard:** Real-time statistics, financial overview, and personalized student views.
*   **Navigation:** Consistent, responsive navigation bar across all 15+ pages.

### 2. **Academic Management**
*   **Students:** Full CRUD, search, and a detailed **360° Student Profile** (Personal, Academic, Financial).
*   **Departments:** Management of academic departments.
*   **Courses:** Course catalog management.
*   **Lecturers:** Staff management and assignment.
*   **Schedule:** Course offering management and class scheduling.
*   **Enrollment:** Student course registration handling.

### 3. **Evaluation & Tracking**
*   **Grades:** Grade entry (Attendance, Midterm, Final) and calculation.
*   **Attendance:** Daily session tracking and reporting.
*   **Exams:** Exam scheduling and seat allocation generation.
*   **Assignments:** Assignment creation and student submission portal.

### 4. **Administrative & Financial**
*   **Fees & Finance:** Fee structure definition, invoice generation, and payment tracking.
*   **Documents:** Automatic generation of official transcripts and reports.
*   **Messages:** Internal messaging system for communication between users.
*   **Settings:** User profile management and password updates.

## 🚀 Setup & Installation
1.  **Database:** Ensure PostgreSQL is running and the schema is applied (see `database/schema.sql`).
2.  **Environment:** Configure `.env` with DB credentials and `JWT_SECRET`.
3.  **Install:** Run `npm install` to install dependencies.
4.  **Run:** Execute `npm run dev` to start the server.
5.  **Access:** Open `http://localhost:3000` in your browser.

## 👥 User Roles & Permissions
*   **Admin:** Full access to all modules (CRUD on data, settings, etc.).
*   **Lecturer:** Access to assigned courses, grading, attendance, and messaging.
*   **Student:** View-only access to their profile, grades, schedule, and fees; can submit assignments.

## 🔮 Future Enhancements
*   **Notifications:** Email/SMS integration for alerts.
*   **Advanced Reporting:** Data visualization for academic performance trends.
*   **Mobile App:** A dedicated mobile interface for students.

---
**Status:** ✅ **COMPLETED**
**Last Updated:** November 2025
ational and integrated for academic use.** 🎓
