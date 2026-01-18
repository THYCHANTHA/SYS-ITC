let allEnrollments = [];
let allPeriods = [];
let allOfferings = [];
let enrollmentStudents = [];
let userRole = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    fetchInitialData();

    document.getElementById('add-enrollment-btn')?.addEventListener('click', () => openEnrollmentModal());
    document.getElementById('close-modal')?.addEventListener('click', closeEnrollmentModal);
    document.getElementById('enrollment-form')?.addEventListener('submit', handleEnrollmentSubmit);
    
    document.getElementById('period-filter')?.addEventListener('change', fetchEnrollments);
    document.getElementById('enroll-period')?.addEventListener('change', updateOfferingSelect);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        // Fetch Periods
        const periodsRes = await fetch('/api/offerings/periods', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!periodsRes.ok) {
            console.error('Periods fetch failed:', periodsRes.status, periodsRes.statusText);
        }
        
        allPeriods = await periodsRes.json();
        console.log('Fetched periods:', allPeriods);
        populatePeriodSelects();

        // Fetch Offerings (for modal)
        console.log('Fetching offerings from /api/offerings...');
        const offeringsRes = await fetch('/api/offerings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Offerings response status:', offeringsRes.status);
        
        if (!offeringsRes.ok) {
            console.error('Offerings fetch failed:', offeringsRes.status, offeringsRes.statusText);
            const errorText = await offeringsRes.text();
            console.error('Error response:', errorText);
        }
        
        allOfferings = await offeringsRes.json();
        console.log('Fetched offerings:', allOfferings);
        
        // Update the offering dropdown now that data is loaded
        updateOfferingSelect();

        // If Admin, fetch students
        if (userRole === 'admin') {
            const studentsRes = await fetch('/api/students', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            enrollmentStudents = await studentsRes.json();
            populateStudentSelect();
        }

        // Initial Fetch of Enrollments
        fetchEnrollments();

    } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

function populatePeriodSelects() {
    const filterSelect = document.getElementById('period-filter');
    const modalSelect = document.getElementById('enroll-period');

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">គ្រប់ឆ្នាំសិក្សា</option>';
        allPeriods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - Semester ${p.semester}`;
            if (p.is_active) option.selected = true;
            filterSelect.appendChild(option);
        });
    }

    if (modalSelect) {
        modalSelect.innerHTML = '';
        allPeriods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - Semester ${p.semester}`;
            if (p.is_active) option.selected = true;
            modalSelect.appendChild(option);
        });
        updateOfferingSelect(); // Trigger offering update based on default period
    }
}

function populateStudentSelect() {
    const select = document.getElementById('enroll-student');
    if (select) {
        select.innerHTML = '<option value="">ជ្រើសរើសនិស្សិត</option>';
        enrollmentStudents.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.student_id_card} - ${s.last_name} ${s.first_name}`;
            select.appendChild(option);
        });
    }
}

function updateOfferingSelect() {
    const periodId = document.getElementById('enroll-period')?.value;
    const select = document.getElementById('enroll-offering');
    
    if (!select) return;

    select.innerHTML = '<option value="">ជ្រើសរើសមុខវិជ្ជា</option>';
    
    const filteredOfferings = allOfferings.filter(o => o.period_id === periodId);
    
    console.log('Enrollment - All offerings:', allOfferings);
    console.log('Enrollment - Filtered offerings:', filteredOfferings);
    console.log('Enrollment - Selected period ID:', periodId);
    
    if (filteredOfferings.length === 0) {
        select.innerHTML += '<option value="" disabled>No courses available for this period</option>';
    } else {
        filteredOfferings.forEach(o => {
            const option = document.createElement('option');
            option.value = o.id;
            const lecturerName = o.lecturer_first_name && o.lecturer_last_name 
                ? `${o.lecturer_first_name} ${o.lecturer_last_name}` 
                : 'TBA';
            option.textContent = `${o.course_code} - ${o.course_name} (${lecturerName})`;
            select.appendChild(option);
        });
    }
}

async function fetchEnrollments() {
    const token = localStorage.getItem('token');
    const periodId = document.getElementById('period-filter')?.value;

    let url = '/api/enrollments?';
    if (periodId) url += `period_id=${periodId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        allEnrollments = await response.json();
        renderEnrollments(allEnrollments);
    } catch (error) {
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

function renderEnrollments(enrollments) {
    const tbody = document.getElementById('enrollment-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (enrollments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    enrollments.forEach(enroll => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        
        const statusColor = enroll.status === 'active' ? 'bg-green-100 text-green-800' : 
                            enroll.status === 'dropped' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${enroll.student_last_name} ${enroll.student_first_name}</div>
                <div class="text-xs text-gray-500">${enroll.student_id_card}</div>
            </td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${enroll.course_name}</div>
                <div class="text-xs text-gray-500">${enroll.course_code}</div>
            </td>
            <td class="px-6 py-4 text-sm">${enroll.lecturer_name || 'TBA'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs font-bold ${statusColor}">${enroll.status.toUpperCase()}</span>
            </td>
            <td class="px-6 py-4 admin-only">
                ${enroll.status === 'active' ? 
                    `<button class="text-red-600 hover:text-red-900 font-bold drop-btn" data-id="${enroll.id}">Drop</button>` : 
                    `<span class="text-gray-400">-</span>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.drop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateEnrollmentStatus(e.target.dataset.id, 'dropped');
        });
    });
}

function openEnrollmentModal() {
    const modal = document.getElementById('enrollment-modal');
    modal.classList.remove('hidden');
    // Reset form logic if needed
}

function closeEnrollmentModal() {
    document.getElementById('enrollment-modal')?.classList.add('hidden');
}

async function handleEnrollmentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        offering_id: document.getElementById('enroll-offering').value,
        student_id: userRole === 'admin' ? document.getElementById('enroll-student').value : null
    };

    const loading = showLoading('កំពុងចុះឈ្មោះ...');

    try {
        const response = await fetch('/api/enrollments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to enroll');
        }

        closeEnrollmentModal();
        fetchEnrollments();
        toast.success('ចុះឈ្មោះបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function updateEnrollmentStatus(id, status) {
    const confirmed = await showConfirm('Drop Course', 'តើអ្នកពិតជាចង់ Drop មុខវិជ្ជានេះមែនទេ?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('Updating...');

    try {
        const response = await fetch(`/api/enrollments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        hideLoading(loading);

        if (response.ok) {
            fetchEnrollments();
            toast.success('Updated successfully!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to update');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error updating enrollment');
    }
}
