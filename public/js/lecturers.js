let isEditingLecturer = false;
let allLecturers = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchLecturers();
    fetchDepartmentsForFilter();

    document.getElementById('add-lecturer-btn')?.addEventListener('click', () => openLecturerModal());
    document.getElementById('close-modal')?.addEventListener('click', closeLecturerModal);
    document.getElementById('lecturer-form')?.addEventListener('submit', handleLecturerSubmit);
    document.getElementById('department-filter')?.addEventListener('change', applyFilter);
});

async function fetchLecturers() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/lecturers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }
        allLecturers = await response.json();
        renderLecturers(allLecturers);
    } catch (error) {
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

async function fetchDepartmentsForFilter() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const departments = await response.json();
        
        const filterSelect = document.getElementById('department-filter');
        const modalSelect = document.getElementById('lecturer-department');
        
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">គ្រប់ដេប៉ាតឺម៉ង់</option>';
            departments.forEach(dept => {
                filterSelect.innerHTML += `<option value="${dept.id}">${dept.code}</option>`;
            });
        }
        
        if (modalSelect) {
            modalSelect.innerHTML = '';
            departments.forEach(dept => {
                modalSelect.innerHTML += `<option value="${dept.id}">${dept.code} - ${dept.name}</option>`;
            });
        }
    } catch (error) {
        console.error(error);
    }
}

function applyFilter() {
    const deptId = document.getElementById('department-filter')?.value;
    if (!deptId) {
        renderLecturers(allLecturers);
    } else {
        const filtered = allLecturers.filter(l => l.department_id === deptId);
        renderLecturers(filtered);
    }
}

function renderLecturers(lecturers) {
    const tbody = document.getElementById('lecturer-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lecturers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    lecturers.forEach(lec => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        row.innerHTML = `
            <td class="px-6 py-4 font-bold">${lec.title || ''} ${lec.last_name} ${lec.first_name}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">${lec.position || 'Lecturer'}</span></td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">${lec.department_code || 'N/A'}</span></td>
            <td class="px-6 py-4 text-gray-600">${lec.email || 'N/A'}</td>
            <td class="px-6 py-4">${lec.course_count || 0}</td>
            <td class="px-6 py-4 admin-only">
                <button class="text-blue-600 hover:text-blue-900 mr-3 font-bold edit-btn" data-id="${lec.id}">កែប្រែ</button>
                <button class="text-red-600 hover:text-red-900 font-bold delete-btn" data-id="${lec.id}" data-count="${lec.course_count || 0}">លុប</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lec = lecturers.find(l => l.id === e.target.dataset.id);
            if (lec) openLecturerModal(lec);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteLecturer(e.target.dataset.id, parseInt(e.target.dataset.count));
        });
    });
}

function openLecturerModal(lecturer = null) {
    const modal = document.getElementById('lecturer-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('lecturer-form');

    modal.classList.remove('hidden');

    if (lecturer) {
        isEditingLecturer = true;
        title.textContent = 'កែប្រែសាស្ត្រាចារ្យ';
        document.getElementById('lecturer-id').value = lecturer.id;
        document.getElementById('lecturer-title').value = lecturer.title || 'Mr.';
        document.getElementById('lecturer-position').value = lecturer.position || '';
        document.getElementById('lecturer-lastname').value = lecturer.last_name;
        document.getElementById('lecturer-firstname').value = lecturer.first_name;
        document.getElementById('lecturer-email').value = lecturer.email || '';
        document.getElementById('lecturer-department').value = lecturer.department_id || '';
    } else {
        isEditingLecturer = false;
        title.textContent = 'បន្ថែមសាស្ត្រាចារ្យថ្មី';
        form.reset();
    }
}

function closeLecturerModal() {
    document.getElementById('lecturer-modal')?.classList.add('hidden');
}

async function handleLecturerSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const id = document.getElementById('lecturer-id').value;
    const data = {
        title: document.getElementById('lecturer-title').value,
        position: document.getElementById('lecturer-position').value,
        last_name: document.getElementById('lecturer-lastname').value,
        first_name: document.getElementById('lecturer-firstname').value,
        email: document.getElementById('lecturer-email').value,
        username: document.getElementById('lecturer-email').value,
        department_id: document.getElementById('lecturer-department').value
    };

    const url = isEditingLecturer ? `/api/lecturers/${id}` : '/api/lecturers';
    const method = isEditingLecturer ? 'PUT' : 'POST';
    const loading = showLoading(isEditingLecturer ? 'កំពុងកែប្រែ...' : 'កំពុងបន្ថែម...');

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

        closeLecturerModal();
        fetchLecturers();
        toast.success(isEditingLecturer ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមសាស្ត្រាចារ្យបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function deleteLecturer(id, courseCount) {
    if (courseCount > 0) {
        toast.warning(`មិនអាចលុបសាស្ត្រាចារ្យដែលមាន ${courseCount} មុខវិជ្ជាបានទេ។`);
        return;
    }

    const confirmed = await showConfirm('លុបសាស្ត្រាចារ្យ', 'តើអ្នកពិតជាចង់លុបសាស្ត្រាចារ្យនេះមែនទេ?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('កំពុងលុប...');

    try {
        const response = await fetch(`/api/lecturers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading(loading);

        if (response.ok) {
            fetchLecturers();
            toast.success('លុបសាស្ត្រាចារ្យបានជោគជ័យ!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'មិនអាចលុបបានទេ');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('មានបញ្ហាក្នុងការលុប');
    }
}
