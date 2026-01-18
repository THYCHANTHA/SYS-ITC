let userRole = '';
let currentStudentId = '';

document.addEventListener('DOMContentLoaded', () => {
    userRole = localStorage.getItem('role');
    
    // Check for query param
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedId = urlParams.get('student_id');

    if (userRole === 'admin') {
        fetchStudents(preSelectedId);
    } else if (userRole === 'student') {
        fetchMyProfile();
    }

    document.getElementById('generate-transcript')?.addEventListener('click', generateTranscript);
    document.getElementById('student-select')?.addEventListener('change', (e) => {
        currentStudentId = e.target.value;
    });
});

async function fetchStudents(preSelectedId = null) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const students = await response.json();
        const select = document.getElementById('student-select');
        
        students.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.student_id_card} - ${s.last_name} ${s.first_name}`;
            select.appendChild(option);
        });

        if (preSelectedId) {
            select.value = preSelectedId;
            currentStudentId = preSelectedId;
            generateTranscript(); // Auto-generate
        }
    } catch (error) {
        console.error(error);
    }
}

async function fetchMyProfile() {
    // We can get the ID from the token or a dedicated endpoint. 
    // For now, let's fetch all students (filtered by backend) and pick the first one
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const students = await response.json();
        if (students.length > 0) {
            currentStudentId = students[0].id;
        }
    } catch (error) {
        console.error(error);
    }
}

async function generateTranscript() {
    if (!currentStudentId) {
        toast.error('Please select a student first');
        return;
    }

    const token = localStorage.getItem('token');
    const loading = showLoading('Generating Transcript...');

    try {
        const response = await fetch(`/api/documents/transcript/${currentStudentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        hideLoading(loading);

        if (!response.ok) throw new Error('Failed to fetch transcript data');

        const data = await response.json();
        renderTranscript(data);
        
        // Trigger print
        setTimeout(() => {
            window.print();
            // Reload page after print to restore view
            // location.reload(); 
            // Or just hide the print area again? 
            // The CSS handles visibility, but we might want to clear the content.
        }, 500);

    } catch (error) {
        hideLoading(loading);
        toast.error('Error generating transcript');
    }
}

function renderTranscript(data) {
    const { student, grades } = data;
    const printArea = document.getElementById('print-area');
    
    printArea.classList.remove('hidden');
    
    // Group grades by Academic Year/Semester
    const grouped = {};
    grades.forEach(g => {
        const key = `${g.academic_year} - Semester ${g.semester}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(g);
    });

    let gradesHtml = '';
    for (const [period, items] of Object.entries(grouped)) {
        gradesHtml += `
            <div class="mb-6">
                <h3 class="font-bold text-lg mb-2 border-b pb-1">${period}</h3>
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="border-b">
                            <th class="py-2">Course Code</th>
                            <th class="py-2">Course Name</th>
                            <th class="py-2 text-center">Credits</th>
                            <th class="py-2 text-center">Score</th>
                            <th class="py-2 text-center">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(g => {
                            const score = parseFloat(g.total_score || 0);
                            let grade = 'F';
                            if (score >= 85) grade = 'A';
                            else if (score >= 80) grade = 'B+';
                            else if (score >= 70) grade = 'B';
                            else if (score >= 65) grade = 'C+';
                            else if (score >= 50) grade = 'C';
                            else if (score >= 45) grade = 'D';

                            return `
                            <tr class="border-b border-gray-100">
                                <td class="py-2">${g.course_code}</td>
                                <td class="py-2">${g.course_name}</td>
                                <td class="py-2 text-center">${g.credits}</td>
                                <td class="py-2 text-center">${score.toFixed(2)}</td>
                                <td class="py-2 text-center font-bold">${grade}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    printArea.innerHTML = `
        <div class="max-w-3xl mx-auto p-8 border-2 border-gray-800">
            <div class="text-center mb-8">
                <img src="https://upload.wikimedia.org/wikipedia/en/f/f7/Institute_of_Technology_of_Cambodia_logo.png?20140922081716" class="h-20 mx-auto mb-4">
                <h1 class="text-2xl font-bold uppercase">Institute of Technology of Cambodia</h1>
                <h2 class="text-xl font-bold uppercase mt-2">Official Transcript</h2>
            </div>

            <div class="flex justify-between mb-8 text-sm">
                <div>
                    <p><span class="font-bold">Name:</span> ${student.last_name} ${student.first_name}</p>
                    <p><span class="font-bold">ID:</span> ${student.student_id_card}</p>
                    <p><span class="font-bold">DOB:</span> ${new Date(student.dob).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p><span class="font-bold">Department:</span> ${student.department_name}</p>
                    <p><span class="font-bold">Generation:</span> ${student.generation || 'N/A'}</p>
                    <p><span class="font-bold">Date Issued:</span> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            ${gradesHtml}

            <div class="mt-12 flex justify-between items-end">
                <div class="text-center">
                    <p class="border-t border-gray-400 px-8 pt-2">Registrar Signature</p>
                </div>
                <div class="text-center">
                    <p class="border-t border-gray-400 px-8 pt-2">Director Signature</p>
                </div>
            </div>

            <div class="mt-8 text-center print:hidden">
                <button onclick="location.reload()" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                    ត្រឡប់ក្រោយ (Back)
                </button>
            </div>
        </div>
    `;
}
