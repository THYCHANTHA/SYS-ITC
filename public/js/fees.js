let allFees = [];
let userRole = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    fetchFees();

    document.getElementById('close-payment-modal')?.addEventListener('click', closePaymentModal);
    document.getElementById('payment-form')?.addEventListener('submit', handlePaymentSubmit);
    
    document.getElementById('add-fee-structure-btn')?.addEventListener('click', openFeeModal);
    document.getElementById('close-fee-modal')?.addEventListener('click', closeFeeModal);
    document.getElementById('fee-structure-form')?.addEventListener('submit', handleFeeStructureSubmit);

    document.getElementById('assign-fee-btn')?.addEventListener('click', openAssignModal);
    document.getElementById('close-assign-modal')?.addEventListener('click', closeAssignModal);
    document.getElementById('assign-fee-form')?.addEventListener('submit', handleAssignFeeSubmit);

    // Simple search filter
    document.getElementById('student-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allFees.filter(f => 
            f.student_id_card.toLowerCase().includes(term) || 
            f.first_name.toLowerCase().includes(term) || 
            f.last_name.toLowerCase().includes(term)
        );
        renderFees(filtered);
    });
});

async function fetchFees() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/financial/student-fees', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        allFees = await response.json();
        renderFees(allFees);
    } catch (error) {
        console.error(error);
        toast.error('Failed to load fees');
    }
}

function renderFees(fees) {
    const tbody = document.getElementById('fee-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">មិនមានទិន្នន័យទេ។</td></tr>';
        return;
    }

    fees.forEach(fee => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 border-b transition';
        
        const statusColor = fee.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            fee.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${fee.last_name} ${fee.first_name}</div>
                <div class="text-xs text-gray-500">${fee.student_id_card}</div>
            </td>
            <td class="px-6 py-4">${fee.academic_year} (Sem ${fee.semester})</td>
            <td class="px-6 py-4 text-right font-bold">$${parseFloat(fee.total_amount).toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-green-600">$${parseFloat(fee.paid_amount).toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-red-600 font-bold">$${parseFloat(fee.balance).toFixed(2)}</td>
            <td class="px-6 py-4 text-center">
                <span class="px-2 py-1 rounded text-xs font-bold ${statusColor}">${fee.status.toUpperCase()}</span>
            </td>
            <td class="px-6 py-4 admin-only">
                ${fee.status !== 'paid' ? 
                    `<button class="text-blue-600 hover:text-blue-900 font-bold pay-btn" data-id="${fee.id}" data-balance="${fee.balance}" data-name="${fee.last_name} ${fee.first_name}">បង់ប្រាក់</button>` : 
                    `<span class="text-green-600 font-bold">✓</span>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });

    if (window.applyRoleBasedUI) window.applyRoleBasedUI();

    document.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { id, balance, name } = e.target.dataset;
            openPaymentModal(id, balance, name);
        });
    });
}

function openPaymentModal(id, balance, name) {
    document.getElementById('payment-modal').classList.remove('hidden');
    document.getElementById('payment-fee-id').value = id;
    document.getElementById('payment-amount').value = balance;
    document.getElementById('payment-student-info').textContent = `និស្សិត: ${name} - នៅខ្វះ: $${balance}`;
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        student_fee_id: document.getElementById('payment-fee-id').value,
        amount: parseFloat(document.getElementById('payment-amount').value),
        payment_method: document.getElementById('payment-method').value,
        notes: document.getElementById('payment-notes').value
    };

    const loading = showLoading('Processing payment...');

    try {
        const response = await fetch('/api/financial/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closePaymentModal();
            fetchFees();
            toast.success('Payment recorded successfully!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to record payment');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error processing payment');
    }
}

// Fee Structure Logic
async function openFeeModal() {
    const modal = document.getElementById('fee-structure-modal');
    modal.classList.remove('hidden');
    
    const deptSelect = document.getElementById('fee-dept');
    if (deptSelect.children.length === 0) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const depts = await res.json();
            depts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.code} - ${d.name}`;
                deptSelect.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }
}

function closeFeeModal() {
    document.getElementById('fee-structure-modal').classList.add('hidden');
}

async function handleFeeStructureSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        department_id: document.getElementById('fee-dept').value,
        academic_year: document.getElementById('fee-year').value,
        semester: parseInt(document.getElementById('fee-semester').value),
        tuition_fee: parseFloat(document.getElementById('fee-tuition').value),
        registration_fee: parseFloat(document.getElementById('fee-registration').value)
    };

    const loading = showLoading('Creating Fee Structure...');

    try {
        const response = await fetch('/api/financial/structures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closeFeeModal();
            toast.success('Fee Structure Created!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to create');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error creating fee structure');
    }
}

// Assign Fee Logic
async function openAssignModal() {
    const modal = document.getElementById('assign-fee-modal');
    modal.classList.remove('hidden');

    const token = localStorage.getItem('token');
    
    // Populate Students if empty
    const studentSelect = document.getElementById('assign-student');
    if (studentSelect.children.length === 0) {
        try {
            const res = await fetch('/api/students', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const students = await res.json();
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.student_id_card} - ${s.last_name} ${s.first_name}`;
                studentSelect.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }

    // Populate Fee Structures if empty
    const structSelect = document.getElementById('assign-structure');
    if (structSelect.children.length === 0) {
        try {
            const res = await fetch('/api/financial/structures', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const structs = await res.json();
            structs.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.department_name} - ${s.academic_year} (Sem ${s.semester}) - $${parseFloat(s.tuition_fee) + parseFloat(s.registration_fee)}`;
                structSelect.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }
}

function closeAssignModal() {
    document.getElementById('assign-fee-modal').classList.add('hidden');
}

async function handleAssignFeeSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        student_id: document.getElementById('assign-student').value,
        fee_structure_id: document.getElementById('assign-structure').value,
        due_date: document.getElementById('assign-due-date').value
    };

    const loading = showLoading('Assigning Fee...');

    try {
        const response = await fetch('/api/financial/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closeAssignModal();
            fetchFees();
            toast.success('Fee Assigned Successfully!');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to assign');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error assigning fee');
    }
}
