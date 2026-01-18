import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import studentRoutes from './routes/studentRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

import authRoutes from './routes/authRoutes';
import departmentRoutes from './routes/departmentRoutes';
import courseRoutes from './routes/courseRoutes';
import lecturerRoutes from './routes/lecturerRoutes';
import offeringRoutes from './routes/offeringRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import gradeRoutes from './routes/gradeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import financialRoutes from './routes/financialRoutes';
import documentRoutes from './routes/documentRoutes';
import examRoutes from './routes/examRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import communicationRoutes from './routes/communicationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

app.use('/api/students', studentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
