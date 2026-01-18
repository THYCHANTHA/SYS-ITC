document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username') || 'User';
    
    document.getElementById('user-name').textContent = username;

    if (role === 'admin' || role === 'lecturer') {
        document.getElementById('admin-dashboard').classList.remove('hidden');
        fetchAdminStats();
    } else if (role === 'student') {
        document.getElementById('student-dashboard').classList.remove('hidden');
        fetchStudentStats();
    }
});

async function fetchAdminStats() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();

        // Counts
        document.getElementById('stat-students').textContent = stats.counts.students;
        document.getElementById('stat-courses').textContent = stats.counts.courses;
        document.getElementById('stat-lecturers').textContent = stats.counts.lecturers;

        // Recent Enrollments
        const enrollList = document.getElementById('recent-enrollments');
        enrollList.innerHTML = '';
        if (stats.recentEnrollments.length === 0) {
            enrollList.innerHTML = '<li class="text-gray-500 text-sm">No recent enrollments.</li>';
        } else {
            stats.recentEnrollments.forEach(e => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center border-b pb-2';
                li.innerHTML = `
                    <span class="font-bold text-gray-700">${e.last_name} ${e.first_name}</span>
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${e.code}</span>
                `;
                enrollList.appendChild(li);
            });
        }

        // Finance (Admin only)
        if (stats.finance) {
            const total = parseFloat(stats.finance.total_expected || 0);
            const collected = parseFloat(stats.finance.total_collected || 0);
            const percent = total > 0 ? (collected / total) * 100 : 0;

            document.getElementById('finance-collected').textContent = `$${collected.toFixed(2)}`;
            document.getElementById('finance-total').textContent = `$${total.toFixed(2)}`;
            document.getElementById('finance-bar').style.width = `${percent}%`;
        }

    } catch (error) {
        console.error(error);
    }
}

async function fetchStudentStats() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();

        document.getElementById('st-courses').textContent = stats.enrolledCourses;
        document.getElementById('st-fees').textContent = `$${parseFloat(stats.totalDue).toFixed(2)}`;

        const examList = document.getElementById('upcoming-exams');
        examList.innerHTML = '';
        if (stats.upcomingExams.length === 0) {
            examList.innerHTML = '<li class="text-gray-500 text-sm">No upcoming exams.</li>';
        } else {
            stats.upcomingExams.forEach(e => {
                const date = new Date(e.exam_date).toLocaleDateString();
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center border-b pb-2';
                li.innerHTML = `
                    <div>
                        <div class="font-bold text-gray-800">${e.course_name}</div>
                        <div class="text-xs text-gray-500">${date} at ${e.start_time}</div>
                    </div>
                    <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">Exam</span>
                `;
                examList.appendChild(li);
            });
        }

    } catch (error) {
        console.error(error);
    }
}
