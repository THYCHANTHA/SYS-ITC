let allExams = [];
let allOfferings = [];
let userRole = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    fetchInitialData();

    document.getElementById('add-exam-btn')?.addEventListener('click', openExamModal);
    document.getElementById('close-exam-modal')?.addEventListener('click', closeExamModal);
    document.getElementById('exam-form')?.addEventListener('submit', handleExamSubmit);
    
    document.getElementById('close-seat-modal')?.addEventListener('click', closeSeatModal);
    
    document.getElementById('offering-filter')?.addEventListener('change', fetchExams);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        const offeringsRes = await fetch('/api/offerings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allOfferings = await offeringsRes.json();
        populateOfferingSelects();
        fetchExams();
    } catch (error) {
        console.error(error);
    }
}

function populateOfferingSelects() {
    const filterSelect = document.getElementById('offering-filter');
    const modalSelect = document.getElementById('exam-offering');
    
    const options = allOfferings.map(o => `<option value="${o.id}">${o.course_code} - ${o.course_name}</option>`).join('');
    
    if (filterSelect) filterSelect.innerHTML = '<option value="">គ្រប់មុខវិជ្ជា</option>' + options;
    if (modalSelect) modalSelect.innerHTML = options;
}

async function fetchExams() {
    const token = localStorage.getItem('token');
    const offeringId = document.getElementById('offering-filter')?.value;
    
    let url = '/api/exams';
    if (offeringId) url += `?offering_id=${offeringId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allExams = await response.json();
        renderExams(allExams);
    } catch (error) {
        console.error(error);
        toast.error('Failed to load exams');
    }
}

function renderExams(exams) {
    const tbody = document.getElementById('exam-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    exams.forEach(exam => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        
        const date = new Date(exam.exam_date).toLocaleDateString();
        
        row.innerHTML = `
            <td class="px-6 py-4 font-bold">${date}</td>
            <td class="px-6 py-4">${exam.start_time}</td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${exam.course_name}</div>
                <div class="text-xs text-gray-500">${exam.course_code}</div>
            </td>
            <td class="px-6 py-4 uppercase text-sm font-bold text-blue-600">${exam.exam_type}</td>
            <td class="px-6 py-4">${exam.room || 'TBA'}</td>
            <td class="px-6 py-4">${exam.duration} mins</td>
            <td class="px-6 py-4 admin-only">
                <button class="text-green-600 hover:text-green-900 font-bold seat-btn" data-id="${exam.id}">Allocate Seats</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.seat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            generateSeats(e.target.dataset.id);
        });
    });
}

function openExamModal() {
    document.getElementById('exam-modal').classList.remove('hidden');
    document.getElementById('exam-date').value = new Date().toISOString().split('T')[0];
}

function closeExamModal() {
    document.getElementById('exam-modal').classList.add('hidden');
}

async function handleExamSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        offering_id: document.getElementById('exam-offering').value,
        exam_type: document.getElementById('exam-type').value,
        exam_date: document.getElementById('exam-date').value,
        start_time: document.getElementById('exam-time').value,
        duration: document.getElementById('exam-duration').value,
        room: document.getElementById('exam-room').value
    };

    try {
        const response = await fetch('/api/exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeExamModal();
            fetchExams();
            toast.success('Exam created successfully');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to create exam');
        }
    } catch (error) {
        toast.error('Error creating exam');
    }
}

async function generateSeats(examId) {
    const token = localStorage.getItem('token');
    const loading = showLoading('Allocating seats...');

    try {
        const response = await fetch(`/api/exams/${examId}/allocate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        hideLoading(loading);
        
        if (!response.ok) throw new Error('Failed to allocate');

        const data = await response.json();
        showSeatModal(data);

    } catch (error) {
        hideLoading(loading);
        toast.error('Error allocating seats');
    }
}

function showSeatModal(data) {
    const modal = document.getElementById('seat-modal');
    const grid = document.getElementById('seat-grid');
    
    grid.innerHTML = '';
    
    if (data.allocations.length === 0) {
        grid.innerHTML = '<p class="col-span-5 text-center text-gray-500">No students enrolled.</p>';
    } else {
        data.allocations.forEach(seat => {
            const div = document.createElement('div');
            div.className = 'border p-4 rounded bg-white shadow text-center';
            div.innerHTML = `
                <div class="text-2xl font-bold text-blue-600">${seat.seat}</div>
                <div class="text-sm text-gray-600 mt-2">Student ID:</div>
                <div class="font-bold text-gray-800 truncate">${seat.student_id}</div>
            `;
            grid.appendChild(div);
        });
    }

    modal.classList.remove('hidden');
}

function closeSeatModal() {
    document.getElementById('seat-modal').classList.add('hidden');
}
