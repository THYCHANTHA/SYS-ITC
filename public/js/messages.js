let currentFolder = 'inbox';

document.addEventListener('DOMContentLoaded', () => {
    fetchMessages('inbox');
    fetchUsersForRecipient();

    document.getElementById('inbox-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchFolder('inbox');
    });

    document.getElementById('sent-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchFolder('sent');
    });

    document.getElementById('compose-btn')?.addEventListener('click', openComposeModal);
    document.getElementById('close-compose-modal')?.addEventListener('click', closeComposeModal);
    document.getElementById('close-view-modal')?.addEventListener('click', closeViewModal);
    document.getElementById('compose-form')?.addEventListener('submit', handleSendMessage);
});

function switchFolder(folder) {
    currentFolder = folder;
    document.getElementById('folder-title').textContent = folder === 'inbox' ? 'ប្រអប់សារ (Inbox)' : 'សារដែលបានផ្ញើ (Sent)';
    
    // Update active state
    document.getElementById('inbox-link').className = folder === 'inbox' ? 'block px-4 py-2 rounded bg-blue-50 text-blue-700 font-bold' : 'block px-4 py-2 rounded hover:bg-gray-50 text-gray-700 font-bold';
    document.getElementById('sent-link').className = folder === 'sent' ? 'block px-4 py-2 rounded bg-blue-50 text-blue-700 font-bold' : 'block px-4 py-2 rounded hover:bg-gray-50 text-gray-700 font-bold';

    fetchMessages(folder);
}

async function fetchUsersForRecipient() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/auth/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        
        const select = document.getElementById('msg-recipient');
        select.innerHTML = '<option value="">ជ្រើសរើសអ្នកទទួល...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = `${user.username} (${user.role})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function fetchMessages(type) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('message-list');
    container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading...</div>';

    try {
        const response = await fetch(`/api/communication/messages?type=${type}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await response.json();
        renderMessages(messages, type);
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="p-6 text-center text-red-500">Failed to load messages</div>';
    }
}

function renderMessages(messages, type) {
    const container = document.getElementById('message-list');
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">មិនមានសារទេ។</div>';
        return;
    }

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'p-4 hover:bg-gray-50 cursor-pointer transition border-b last:border-b-0';
        
        const otherParty = type === 'inbox' ? msg.sender_name : msg.recipient_name;
        const role = type === 'inbox' ? msg.sender_role : msg.recipient_role;
        const date = new Date(msg.sent_date).toLocaleString();

        div.innerHTML = `
            <div class="flex justify-between items-baseline mb-1">
                <h3 class="font-bold text-gray-900">${otherParty} <span class="text-xs font-normal text-gray-500">(${role})</span></h3>
                <span class="text-xs text-gray-500">${date}</span>
            </div>
            <h4 class="font-bold text-sm text-gray-800 mb-1">${msg.subject}</h4>
            <p class="text-sm text-gray-600 truncate">${msg.content}</p>
        `;
        
        // Open modal on click
        div.addEventListener('click', () => {
            openViewModal(msg, type);
        });

        container.appendChild(div);
    });
}

function openViewModal(msg, type) {
    const modal = document.getElementById('message-view-modal');
    const otherParty = type === 'inbox' ? msg.sender_name : msg.recipient_name;
    const date = new Date(msg.sent_date).toLocaleString();
    
    document.getElementById('view-subject').textContent = msg.subject;
    document.getElementById('view-from').textContent = otherParty;
    document.getElementById('view-date').textContent = date;
    document.getElementById('view-content').textContent = msg.content;
    
    modal.classList.remove('hidden');
}

function closeViewModal() {
    document.getElementById('message-view-modal').classList.add('hidden');
}

function openComposeModal() {
    document.getElementById('compose-modal').classList.remove('hidden');
}

function closeComposeModal() {
    document.getElementById('compose-modal').classList.add('hidden');
}

async function handleSendMessage(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const data = {
        recipient_username: document.getElementById('msg-recipient').value,
        subject: document.getElementById('msg-subject').value,
        content: document.getElementById('msg-content').value
    };

    const loading = showLoading('Sending...');

    try {
        const response = await fetch('/api/communication/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        hideLoading(loading);

        if (response.ok) {
            closeComposeModal();
            document.getElementById('compose-form').reset();
            toast.success('Message sent successfully');
            if (currentFolder === 'sent') fetchMessages('sent');
        } else {
            const err = await response.json();
            toast.error(err.error || 'Failed to send');
        }
    } catch (error) {
        hideLoading(loading);
        toast.error('Error sending message');
    }
}
