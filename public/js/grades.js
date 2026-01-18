let allGrades = [];
let allPeriods = [];
let allOfferings = [];
let userRole = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    fetchInitialData();

    document.getElementById('close-modal')?.addEventListener('click', closeGradeModal);
    document.getElementById('grade-form')?.addEventListener('submit', handleGradeSubmit);
    
    document.getElementById('period-filter')?.addEventListener('change', updateOfferingFilter);
    document.getElementById('offering-filter')?.addEventListener('change', fetchGrades);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        // Fetch Periods
        const periodsRes = await fetch('/api/offerings/periods', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allPeriods = await periodsRes.json();
        populatePeriodSelect();

        // Fetch Offerings (Lecturer sees theirs, Admin sees all)
        const offeringsRes = await fetch('/api/offerings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allOfferings = await offeringsRes.json();
        updateOfferingFilter();

        // If student, fetch grades immediately
        if (userRole === 'student') {
            fetchGrades();
        }

    } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

function populatePeriodSelect() {
    const select = document.getElementById('period-filter');
    if (select) {
        select.innerHTML = '<option value="">គ្រប់ឆ្នាំសិក្សា</option>';
        allPeriods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - Semester ${p.semester}`;
            if (p.is_active) option.selected = true;
            select.appendChild(option);
        });
    }
}

function updateOfferingFilter() {
    const periodId = document.getElementById('period-filter')?.value;
    const select = document.getElementById('offering-filter');
    
    if (!select) return;

    select.innerHTML = '<option value="">ជ្រើសរើសមុខវិជ្ជា</option>';
    
    let filtered = allOfferings;
    if (periodId) {
        filtered = filtered.filter(o => o.period_id === periodId);
    }
    
    filtered.forEach(o => {
        const option = document.createElement('option');
        option.value = o.id;
        option.textContent = `${o.course_code} - ${o.course_name}`;
        select.appendChild(option);
    });
}

async function fetchGrades() {
    const token = localStorage.getItem('token');
    const offeringId = document.getElementById('offering-filter')?.value;

    // Students don't need to select an offering to see their transcript
    if (userRole !== 'student' && !offeringId) {
        document.getElementById('grade-table-body').innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">សូមជ្រើសរើសមុខវិជ្ជាដើម្បីមើលពិន្ទុ</td></tr>';
        return;
    }

    let url = '/api/grades?';
    if (offeringId) url += `offering_id=${offeringId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        allGrades = await response.json();
        renderGrades(allGrades);
    } catch (error) {
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការទាញយកពិន្ទុ');
    }
}

function renderGrades(grades) {
    const tbody = document.getElementById('grade-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (grades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    grades.forEach(grade => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        
        const total = parseFloat(grade.total_score || 0).toFixed(2);
        let gradeLetter = 'F';
        let colorClass = 'text-red-600';

        if (total >= 85) { gradeLetter = 'A'; colorClass = 'text-green-600'; }
        else if (total >= 80) { gradeLetter = 'B+'; colorClass = 'text-green-500'; }
        else if (total >= 70) { gradeLetter = 'B'; colorClass = 'text-blue-600'; }
        else if (total >= 65) { gradeLetter = 'C+'; colorClass = 'text-blue-500'; }
        else if (total >= 50) { gradeLetter = 'C'; colorClass = 'text-yellow-600'; }
        else if (total >= 45) { gradeLetter = 'D'; colorClass = 'text-orange-500'; }

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${grade.last_name} ${grade.first_name}</div>
                <div class="text-xs text-gray-500">${grade.student_id_card}</div>
            </td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${grade.course_name}</div>
                <div class="text-xs text-gray-500">${grade.course_code}</div>
            </td>
            <td class="px-6 py-4 text-center">${grade.attendance_score || 0}</td>
            <td class="px-6 py-4 text-center">${grade.midterm_score || 0}</td>
            <td class="px-6 py-4 text-center">${grade.final_score || 0}</td>
            <td class="px-6 py-4 text-center font-bold ${colorClass}">
                ${total} (${gradeLetter})
            </td>
            <td class="px-6 py-4 admin-only">
                <button class="text-blue-600 hover:text-blue-900 font-bold edit-btn" data-id="${grade.id}">ដាក់ពិន្ទុ</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const grade = grades.find(g => g.id === id);
            if (grade) openGradeModal(grade);
        });
    });
}

function openGradeModal(grade) {
    const modal = document.getElementById('grade-modal');
    document.getElementById('grade-id').value = grade.id;
    document.getElementById('student-name-display').textContent = `និស្សិត: ${grade.last_name} ${grade.first_name} (${grade.student_id_card})`;
    
    document.getElementById('score-attendance').value = grade.attendance_score || 0;
    document.getElementById('score-midterm').value = grade.midterm_score || 0;
    document.getElementById('score-final').value = grade.final_score || 0;

    modal.classList.remove('hidden');
}

function closeGradeModal() {
    document.getElementById('grade-modal')?.classList.add('hidden');
}

async function handleGradeSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('grade-id').value;
    
    const data = {
        attendance_score: parseFloat(document.getElementById('score-attendance').value),
        midterm_score: parseFloat(document.getElementById('score-midterm').value),
        final_score: parseFloat(document.getElementById('score-final').value)
    };

    const loading = showLoading('កំពុងរក្សាទុក...');

    try {
        const response = await fetch(`/api/grades/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
        }

        closeGradeModal();
        fetchGrades();
        toast.success('ដាក់ពិន្ទុបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}
