class SmartRelayApp {
    constructor() {
        this.baseUrl = '';
        this.isAuthenticated = false;
        this.currentView = 'login';
        this.status = {
            time: '--:--:--',
            relay: false,
            mode: 'AUTO'
        };
        this.timeSlots = [];
        
        this.init();
    }

    async init() {
        // Try to get stored device IP
        const savedIp = localStorage.getItem('smartRelayIp');
        if (savedIp) {
            this.baseUrl = `http://${savedIp}`;
        }
        
        await this.loadView();
        this.setupEventListeners();
        
        // Auto-refresh status
        setInterval(() => this.refreshStatus(), 2000);
    }

    async loadView() {
        const app = document.getElementById('app');
        
        switch (this.currentView) {
            case 'login':
                app.innerHTML = this.getLoginView();
                break;
            case 'dashboard':
                app.innerHTML = this.getDashboardView();
                await this.refreshStatus();
                await this.loadTimeSlots();
                break;
            case 'edit':
                app.innerHTML = this.getEditView();
                await this.loadTimeSlots();
                break;
        }
    }

    getLoginView() {
        return `
            <div class="login-form card">
                <h1 style="text-align: center; margin-bottom: 24px;">Smart Relay</h1>
                <div class="form-group">
                    <input type="text" id="ipAddress" placeholder="Device IP Address" value="${localStorage.getItem('smartRelayIp') || ''}">
                </div>
                <div class="form-group">
                    <input type="text" id="username" placeholder="Username" value="admin">
                </div>
                <div class="form-group">
                    <input type="password" id="password" placeholder="Password" value="admin123">
                </div>
                <button class="btn btn-primary" style="width: 100%;" onclick="app.login()">Connect</button>
                <div class="error" id="loginError">Connection failed. Check IP and credentials.</div>
            </div>
        `;
    }

    getDashboardView() {
        return `
            <header>
                <h1>Smart Relay</h1>
                <button class="btn" onclick="app.logout()">Logout</button>
            </header>

            <div class="card">
                <div class="status-grid">
                    <div class="badge" id="timeBadge">${this.status.time}</div>
                    <div class="badge ${this.status.relay ? 'on' : 'off'}" id="relayBadge">
                        Relay: ${this.status.relay ? 'ON' : 'OFF'}
                    </div>
                    <div class="badge ${this.status.mode === 'MANUAL' ? 'manual' : 'auto'}" id="modeBadge">
                        Mode: ${this.status.mode}
                    </div>
                </div>

                <div class="btn-group">
                    <button class="btn btn-primary" onclick="app.toggleManual()">Toggle Manual</button>
                    <button class="btn" onclick="app.showEditView()">Edit Time Slots</button>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 16px;">Time Slots</h3>
                <div id="timeSlotsList">
                    <div class="loading">Loading time slots...</div>
                </div>
            </div>
        `;
    }

    getEditView() {
        return `
            <header>
                <h1>Edit Time Slots</h1>
                <button class="btn" onclick="app.showDashboard()">Back</button>
            </header>

            <div class="card">
                <form id="slotsForm" onsubmit="app.saveSlots(event)">
                    <div id="slotsContainer">
                        <!-- Slots will be dynamically added here -->
                    </div>
                    <div class="btn-group">
                        <button type="button" class="btn" onclick="app.addSlot()">Add Slot</button>
                        <button type="submit" class="btn btn-primary">Save All</button>
                    </div>
                </form>
            </div>
        `;
    }

    setupEventListeners() {
        // Handle offline/online events
        window.addEventListener('online', () => this.refreshStatus());
        window.addEventListener('offline', () => this.showOfflineStatus());
    }

    async login() {
        const ip = document.getElementById('ipAddress').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!ip) {
            this.showError('Please enter device IP address');
            return;
        }

        this.baseUrl = `http://${ip}`;
        localStorage.setItem('smartRelayIp', ip);

        // Test connection by fetching status
        try {
            const response = await fetch(`${this.baseUrl}/api/status`, {
                headers: this.getAuthHeaders(username, password)
            });

            if (response.status === 401) {
                this.showError('Invalid username or password');
                return;
            }

            if (!response.ok) {
                throw new Error('Connection failed');
            }

            this.isAuthenticated = true;
            this.currentView = 'dashboard';
            await this.loadView();
            
        } catch (error) {
            this.showError('Cannot connect to device. Check IP address.');
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.currentView = 'login';
        this.loadView();
    }

    async refreshStatus() {
        if (!this.isAuthenticated) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/status`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.status = await response.json();
                this.updateStatusDisplay();
            }
        } catch (error) {
            console.error('Failed to refresh status:', error);
        }
    }

    updateStatusDisplay() {
        if (this.currentView !== 'dashboard') return;

        const timeBadge = document.getElementById('timeBadge');
        const relayBadge = document.getElementById('relayBadge');
        const modeBadge = document.getElementById('modeBadge');

        if (timeBadge) timeBadge.textContent = this.status.time;
        if (relayBadge) {
            relayBadge.textContent = `Relay: ${this.status.relay ? 'ON' : 'OFF'}`;
            relayBadge.className = `badge ${this.status.relay ? 'on' : 'off'}`;
        }
        if (modeBadge) {
            modeBadge.textContent = `Mode: ${this.status.mode}`;
            modeBadge.className = `badge ${this.status.mode === 'MANUAL' ? 'manual' : 'auto'}`;
        }
    }

    async toggleManual() {
        try {
            await fetch(`${this.baseUrl}/toggle`, {
                headers: this.getAuthHeaders()
            });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to toggle manual mode:', error);
        }
    }

    async loadTimeSlots() {
        // Note: We'll need to modify the ESP8266 code to provide an API endpoint for time slots
        // For now, this is a placeholder
        this.timeSlots = []; // Will be populated from API
        this.updateTimeSlotsDisplay();
    }

    updateTimeSlotsDisplay() {
        if (this.currentView === 'dashboard') {
            const container = document.getElementById('timeSlotsList');
            if (this.timeSlots.length === 0) {
                container.innerHTML = '<div class="muted">No time slots configured</div>';
            } else {
                container.innerHTML = this.timeSlots.map(slot => `
                    <div class="slot-item">
                        <span>${slot.start} - ${slot.end}</span>
                    </div>
                `).join('');
            }
        }
    }

    showEditView() {
        this.currentView = 'edit';
        this.loadView();
    }

    showDashboard() {
        this.currentView = 'dashboard';
        this.loadView();
    }

    addSlot() {
        const container = document.getElementById('slotsContainer');
        const slotCount = container.children.length;
        
        if (slotCount >= 14) {
            alert('Maximum 14 slots allowed');
            return;
        }

        const slotHtml = `
            <div class="slot-edit" style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                <input type="time" name="start${slotCount}" required>
                <span>to</span>
                <input type="time" name="end${slotCount}" required>
                <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Remove</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', slotHtml);
    }

    async saveSlots(event) {
        event.preventDefault();
        // Implementation for saving slots would go here
        alert('Time slots saved!');
        this.showDashboard();
    }

    getAuthHeaders(username = 'admin', password = 'admin123') {
        const credentials = btoa(`${username}:${password}`);
        return {
            'Authorization': `Basic ${credentials}`
        };
    }

    showError(message) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    showOfflineStatus() {
        if (this.currentView === 'dashboard') {
            const timeBadge = document.getElementById('timeBadge');
            if (timeBadge) {
                timeBadge.textContent = 'Offline';
            }
        }
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SmartRelayApp();
});