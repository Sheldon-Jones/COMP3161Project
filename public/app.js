async function login() {
    const user_id = document.getElementById('user_id').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_name', data.user_name);
            localStorage.setItem('user_role', data.user_type);
            initDashboard();
        } else {
            alert("Login Failed: " + data.error);
        }
    } catch (err) {
        alert("Server error. Ensure ui_server.js is running.");
    }
}

function initDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    
    // Displays the 'name' from the User table with a little welcome
    document.getElementById('dash-name').innerText = `Welcome, ${localStorage.getItem('user_name')}`;
    document.getElementById('dash-id').innerText = `User ID: ${localStorage.getItem('user_id')}`;
    document.getElementById('user-role').innerText = localStorage.getItem('user_role');
    
    fetchCourses();
}

async function fetchCourses() {
    const userId = localStorage.getItem('user_id');
    const response = await fetch(`/api/student/${userId}/courses`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const courses = await response.json();
    const container = document.getElementById('course-container');
    container.innerHTML = '';

    if (courses.length === 0) {
        container.innerHTML = "<p>You are not currently enrolled in any courses.</p>";
        return;
    }

    courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <h4>${course.course_id}</h4>
            <p>${course.course_name}</p>
        `;
        container.appendChild(card);
    });
}

function logout() {
    localStorage.clear();
    location.reload();
}

window.onload = () => {
    if (localStorage.getItem('token')) initDashboard();
};