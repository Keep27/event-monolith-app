const API_BASE = window.location.origin;
let currentUser = null;
let ws = null;

// WebSocket connection
function connectWebSocket() {
    ws = new WebSocket(`${API_BASE.replace('http', 'ws')}/ws`);
    
    ws.onopen = function() {
        document.getElementById('wsStatus').textContent = 'Connected';
        document.getElementById('wsStatus').className = 'websocket-status ws-connected';
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['events', 'rsvps'] }));
    };

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        if (data.type === 'event_created' || data.type === 'event_updated' || data.type === 'event_approved') {
            loadEvents();
        } else if (data.type === 'rsvp_created' || data.type === 'rsvp_updated') {
            loadEvents();
        }
    };

    ws.onclose = function() {
        document.getElementById('wsStatus').textContent = 'Disconnected';
        document.getElementById('wsStatus').className = 'websocket-status ws-disconnected';
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

// Authentication functions
async function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('authMessage', `Signup successful! Check your email for verification.`, 'success');
        } else {
            showMessage('authMessage', data.error, 'error');
        }
    } catch (error) {
        showMessage('authMessage', 'Network error', 'error');
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else {
            showMessage('authMessage', data.error, 'error');
        }
    } catch (error) {
        showMessage('authMessage', 'Network error', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
    if (ws) ws.close();
}

function showApp() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('dashboardRole').textContent = currentUser.role;
    
    // Show/hide role-specific features
    if (currentUser.role === 'ORGANIZER' || currentUser.role === 'ADMIN') {
        document.getElementById('eventForm').classList.remove('hidden');
        document.getElementById('organizedEventsCard').classList.remove('hidden');
    } else {
        document.getElementById('organizedEventsCard').classList.add('hidden');
    }
    
    if (currentUser.role === 'ADMIN') {
        document.getElementById('pendingApprovalCard').classList.remove('hidden');
    } else {
        document.getElementById('pendingApprovalCard').classList.add('hidden');
    }
    
    loadEvents();
    updateDashboard();
    connectWebSocket();
}

// Event functions
async function createEvent() {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value;

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, description, date, location })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('eventMessage', 'Event created successfully!', 'success');
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventLocation').value = '';
            loadEvents();
        } else {
            showMessage('eventMessage', data.error, 'error');
        }
    } catch (error) {
        showMessage('eventMessage', 'Network error', 'error');
    }
}

async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            displayEvents(data.events);
            updateDashboard();
        } else {
            console.error('Failed to load events:', data.error);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

function updateDashboard() {
    const events = JSON.parse(localStorage.getItem('cachedEvents') || '[]');
    const totalEvents = events.length;
    const myRSVPs = events.reduce((count, event) => {
        return count + (event.rsvps || []).filter(rsvp => rsvp.userId === currentUser.id).length;
    }, 0);
    const organizedCount = events.filter(event => event.organizerId === currentUser.id).length;
    const pendingCount = events.filter(event => !event.approved && (currentUser.role === 'ADMIN' || event.organizerId === currentUser.id)).length;

    document.getElementById('totalEvents').textContent = totalEvents;
    document.getElementById('totalRSVPs').textContent = myRSVPs;
    if (document.getElementById('organizedEvents')) {
        document.getElementById('organizedEvents').textContent = organizedCount;
    }
    if (document.getElementById('pendingEvents')) {
        document.getElementById('pendingEvents').textContent = pendingCount;
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';

    // Cache events for dashboard
    localStorage.setItem('cachedEvents', JSON.stringify(events));

    if (events.length === 0) {
        eventsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No events available yet.</p>';
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        
        const canManage = currentUser.role === 'ADMIN' || 
                         (currentUser.role === 'ORGANIZER' && event.organizer.id === currentUser.id);
        
        eventCard.innerHTML = `
            <h3>${event.title} ${!event.approved ? '(Pending Approval)' : ''}</h3>
            <p><strong>Description:</strong> ${event.description}</p>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Organizer:</strong> ${event.organizer.email}</p>
            
            ${canManage ? `
                <div style="margin-top: 10px;">
                    <button class="btn" onclick="updateEvent('${event.id}')">Update</button>
                    <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
                    ${currentUser.role === 'ADMIN' && !event.approved ? 
                        `<button class="btn btn-success" onclick="approveEvent('${event.id}')">Approve</button>` : ''}
                </div>
            ` : ''}
            
            <div class="rsvp-section">
                <h4>RSVPs (${event.rsvps.length})</h4>
                ${event.rsvps.map(rsvp => `
                    <div>
                        ${rsvp.user.email}: 
                        <span class="status-indicator status-${rsvp.status.toLowerCase().replace('_', '-')}">
                            ${rsvp.status}
                        </span>
                    </div>
                `).join('')}
                
                <div style="margin-top: 10px;">
                    <button class="btn" onclick="rsvpToEvent('${event.id}', 'GOING')">Going</button>
                    <button class="btn" onclick="rsvpToEvent('${event.id}', 'MAYBE')">Maybe</button>
                    <button class="btn" onclick="rsvpToEvent('${event.id}', 'NOT_GOING')">Not Going</button>
                </div>
            </div>
        `;
        
        eventsList.appendChild(eventCard);
    });
}

async function rsvpToEvent(eventId, status) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        
        if (response.ok) {
            loadEvents();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error');
    }
}

async function approveEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            loadEvents();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            loadEvents();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Network error');
    }
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type;
}

// Initialize app
window.onload = function() {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        showApp();
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
};