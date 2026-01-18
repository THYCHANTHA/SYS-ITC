let isEditingOffering = false;
let allOfferings = [];
let allPeriods = [];
let allCourses = [];
let allLecturers = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchInitialData();

    document.getElementById('add-offering-btn')?.addEventListener('click', () => openOfferingModal());
    document.getElementById('close-modal')?.addEventListener('click', closeOfferingModal);
    document.getElementById('offering-form')?.addEventListener('submit', handleOfferingSubmit);
    
    document.getElementById('period-filter')?.addEventListener('change', fetchOfferings);
    document.getElementById('department-filter')?.addEventListener('change', fetchOfferings);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        // Fetch Periods
        const periodsRes = await fetch('/api/offerings/periods', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allPeriods = await periodsRes.json();
        populatePeriodSelects();

        // Fetch Departments
        const deptsRes = await fetch('/api/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const departments = await deptsRes.json();
        populateDepartmentFilter(departments);

        // Fetch Courses & Lecturers for Modal
        const coursesRes = await fetch('/api/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allCourses = await coursesRes.json();

        const lecturersRes = await fetch('/api/lecturers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allLecturers = await lecturersRes.json();

        // Initial Fetch of Offerings
        fetchOfferings();

    } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

function populatePeriodSelects() {
    const filterSelect = document.getElementById('period-filter');
    const modalSelect = document.getElementById('offering-period');

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">គ្រប់ឆ្នាំសិក្សា</option>';
        allPeriods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - Semester ${p.semester}`;
            if (p.is_active) option.selected = true; // Default to active period
            filterSelect.appendChild(option);
        });
    }

    if (modalSelect) {
        modalSelect.innerHTML = '';
        allPeriods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} - Semester ${p.semester}`;
            modalSelect.appendChild(option);
        });
    }
}

function populateDepartmentFilter(departments) {
    const select = document.getElementById('department-filter');
    if (select) {
        select.innerHTML = '<option value="">គ្រប់ដេប៉ាតឺម៉ង់</option>';
        departments.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.code;
            select.appendChild(option);
        });
    }
}

async function fetchOfferings() {
    const token = localStorage.getItem('token');
    const periodId = document.getElementById('period-filter')?.value;
    const deptId = document.getElementById('department-filter')?.value;

    let url = '/api/offerings?';
    if (periodId) url += `period_id=${periodId}&`;
    if (deptId) url += `department_id=${deptId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        allOfferings = await response.json();
        renderOfferings(allOfferings);
    } catch (error) {
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការទាញយកកាលវិភាគ');
    }
}

function renderOfferings(offerings) {
    const tbody = document.getElementById('schedule-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (offerings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    offerings.forEach(offering => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        
        const lecturerName = offering.lecturer_first_name 
            ? `${offering.lecturer_title || ''} ${offering.lecturer_last_name} ${offering.lecturer_first_name}`
            : '<span class="text-red-500 italic">មិនទាន់ចាត់តាំង</span>';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${offering.course_name}</div>
                <div class="text-xs text-gray-500">${offering.course_code}</div>
            </td>
            <td class="px-6 py-4">${lecturerName}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-gray-100 rounded text-xs font-bold">${offering.room || 'N/A'}</span>
            </td>
            <td class="px-6 py-4 text-sm">${offering.schedule_info || 'N/A'}</td>
            <td class="px-6 py-4 text-sm">${offering.period_name} (Sem ${offering.semester})</td>
            <td class="px-6 py-4 admin-only">
                <button class="text-blue-600 hover:text-blue-900 mr-3 font-bold edit-btn" data-id="${offering.id}">កែប្រែ</button>
                <button class="text-red-600 hover:text-red-900 font-bold delete-btn" data-id="${offering.id}">លុប</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const offering = offerings.find(o => o.id === id);
            if (offering) openOfferingModal(offering);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteOffering(e.target.dataset.id);
        });
    });
}

function openOfferingModal(offering = null) {
    const modal = document.getElementById('offering-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('offering-form');
    
    // Populate Course Select
    const courseSelect = document.getElementById('offering-course');
    courseSelect.innerHTML = '<option value="">ជ្រើសរើសមុខវិជ្ជា</option>';
    allCourses.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.code} - ${c.name}`;
        courseSelect.appendChild(option);
    });

    // Populate Lecturer Select
    const lecturerSelect = document.getElementById('offering-lecturer');
    lecturerSelect.innerHTML = '<option value="">ជ្រើសរើសសាស្ត្រាចារ្យ</option>';
    allLecturers.forEach(l => {
        const option = document.createElement('option');
        option.value = l.id;
        option.textContent = `${l.title || ''} ${l.last_name} ${l.first_name}`;
        lecturerSelect.appendChild(option);
    });

    modal.classList.remove('hidden');

    if (offering) {
        isEditingOffering = true;
        title.textContent = 'កែប្រែកាលវិភាគ';
        document.getElementById('offering-id').value = offering.id;
        document.getElementById('offering-period').value = offering.period_id;
        document.getElementById('offering-course').value = offering.course_id;
        document.getElementById('offering-lecturer').value = offering.lecturer_id || '';
        document.getElementById('offering-room').value = offering.room || '';
        document.getElementById('offering-schedule').value = offering.schedule_info || '';
    } else {
        isEditingOffering = false;
        title.textContent = 'បង្កើតកាលវិភាគថ្មី';
        form.reset();
        // Set default period if available
        const activePeriod = allPeriods.find(p => p.is_active);
        if (activePeriod) {
            document.getElementById('offering-period').value = activePeriod.id;
        }
    }
}

function closeOfferingModal() {
    document.getElementById('offering-modal')?.classList.add('hidden');
}

async function handleOfferingSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('offering-id').value;
    
    const data = {
        period_id: document.getElementById('offering-period').value,
        course_id: document.getElementById('offering-course').value,
        lecturer_id: document.getElementById('offering-lecturer').value || null,
        room: document.getElementById('offering-room').value,
        schedule_info: document.getElementById('offering-schedule').value
    };

    const url = isEditingOffering ? `/api/offerings/${id}` : '/api/offerings';
    const method = isEditingOffering ? 'PUT' : 'POST';
    const loading = showLoading(isEditingOffering ? 'កំពុងកែប្រែ...' : 'កំពុងបង្កើត...');

    try {
        const response = await fetch(url, {
            method,
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

        closeOfferingModal();
        fetchOfferings();
        toast.success(isEditingOffering ? 'កែប្រែបានជោគជ័យ!' : 'បង្កើតកាលវិភាគបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function deleteOffering(id) {
    const confirmed = await showConfirm('លុបកាលវិភាគ', 'តើអ្នកពិតជាចង់លុបកាលវិភាគនេះមែនទេ?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('កំពុងលុប...');

    try {
        const response = await fetch(`/api/offerings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading(loading);

        if (response.ok) {
            fetchOfferings();
            toast.success('លុបបានជោគជ័យ!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'មិនអាចលុបបានទេ');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('មានបញ្ហាក្នុងការលុប');
    }
}
