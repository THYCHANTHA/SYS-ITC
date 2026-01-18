// Department CRUD Operations
let isEditingDept = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchDepartments();

    // Add Department Button
    const addBtn = document.getElementById('add-dept-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openDeptModal());
    }

    // Close Modal
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDeptModal);
    }

    // Form Submit
    const form = document.getElementById('dept-form');
    if (form) {
        form.addEventListener('submit', handleDeptSubmit);
    }
});

async function fetchDepartments() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        const depts = await response.json();
        renderDepartments(depts);
    } catch (error) {
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ');
    }
}

function renderDepartments(depts) {
    const tbody = document.getElementById('dept-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (depts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    depts.forEach(dept => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        row.innerHTML = `
            <td class="px-6 py-4 font-bold text-blue-600">${dept.code}</td>
            <td class="px-6 py-4">${dept.name}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    ${dept.student_count || 0} និស្សិត
                </span>
            </td>
            <td class="px-6 py-4 admin-only">
                <button class="text-blue-600 hover:text-blue-900 mr-3 font-bold edit-dept-btn" data-id="${dept.id}">កែប្រែ</button>
                <button class="text-red-600 hover:text-red-900 font-bold delete-dept-btn" data-id="${dept.id}" data-count="${dept.student_count || 0}">លុប</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Apply role-based UI
    if (window.applyRoleBasedUI) {
        window.applyRoleBasedUI();
    }

    // Add event listeners
    document.querySelectorAll('.edit-dept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const dept = depts.find(d => d.id === id);
            if (dept) openDeptModal(dept);
        });
    });

    document.querySelectorAll('.delete-dept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const count = parseInt(e.target.dataset.count);
            deleteDepartment(id, count);
        });
    });
}

function openDeptModal(dept = null) {
    const modal = document.getElementById('dept-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('dept-form');

    if (!modal) return;

    modal.classList.remove('hidden');

    if (dept) {
        // Edit mode
        isEditingDept = true;
        title.textContent = 'កែប្រែដេប៉ាតឺម៉ង់';
        document.getElementById('dept-id').value = dept.id;
        document.getElementById('dept-code').value = dept.code;
        document.getElementById('dept-name').value = dept.name;
    } else {
        // Add mode
        isEditingDept = false;
        title.textContent = 'បន្ថែមដេប៉ាតឺម៉ង់ថ្មី';
        form.reset();
        document.getElementById('dept-id').value = '';
    }
}

function closeDeptModal() {
    const modal = document.getElementById('dept-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleDeptSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const deptId = document.getElementById('dept-id').value;
    const data = {
        code: document.getElementById('dept-code').value.toUpperCase(),
        name: document.getElementById('dept-name').value
    };

    const url = isEditingDept ? `/api/departments/${deptId}` : '/api/departments';
    const method = isEditingDept ? 'PUT' : 'POST';

    const loading = showLoading(isEditingDept ? 'កំពុងកែប្រែ...' : 'កំពុងបន្ថែម...');

    try {
        const response = await fetch(url, {
            method: method,
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

        closeDeptModal();
        fetchDepartments();
        toast.success(isEditingDept ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមដេប៉ាតឺម៉ង់បានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function deleteDepartment(id, studentCount) {
    if (studentCount > 0) {
        toast.warning(`មិនអាចលុបដេប៉ាតឺម៉ង់ដែលមាន ${studentCount} និស្សិតបានទេ។ សូមផ្លាស់ប្តូរនិស្សិតទៅដេប៉ាតឺម៉ង់ផ្សេងជាមុនសិន។`);
        return;
    }

    const confirmed = await showConfirm(
        'លុបដេប៉ាតឺម៉ង់',
        'តើអ្នកពិតជាចង់លុបដេប៉ាតឺម៉ង់នេះមែនទេ?'
    );

    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('កំពុងលុប...');

    try {
        const response = await fetch(`/api/departments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading(loading);

        if (response.ok) {
            fetchDepartments();
            toast.success('លុបដេប៉ាតឺម៉ង់បានជោគជ័យ!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'មិនអាចលុបដេប៉ាតឺម៉ង់បានទេ');
        }
    } catch (error) {
        hideLoading(loading);
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការលុបដេប៉ាតឺម៉ង់');
    }
}
