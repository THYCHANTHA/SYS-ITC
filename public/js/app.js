document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || !role) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }
    
    // Display User Role Badge
    const navList = document.querySelector('nav ul');
    if (navList && !document.getElementById('user-role-badge')) {
        const roleLi = document.createElement('li');
        roleLi.id = 'user-role-badge';
        roleLi.className = 'text-white px-3 py-1 rounded bg-opacity-20 bg-black font-mono text-sm uppercase';
        roleLi.textContent = role;
        navList.insertBefore(roleLi, navList.lastElementChild);
    }
    
    // Setup Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/login.html';
        });
    }

    // Fetch students if table exists
    if (document.getElementById('student-table-body')) {
        fetchStudents();
    }

    // Apply Role-Based UI
    applyRoleBasedUI();

    // Modal handlers
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeStudentModal);
    }

    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentSubmit);
    }
});

let allDepartments = [];

async function fetchDepartmentsForSelect() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allDepartments = await response.json();
        
        // Populate modal select
        const select = document.getElementById('department_id');
        if (select) {
            select.innerHTML = '';
            allDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = `${dept.code} - ${dept.name}`;
                select.appendChild(option);
            });
        }

        // Populate filter select
        const filterSelect = document.getElementById('department-filter');
        if (filterSelect) {
            // Keep the "All" option and add departments
            const currentValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">គ្រប់ដេប៉ាតឺម៉ង់</option>';
            allDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.code;
                option.textContent = dept.code;
                filterSelect.appendChild(option);
            });
            filterSelect.value = currentValue;
        }
    } catch (error) {
        console.error('Error fetching departments:', error);
    }
}

let allStudents = []; // Store all students for filtering

async function fetchStudents() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(errorData.error || 'Network response was not ok');
        }
        
        const students = await response.json();
        console.log('Fetched students:', students);
        allStudents = students; // Store for filtering
        renderStudentTable(students);
        updateStats(students);
        
        // Populate department filter
        await fetchDepartmentsForSelect();
        
        // Setup filter listeners
        setupFilters();
    } catch (error) {
        console.error('Error fetching students:', error);
        const tableBody = document.getElementById('student-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ។ ' + error.message + '</td></tr>';
        }
    }
}

function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const deptFilter = document.getElementById('department-filter');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (deptFilter) {
        deptFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const deptCode = document.getElementById('department-filter')?.value || '';

    let filtered = allStudents;

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.first_name?.toLowerCase().includes(searchTerm) ||
            s.last_name?.toLowerCase().includes(searchTerm) ||
            s.student_id_card?.toLowerCase().includes(searchTerm)
        );
    }

    // Filter by department
    if (deptCode) {
        filtered = filtered.filter(s => s.department_code === deptCode);
    }

    renderStudentTable(filtered);
    updateStats(filtered);
}

function renderStudentTable(students) {
    const tableBody = document.getElementById('student-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (students.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យនិស្សិតទេ។</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b border-gray-100 transition';
        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900">#${student.student_id_card || student.id}</td>
            <td class="px-6 py-4 font-bold">${student.last_name} ${student.first_name}</td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}">
                    ${student.gender === 'Male' ? 'ប្រុស' : 'ស្រី'}
                </span>
            </td>
            <td class="px-6 py-4">${student.department_code || 'N/A'}</td>
            <td class="px-6 py-4">${student.generation || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <a href="student-profile.html?id=${student.id}" class="text-green-600 hover:text-green-900 mr-3 font-bold">View Profile</a>
                <button class="text-blue-600 hover:text-blue-900 mr-3 font-bold edit-btn admin-only" data-id="${student.id}">កែប្រែ</button>
                <button class="text-red-600 hover:text-red-900 font-bold delete-btn admin-only" data-id="${student.id}">លុប</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Re-apply role based UI
    setTimeout(applyRoleBasedUI, 0);

    // Add event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openStudentModal(e.target.dataset.id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteStudent(e.target.dataset.id);
        });
    });
}

function updateStats(students) {
    const totalStudentsElement = document.getElementById('total-students');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = students.length;
    }
}

let isEditing = false;

async function openStudentModal(studentId = null) {
    const modal = document.getElementById('student-modal');
    if (!modal) return;

    const title = document.getElementById('modal-title');
    const form = document.getElementById('student-form');
    
    // Always fetch fresh department list
    await fetchDepartmentsForSelect();

    modal.classList.remove('hidden');

    if (studentId) {
        isEditing = true;
        title.textContent = 'កែប្រែព័ត៌មាននិស្សិត';
        document.getElementById('student-id').value = studentId;
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
        const students = await response.json();
        const student = students.find(s => s.id === studentId);
        
        if (student) {
            document.getElementById('student_id_card').value = student.student_id_card;
            document.getElementById('first_name').value = student.first_name;
            document.getElementById('last_name').value = student.last_name;
            document.getElementById('gender').value = student.gender;
            document.getElementById('department_id').value = student.department_id;
            document.getElementById('generation').value = student.generation || '';
        }
    } else {
        isEditing = false;
        title.textContent = 'បន្ថែមនិស្សិតថ្មី';
        form.reset();
        document.getElementById('student-id').value = '';
    }
}

function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const studentId = document.getElementById('student-id').value;
    const data = {
        student_id_card: document.getElementById('student_id_card').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        gender: document.getElementById('gender').value,
        department_id: document.getElementById('department_id').value,
        generation: document.getElementById('generation').value || null
    };

    const url = isEditing ? `/api/students/${studentId}` : '/api/students';
    const method = isEditing ? 'PUT' : 'POST';

    const loading = showLoading(isEditing ? 'កំពុងកែប្រែ...' : 'កំពុងបន្ថែម...');

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

        closeStudentModal();
        fetchStudents();
        toast.success(isEditing ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមនិស្សិតបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function deleteStudent(id) {
    const confirmed = await showConfirm(
        'លុបនិស្សិត',
        'តើអ្នកពិតជាចង់លុបនិស្សិតនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។'
    );
    
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('កំពុងលុប...');

    try {
        const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading(loading);

        if (response.ok) {
            fetchStudents();
            toast.success('លុបនិស្សិតបានជោគជ័យ!');
        } else {
            toast.error('មិនអាចលុបនិស្សិតបានទេ');
        }
    } catch (error) {
        hideLoading(loading);
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការលុបនិស្សិត');
    }
}

function applyRoleBasedUI() {
    const role = localStorage.getItem('role');
    const adminElements = document.querySelectorAll('.admin-only');
    
    if (role !== 'admin') {
        adminElements.forEach(el => {
            el.classList.add('hidden');
        });
    } else {
        adminElements.forEach(el => {
            el.classList.remove('hidden');
        });
    }
}

// Expose functions globally
window.openStudentModal = openStudentModal;
window.deleteStudent = deleteStudent;
