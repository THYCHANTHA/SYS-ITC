document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    if (!studentId) {
        alert('No student ID provided');
        window.location.href = 'students.html';
        return;
    }

    fetchStudentData(studentId);

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset tabs
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                b.classList.add('text-gray-600');
            });
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            // Activate clicked
            e.target.classList.remove('text-gray-600');
            e.target.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            document.getElementById(`tab-${e.target.dataset.tab}`).classList.remove('hidden');
        });
    });

    document.getElementById('print-transcript-btn').addEventListener('click', () => {
        // We can reuse the logic from documents.js or just redirect
        // Since documents.html is a separate page, maybe redirecting there with pre-selected student is best?
        // Or we can implement a direct print here.
        // Let's redirect to documents.html for now as it has the print layout.
        // But documents.html needs to know which student to select.
        // I'll just show a message for now or implement a quick fetch.
        // Actually, let's just use the API to get data and print it in a new window.
        window.open(`documents.html?student_id=${studentId}`, '_blank');
    });
});

async function fetchStudentData(id) {
    const token = localStorage.getItem('token');
    try {
        // 1. Profile Info
        const profileRes = await fetch(`/api/students/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = await profileRes.json();
        renderProfile(profile);

        // 2. Academics (Transcript Data)
        const transRes = await fetch(`/api/documents/transcript/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transData = await transRes.json();
        renderAcademics(transData.grades);

        // 3. Finance (We need an endpoint for specific student fees, or filter the list)
        // We can use the existing /api/financial/student-fees and filter in JS (not efficient but works for now)
        // Or create a specific endpoint. Let's try to filter.
        const feesRes = await fetch('/api/financial/student-fees', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allFees = await feesRes.json();
        const studentFees = allFees.filter(f => f.student_id === id); // Note: API returns flat list, might need checking ID field name
        // Actually the API returns joined data. Let's check `financialController.ts`.
        // `getStudentFees` returns `s.student_id_card`. It doesn't return `student_id` (UUID) explicitly in the SELECT list I wrote earlier?
        // Let's check `financialController.ts`.
        // It selects `sf.*`. So `student_id` is there.
        renderFinance(studentFees);

    } catch (error) {
        console.error(error);
        toast.error('Failed to load student data');
    }
}

function renderProfile(s) {
    document.getElementById('profile-name').textContent = `${s.last_name} ${s.first_name}`;
    document.getElementById('profile-id').textContent = `ID: ${s.student_id_card}`;
    document.getElementById('profile-dept').textContent = `Department: ${s.department_name || 'N/A'}`;
    document.getElementById('profile-initials').textContent = `${s.last_name[0]}${s.first_name[0]}`;

    document.getElementById('info-gender').textContent = s.gender;
    document.getElementById('info-dob').textContent = new Date(s.dob).toLocaleDateString();
    document.getElementById('info-phone').textContent = s.phone_number;
    document.getElementById('info-email').textContent = s.email; // We might need to fetch user email if not in student table
    document.getElementById('info-gen').textContent = s.generation;
    document.getElementById('info-year').textContent = `Year ${s.year_level}`;
}

function renderAcademics(grades) {
    const tbody = document.getElementById('academics-table');
    tbody.innerHTML = '';
    
    if (grades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-gray-500">No records found.</td></tr>';
        return;
    }

    grades.forEach(g => {
        let grade = 'F';
        const score = parseFloat(g.total_score || 0);
        if (score >= 85) grade = 'A';
        else if (score >= 80) grade = 'B+';
        else if (score >= 70) grade = 'B';
        else if (score >= 65) grade = 'C+';
        else if (score >= 50) grade = 'C';
        else if (score >= 45) grade = 'D';

        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">
                <div class="font-bold">${g.course_name}</div>
                <div class="text-xs text-gray-500">${g.course_code}</div>
            </td>
            <td class="p-3">-</td> <!-- Detail not in transcript API -->
            <td class="p-3">-</td>
            <td class="p-3">-</td>
            <td class="p-3 font-bold">${score.toFixed(2)}</td>
            <td class="p-3 font-bold text-blue-600">${grade}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderFinance(fees) {
    const tbody = document.getElementById('finance-table');
    tbody.innerHTML = '';

    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-500">No records found.</td></tr>';
        return;
    }

    fees.forEach(f => {
        const statusColor = f.status === 'paid' ? 'text-green-600' : 'text-red-600';
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${f.academic_year} (Sem ${f.semester})</td>
            <td class="p-3 font-bold">$${parseFloat(f.total_amount).toFixed(2)}</td>
            <td class="p-3 text-green-600">$${parseFloat(f.paid_amount).toFixed(2)}</td>
            <td class="p-3 text-red-600 font-bold">$${parseFloat(f.balance).toFixed(2)}</td>
            <td class="p-3 font-bold uppercase ${statusColor}">${f.status}</td>
        `;
        tbody.appendChild(row);
    });
}
