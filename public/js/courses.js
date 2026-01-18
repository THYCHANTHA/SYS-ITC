// Course Management JavaScript
let isEditingCourse = false;
let allCourses = [];
let courseDepartments = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchCourses();
    fetchDepartmentsForFilter();

    const addBtn = document.getElementById('add-course-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openCourseModal());
    }

    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCourseModal);
    }

    const form = document.getElementById('course-form');
    if (form) {
        form.addEventListener('submit', handleCourseSubmit);
    }

    const deptFilter = document.getElementById('department-filter');
    if (deptFilter) {
        deptFilter.addEventListener('change', applyDepartmentFilter);
    }
});

async function fetchCourses() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        const courses = await response.json();
        allCourses = courses;
        renderCourses(courses);
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
        courseDepartments = await response.json();
        
        const filterSelect = document.getElementById('department-filter');
        const modalSelect = document.getElementById('course-department');
        
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">គ្រប់ដេប៉ាតឺម៉ង់</option>';
            courseDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.code;
                filterSelect.appendChild(option);
            });
        }

        if (modalSelect) {
            modalSelect.innerHTML = '';
            courseDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = `${dept.code} - ${dept.name}`;
                modalSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching departments:', error);
    }
}

function applyDepartmentFilter() {
    const deptId = document.getElementById('department-filter')?.value;
    
    if (!deptId) {
        renderCourses(allCourses);
    } else {
        const filtered = allCourses.filter(c => c.department_id === deptId);
        renderCourses(filtered);
    }
}

function renderCourses(courses) {
    const tbody = document.getElementById('course-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    courses.forEach(course => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        row.innerHTML = `
            <td class="px-6 py-4 font-bold text-blue-600">${course.code}</td>
            <td class="px-6 py-4 font-medium">${course.name}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                    ${course.credits} ក្រេឌីត
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                    ${course.department_code || 'N/A'}
                </span>
            </td>
            <td class="px-6 py-4 text-gray-600">${course.offering_count || 0}</td>
            <td class="px-6 py-4 admin-only">
                <button class="text-blue-600 hover:text-blue-900 mr-3 font-bold edit-course-btn" data-id="${course.id}">កែប្រែ</button>
                <button class="text-red-600 hover:text-red-900 font-bold delete-course-btn" data-id="${course.id}" data-count="${course.offering_count || 0}">លុប</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) {
        window.applyRoleBasedUI();
    }

    document.querySelectorAll('.edit-course-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const course = courses.find(c => c.id === id);
            if (course) openCourseModal(course);
        });
    });

    document.querySelectorAll('.delete-course-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const count = parseInt(e.target.dataset.count);
            deleteCourse(id, count);
        });
    });
}

function openCourseModal(course = null) {
    const modal = document.getElementById('course-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('course-form');

    if (!modal) return;

    modal.classList.remove('hidden');

    if (course) {
        isEditingCourse = true;
        title.textContent = 'កែប្រែមុខវិជ្ជា';
        document.getElementById('course-id').value = course.id;
        document.getElementById('course-code').value = course.code;
        document.getElementById('course-name').value = course.name;
        document.getElementById('course-credits').value = course.credits;
        document.getElementById('course-department').value = course.department_id;
        document.getElementById('course-description').value = course.description || '';
    } else {
        isEditingCourse = false;
        title.textContent = 'បន្ថែមមុខវិជ្ជាថ្មី';
        form.reset();
        document.getElementById('course-id').value = '';
    }
}

function closeCourseModal() {
    const modal = document.getElementById('course-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleCourseSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const courseId = document.getElementById('course-id').value;
    const data = {
        code: document.getElementById('course-code').value.toUpperCase(),
        name: document.getElementById('course-name').value,
        credits: parseInt(document.getElementById('course-credits').value),
        department_id: document.getElementById('course-department').value,
        description: document.getElementById('course-description').value
    };

    const url = isEditingCourse ? `/api/courses/${courseId}` : '/api/courses';
    const method = isEditingCourse ? 'PUT' : 'POST';

    const loading = showLoading(isEditingCourse ? 'កំពុងកែប្រែ...' : 'កំពុងបន្ថែម...');

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

        closeCourseModal();
        fetchCourses();
        toast.success(isEditingCourse ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមមុខវិជ្ជាបានជោគជ័យ!');
    } catch (error) {
        hideLoading(loading);
        toast.error('កំហុស: ' + error.message);
    }
}

async function deleteCourse(id, offeringCount) {
    if (offeringCount > 0) {
        toast.warning(`មិនអាចលុបមុខវិជ្ជាដែលមាន ${offeringCount} ការបង្រៀនបានទេ។`);
        return;
    }

    const confirmed = await showConfirm(
        'លុបមុខវិជ្ជា',
        'តើអ្នកពិតជាចង់លុបមុខវិជ្ជានេះមែនទេ?'
    );

    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const loading = showLoading('កំពុងលុប...');

    try {
        const response = await fetch(`/api/courses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading(loading);

        if (response.ok) {
            fetchCourses();
            toast.success('លុបមុខវិជ្ជាបានជោគជ័យ!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'មិនអាចលុបមុខវិជ្ជាបានទេ');
        }
    } catch (error) {
        hideLoading(loading);
        console.error(error);
        toast.error('មានបញ្ហាក្នុងការលុបមុខវិជ្ជា');
    }
}
