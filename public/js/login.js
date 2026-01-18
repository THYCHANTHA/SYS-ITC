document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Reset UI
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            window.location.href = '/'; // Redirect to dashboard
        } else {
            // Login failed
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        const errorText = document.getElementById('error-text');
        if (errorText) errorText.textContent = error.message;
        errorMessage.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});
