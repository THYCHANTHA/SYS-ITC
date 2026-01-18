# ITC Student Management System (ITC-SMS)

**Project Title:** ITC Student Management System (Backend)
**Technology Stack:** Node.js (Express), PostgreSQL, REST API, TypeScript.

---

## 📋 Project Overview

This project is a backend system for managing student data at the Institute of Technology of Cambodia (ITC). It follows the MVC architecture and provides a REST API for managing students, courses, enrollments, and grades.

### User Roles
- **Admin (TP/Office):** Manage students, courses, and lecturers.
- **Lecturer:** View assigned courses and input marks.
- **Student:** View profile and transcript.

---

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JSON Web Tokens (JWT) & bcrypt
- **Language:** TypeScript

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (LTS version)
- PostgreSQL
- pgAdmin 4 (Optional, for DB management)
- Postman (For API testing)

### 2. Installation

1.  **Clone the repository** (or navigate to project folder):
    ```bash
    cd d:/Antigravity
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    DB_USER=postgres
    DB_HOST=localhost
    DB_NAME=itc_sms
    DB_PASSWORD=your_password
    DB_PORT=5432
    JWT_SECRET=your_jwt_secret_key
    ```

### 3. Database Setup

Run the SQL scripts located in `database/schema.sql` to create the necessary tables:
- Departments
- Users (Auth)
- Students
- Courses
- Enrollments
- Marks

### 4. Running the Server

- **Development Mode** (Auto-restart):
    ```bash
    npm run dev
    ```
- **Production Build**:
    ```bash
    npm run build
    npm start
    ```

---

## 📂 Project Structure

```text
/src
  /config      # Database connection (db.ts)
  /controllers # Business logic
  /routes      # API Endpoints
  /middleware  # Auth & Validation middleware
  /utils       # Helper functions
  server.ts    # Entry point
```

---

## 🔌 API Endpoints (Roadmap)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT

### Students
- `GET /api/students` - Get all students (Filter by Dept, ID)
- `POST /api/students` - Add new student (Admin)
- `PUT /api/students/:id` - Update student info

### Courses & Enrollment
- `POST /api/courses` - Create new course
- `POST /api/enroll` - Enroll student in course

### Grading
- `POST /api/marks` - Input marks (Lecturer)
- `GET /api/transcript/:id` - Get student transcript

---

## 🧪 Testing

Use **Postman** to test the endpoints.
- Ensure you include the `Authorization: Bearer <token>` header for protected routes.

---

## 📝 License

ISC
