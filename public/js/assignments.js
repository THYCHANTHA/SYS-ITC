let allAssignments = [];
let allOfferings = [];
let userRole = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    fetchInitialData();

    document.getElementById('add-assignment-btn')?.addEventListener('click', openAssignmentModal);
    document.getElementById('close-assignment-modal')?.addEventListener('click', closeAssignmentModal);
    document.getElementById('assignment-form')?.addEventListener('submit', handleAssignmentSubmit);
    
    document.getElementById('close-submission-modal')?.addEventListener('click', closeSubmissionModal);
    document.getElementById('submission-form')?.addEventListener('submit', handleSubmissionSubmit);
    
    document.getElementById('offering-filter')?.addEventListener('change', fetchAssignments);
});

async function fetchInitialData() {
    const token = localStorage.getItem('token');
    try {
        const offeringsRes = await fetch('/api/offerings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allOfferings = await offeringsRes.json();
        populateOfferingSelects();
        fetchAssignments();
    } catch (error) {
        console.error(error);
    }
}

function populateOfferingSelects() {
    const filterSelect = document.getElementById('offering-filter');
    const modalSelect = document.getElementById('assign-offering');
    
    const options = allOfferings.map(o => `<option value="${o.id}">${o.course_code} - ${o.course_name}</option>`).join('');
    
    if (filterSelect) filterSelect.innerHTML = '<option value="">គ្រប់មុខវិជ្ជា</option>' + options;
    if (modalSelect) modalSelect.innerHTML = options;
}

async function fetchAssignments() {
    const token = localStorage.getItem('token');
    const offeringId = document.getElementById('offering-filter')?.value;
    
    let url = '/api/assignments';
    if (offeringId) url += `?offering_id=${offeringId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allAssignments = await response.json();
        renderAssignments(allAssignments);
    } catch (error) {
        console.error(error);
        toast.error('Failed to load assignments');
    }
}

function renderAssignments(assignments) {
    const container = document.getElementById('assignment-list');
    if (!container) return;

    container.innerHTML = '';

    if (assignments.length === 0) {
        container.innerHTML = '<p class="col-span-3 text-center text-gray-500">មិនមានកិច្ចការទេ។</p>';
        return;
    }

    assignments.forEach(assign => {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-6 shadow hover:shadow-md transition';
        
        const dueDate = new Date(assign.due_date).toLocaleDateString();
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${assign.title}</h3>
                    <p class="text-sm text-gray-500">${assign.course_code} - ${assign.course_name}</p>
                </div>
                <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Due: ${dueDate}</span>
            </div>
            <p class="text-gray-600 text-sm mb-4">${assign.description || 'No description'}</p>
            <div class="flex justify-between items-center border-t pt-4">
                <span class="text-sm font-bold text-gray-500">Score: ${assign.max_score}</span>
                ${userRole === 'student' ? 
                    `<button class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded submit-btn" data-id="${assign.id}">Submit</button>` :
                    `<button class="text-blue-600 hover:text-blue-800 text-sm font-bold view-sub-btn" data-id="${assign.id}">View Submissions</button>`
                }
            </div>
        `;
        container.appendChild(card);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.submit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openSubmissionModal(e.target.dataset.id);
        });
    });
}

function openAssignmentModal() {
    document.getElementById('assignment-modal').classList.remove('hidden');
    document.getElementById('assign-due').value = new Date().toISOString().split('T')[0];
}

function closeAssignmentModal() {
    document.getElementById('assignment-modal').classList.add('hidden');
}

async function handleAssignmentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        offering_id: document.getElementById('assign-offering').value,
        title: document.getElementById('assign-title').value,
        description: document.getElementById('assign-desc').value,
        due_date: document.getElementById('assign-due').value,
        max_score: 100, // Default
        weight: 0 // Default
    };

    try {
        const response = await fetch('/api/assignments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeAssignmentModal();
            fetchAssignments();
            toast.success('Assignment created successfully');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to create');
        }
    } catch (error) {
        toast.error('Error creating assignment');
    }
}

function openSubmissionModal(assignmentId) {
    document.getElementById('submission-modal').classList.remove('hidden');
    document.getElementById('sub-assign-id').value = assignmentId;
}

function closeSubmissionModal() {
    document.getElementById('submission-modal').classList.add('hidden');
}

async function handleSubmissionSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        assignment_id: document.getElementById('sub-assign-id').value,
        content: document.getElementById('sub-content').value,
        file_path: document.getElementById('sub-file').value
    };

    const loading = showLoading('Submitting...');

    try {
        const response = await fetch('/api/assignments/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closeSubmissionModal();
            toast.success('Submitted successfully!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to submit');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error submitting');
    }
}
