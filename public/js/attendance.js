let allPeriods = [];
let allOfferings = [];
let currentSessions = [];
let currentAttendance = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchInitialData();

    document.getElementById('period-filter')?.addEventListener('change', updateOfferingFilter);
    document.getElementById('offering-filter')?.addEventListener('change', fetchSessions);
    document.getElementById('session-filter')?.addEventListener('change', fetchAttendance);
    
    document.getElementById('new-session-btn')?.addEventListener('click', openSessionModal);
    document.getElementById('close-session-modal')?.addEventListener('click', closeSessionModal);
    document.getElementById('session-form')?.addEventListener('submit', handleCreateSession);
    document.getElementById('save-attendance-btn')?.addEventListener('click', saveAttendance);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        const periodsRes = await fetch('/api/offerings/periods', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allPeriods = await periodsRes.json();
        populatePeriodSelect();

        const offeringsRes = await fetch('/api/offerings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allOfferings = await offeringsRes.json();
        updateOfferingFilter();
    } catch (error) {
        console.error(error);
        toast.error('Failed to load initial data');
    }
}

function populatePeriodSelect() {
    const select = document.getElementById('period-filter');
    select.innerHTML = '<option value="">គ្រប់ឆ្នាំសិក្សា</option>';
    allPeriods.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} - Semester ${p.semester}`;
        if (p.is_active) option.selected = true;
        select.appendChild(option);
    });
}

function updateOfferingFilter() {
    const periodId = document.getElementById('period-filter').value;
    const select = document.getElementById('offering-filter');
    select.innerHTML = '<option value="">ជ្រើសរើសមុខវិជ្ជា</option>';
    
    let filtered = allOfferings;
    if (periodId) {
        filtered = filtered.filter(o => o.period_id === periodId);
    }
    
    console.log('All offerings:', allOfferings);
    console.log('Filtered offerings:', filtered);
    console.log('Selected period ID:', periodId);
    
    if (filtered.length === 0) {
        select.innerHTML += '<option value="" disabled>No courses available for this period</option>';
    } else {
        filtered.forEach(o => {
            const option = document.createElement('option');
            option.value = o.id;
            option.textContent = `${o.course_code} - ${o.course_name}`;
            select.appendChild(option);
        });
    }
    
    // Reset session filter
    document.getElementById('session-filter').innerHTML = '<option value="">ជ្រើសរើសកាលបរិច្ឆេទ</option>';
    hideAttendanceTable();
}

async function fetchSessions() {
    const offeringId = document.getElementById('offering-filter').value;
    const sessionSelect = document.getElementById('session-filter');
    const newBtn = document.getElementById('new-session-btn');
    
    if (!offeringId) {
        sessionSelect.innerHTML = '<option value="">ជ្រើសរើសកាលបរិច្ឆេទ</option>';
        newBtn.classList.add('hidden');
        hideAttendanceTable();
        return;
    }

    newBtn.classList.remove('hidden');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/attendance/sessions?offering_id=${offeringId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentSessions = await response.json();
        
        sessionSelect.innerHTML = '<option value="">ជ្រើសរើសកាលបរិច្ឆេទ</option>';
        
        if (currentSessions.length === 0) {
            sessionSelect.innerHTML += '<option value="" disabled>No sessions yet - create one!</option>';
        } else {
            currentSessions.forEach(s => {
                const date = new Date(s.session_date).toLocaleDateString();
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = `${date} - ${s.topic || 'No Topic'}`;
                sessionSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching sessions:', error);
        toast.error('Failed to load sessions');
        sessionSelect.innerHTML = '<option value="">Error loading sessions</option>';
    }
}

async function fetchAttendance() {
    const sessionId = document.getElementById('session-filter').value;
    if (!sessionId) {
        hideAttendanceTable();
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/attendance/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentAttendance = await response.json();
        renderAttendanceTable(currentAttendance);
    } catch (error) {
        console.error(error);
        toast.error('Failed to load attendance');
    }
}

function renderAttendanceTable(data) {
    const container = document.getElementById('attendance-container');
    const emptyState = document.getElementById('empty-state');
    const tbody = document.getElementById('attendance-table-body');
    
    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">No students enrolled in this course yet.</td></tr>';
        return;
    }

    data.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b';
        
        // Default to 'present' if no status set
        const status = student.status || 'present'; 
        
        row.innerHTML = `
            <td class="px-6 py-4 font-bold text-gray-700">${student.student_id_card}</td>
            <td class="px-6 py-4">${student.last_name} ${student.first_name}</td>
            <td class="px-6 py-4 text-center">
                <input type="radio" name="status-${student.enrollment_id}" value="present" ${status === 'present' ? 'checked' : ''} class="w-4 h-4 text-green-600 focus:ring-green-500">
            </td>
            <td class="px-6 py-4 text-center">
                <input type="radio" name="status-${student.enrollment_id}" value="absent" ${status === 'absent' ? 'checked' : ''} class="w-4 h-4 text-red-600 focus:ring-red-500">
            </td>
            <td class="px-6 py-4 text-center">
                <input type="radio" name="status-${student.enrollment_id}" value="late" ${status === 'late' ? 'checked' : ''} class="w-4 h-4 text-yellow-600 focus:ring-yellow-500">
            </td>
            <td class="px-6 py-4 text-center">
                <input type="radio" name="status-${student.enrollment_id}" value="excused" ${status === 'excused' ? 'checked' : ''} class="w-4 h-4 text-blue-600 focus:ring-blue-500">
            </td>
            <td class="px-6 py-4">
                <input type="text" id="notes-${student.enrollment_id}" value="${student.notes || ''}" class="border rounded px-2 py-1 w-full text-sm" placeholder="Note...">
            </td>
        `;
        tbody.appendChild(row);
    });
}

function hideAttendanceTable() {
    document.getElementById('attendance-container').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
}

function openSessionModal() {
    document.getElementById('session-modal').classList.remove('hidden');
    document.getElementById('session-date').value = new Date().toISOString().split('T')[0];
}

function closeSessionModal() {
    document.getElementById('session-modal').classList.add('hidden');
}

async function handleCreateSession(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const offeringId = document.getElementById('offering-filter').value;
    
    if (!offeringId) {
        toast.error('Please select a course offering first');
        return;
    }
    
    const data = {
        offering_id: offeringId,
        session_date: document.getElementById('session-date').value,
        start_time: document.getElementById('session-time').value,
        topic: document.getElementById('session-topic').value
    };

    const loading = showLoading('Creating session...');

    try {
        const response = await fetch('/api/attendance/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closeSessionModal();
            document.getElementById('session-form').reset();
            fetchSessions(); // Refresh list
            toast.success('Session created successfully');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to create session');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error creating session');
    }
}

async function saveAttendance() {
    const sessionId = document.getElementById('session-filter').value;
    const token = localStorage.getItem('token');
    const attendanceData = [];

    // Iterate over currentAttendance to get IDs and read DOM for values
    currentAttendance.forEach(student => {
        const status = document.querySelector(`input[name="status-${student.enrollment_id}"]:checked`)?.value;
        const notes = document.getElementById(`notes-${student.enrollment_id}`).value;
        
        if (status) {
            attendanceData.push({
                enrollment_id: student.enrollment_id,
                status: status,
                notes: notes
            });
        }
    });

    const loading = showLoading('Saving attendance...');

    try {
        const response = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                session_id: sessionId,
                attendance_data: attendanceData
            })
        });

        hideLoading(loading);

        if (response.ok) {
            toast.success('Attendance saved successfully!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to save');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error saving attendance');
    }
}
