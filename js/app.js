/**
 * ULTIMATE PRIORITY QUEUE SYSTEM - ENHANCED VERSION
 * Complete queue management system with proper authentication, user roles, and admin controls
 */

class PriorityQueueSystem {
    constructor() {
        // Data stores
        this.users = [];
        this.requests = [];
        this.departments = [];
        this.templates = [];
        this.auditLogs = [];
        this.sessions = {};
        this.notifications = [];
        
        // Default settings
        this.settings = {
            systemName: 'PriorityQ Pro',
            allowRegistrations: true,
            defaultPriority: 3,
            sessionTimeout: 30, // minutes
            fileUploadLimit: 5, // MB
            theme: 'auto',
            passwordRequirements: {
                minLength: 8,
                requireNumber: true,
                requireSpecialChar: true
            }
        };
        
        // Initialize with sample data
        this._initializeDefaultData();
    }

    // ======================
    // USER MANAGEMENT
    // ======================
    
    async registerUser(userData) {
        // Validate input
        if (!this.settings.allowRegistrations) {
            throw new Error('New registrations are currently disabled');
        }
        
        if (!userData.firstName || !userData.lastName) {
            throw new Error('First and last name are required');
        }
        
        if (!this._validateEmail(userData.email)) {
            throw new Error('Invalid email address');
        }
        
        if (this.users.some(u => u.email === userData.email)) {
            throw new Error('Email already registered');
        }
        
        if (!this._validatePassword(userData.password)) {
            throw new Error('Password does not meet requirements');
        }
        
        // Hash password
        const hashedPassword = await this._hashPassword(userData.password);
        
        // Create user
        const user = {
            id: this._generateId(),
            ...userData,
            password: hashedPassword,
            role: 'user',
            isActive: true,
            createdAt: new Date(),
            lastLogin: null,
            requests: [],
            notifications: [],
            department: userData.department || 'general'
        };
        
        this.users.push(user);
        this._logAction('system', `User registered: ${user.email}`);
        
        // Add welcome notification
        this.addNotification(user.id, 'Welcome to PriorityQ Pro! Get started by submitting your first request.', 'success');
        
        return user;
    }

    async authenticate(email, password) {
        const user = this.users.find(u => u.email === email);
        if (!user) {
            this._logAction('system', `Failed login attempt for ${email}`);
            throw new Error('Invalid email or password');
        }
        
        if (!user.isActive) {
            throw new Error('Account is inactive. Please contact support.');
        }
        
        const passwordMatch = await this._verifyPassword(password, user.password);
        if (!passwordMatch) {
            this._logAction(user.id, 'Failed login attempt - incorrect password');
            throw new Error('Invalid email or password');
        }
        
        // Create session
        const sessionId = this._generateSessionId();
        this.sessions[sessionId] = {
            userId: user.id,
            lastActivity: new Date(),
            ipAddress: this._getClientIp(),
            userAgent: navigator.userAgent
        };
        
        // Update user
        user.lastLogin = new Date();
        this._logAction(user.id, 'User logged in');
        
        // Add login notification
        this.addNotification(user.id, `Successful login from ${this._getClientIp()}`, 'info');
        
        return { user, sessionId };
    }

    verifySession(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return null;
        
        // Check session timeout
        const minutesInactive = (new Date() - session.lastActivity) / (1000 * 60);
        if (minutesInactive > this.settings.sessionTimeout) {
            this._logAction(session.userId, 'Session expired');
            delete this.sessions[sessionId];
            return null;
        }
        
        // Update last activity
        session.lastActivity = new Date();
        
        // Return user
        const user = this.users.find(u => u.id === session.userId);
        if (!user || !user.isActive) {
            delete this.sessions[sessionId];
            return null;
        }
        
        return user;
    }

    logout(sessionId) {
        if (this.sessions[sessionId]) {
            const userId = this.sessions[sessionId].userId;
            delete this.sessions[sessionId];
            this._logAction(userId, 'User logged out');
            return true;
        }
        return false;
    }

    // ======================
    // REQUEST MANAGEMENT
    // ======================
    
    createRequest(userId, requestData) {
        const user = this.users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');
        
        // Validate request data
        if (!requestData.title || requestData.title.length < 5) {
            throw new Error('Title must be at least 5 characters');
        }
        
        if (!requestData.description || requestData.description.length < 10) {
            throw new Error('Description must be at least 10 characters');
        }
        
        if (!requestData.priority || ![1, 3, 5, 7, 9].includes(parseInt(requestData.priority))) {
            throw new Error('Invalid priority level');
        }
        
        const request = {
            id: this._generateId(),
            userId,
            department: user.department || 'general',
            ...requestData,
            priority: parseInt(requestData.priority),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            history: [{
                action: 'created',
                by: userId,
                at: new Date(),
                comment: 'Request created'
            }],
            assignedTo: null,
            dueDate: requestData.dueDate ? new Date(requestData.dueDate) : null
        };
        
        this.requests.push(request);
        user.requests.push(request.id);
        
        this._logAction(userId, `Created request #${request.id}`);
        this._notifyDepartment(request.department, request);
        
        // Add notification to user
        this.addNotification(userId, `Your request "${request.title}" has been submitted`, 'info');
        
        return request;
    }

    updateRequestStatus(requestId, userId, status, comment = '') {
        const request = this.requests.find(r => r.id === requestId);
        if (!request) throw new Error('Request not found');
        
        const validStatuses = ['pending', 'processing', 'completed', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }
        
        request.status = status;
        request.updatedAt = new Date();
        request.history.push({
            action: 'status_change',
            by: userId,
            at: new Date(),
            from: request.status,
            to: status,
            comment
        });
        
        this._logAction(userId, `Updated request #${requestId} status to ${status}`);
        
        // Add notification to requester if status changed by someone else
        if (userId !== request.userId) {
            const statusMessage = {
                'processing': 'is being processed',
                'completed': 'has been completed',
                'rejected': 'has been rejected'
            }[status] || 'status has been updated';
            
            this.addNotification(
                request.userId, 
                `Your request "${request.title}" ${statusMessage}`,
                status === 'rejected' ? 'danger' : 'success'
            );
        }
        
        return request;
    }

    getRequestsForUser(userId, filter = 'all') {
        const user = this.users.find(u => u.id === userId);
        if (!user) return [];
        
        let userRequests = this.requests.filter(r => r.userId === userId);
        
        if (filter !== 'all') {
            userRequests = userRequests.filter(r => r.status === filter);
        }
        
        return userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // ======================
    // ADMIN FUNCTIONS
    // ======================
    
    getAllUsers() {
        return this.users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }

    updateUser(userId, updates) {
        const user = this.users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');
        
        // Don't allow changing email to one that already exists
        if (updates.email && updates.email !== user.email) {
            if (this.users.some(u => u.email === updates.email)) {
                throw new Error('Email already in use');
            }
            if (!this._validateEmail(updates.email)) {
                throw new Error('Invalid email address');
            }
        }
        
        // Don't allow changing own role unless you're admin
        if (updates.role && updates.role !== user.role) {
            this._logAction('system', `User role changed from ${user.role} to ${updates.role} for ${user.email}`);
        }
        
        // If password is being updated, hash it
        if (updates.password) {
            if (!this._validatePassword(updates.password)) {
                throw new Error('Password does not meet requirements');
            }
            updates.password = this._hashPasswordSync(updates.password);
        }
        
        Object.assign(user, updates);
        this._logAction('system', `User ${user.email} updated`);
        
        // Add notification to user if their account was updated by admin
        const currentUser = this.verifySession(Object.keys(this.sessions)[0]);
        if (currentUser && currentUser.id !== user.id) {
            this.addNotification(
                user.id, 
                'Your account information has been updated by an administrator',
                'warning'
            );
        }
        
        return user;
    }

    getAllRequests(filter = {}) {
        let requests = [...this.requests];
        
        if (filter.status) {
            requests = requests.filter(r => r.status === filter.status);
        }
        
        if (filter.priority) {
            requests = requests.filter(r => r.priority == filter.priority);
        }
        
        if (filter.department) {
            requests = requests.filter(r => r.department === filter.department);
        }
        
        if (filter.userId) {
            requests = requests.filter(r => r.userId === filter.userId);
        }
        
        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            requests = requests.filter(r => 
                r.title.toLowerCase().includes(searchTerm) || 
                r.description.toLowerCase().includes(searchTerm)
            );
        }
        
        return requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getSystemStats() {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const newUsers = this.users.filter(u => new Date(u.createdAt) > sevenDaysAgo).length;
        const activeUsers = this.users.filter(u => u.lastLogin && new Date(u.lastLogin) > twentyFourHoursAgo).length;
        
        const highPriorityRequests = this.requests.filter(r => r.priority >= 7).length;
        const newRequests = this.requests.filter(r => new Date(r.createdAt) > twentyFourHoursAgo).length;
        
        // Calculate average response time (simplified)
        const completedRequests = this.requests.filter(r => r.status === 'completed');
        let totalResponseTime = 0;
        completedRequests.forEach(r => {
            const created = new Date(r.createdAt);
            const completed = new Date(r.history.find(h => h.to === 'completed').at);
            totalResponseTime += (completed - created) / (1000 * 60 * 60); // in hours
        });
        const avgResponseTime = completedRequests.length > 0 
            ? Math.round(totalResponseTime / completedRequests.length)
            : 0;
        
        return {
            totalUsers: this.users.length,
            activeUsers,
            newUsers,
            totalRequests: this.requests.length,
            pendingRequests: this.requests.filter(r => r.status === 'pending').length,
            processingRequests: this.requests.filter(r => r.status === 'processing').length,
            completedRequests: completedRequests.length,
            highPriorityRequests,
            newRequests,
            avgResponseTime,
            resolutionRate: this.requests.length > 0 
                ? Math.round((completedRequests.length / this.requests.length) * 100)
                : 0
        };
    }

    // ======================
    // NOTIFICATIONS
    // ======================
    
    addNotification(userId, message, type = 'info') {
        const notification = {
            id: this._generateId(),
            userId,
            message,
            type,
            read: false,
            createdAt: new Date()
        };
        
        this.notifications.push(notification);
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.notifications.push(notification.id);
        }
        
        return notification;
    }

    getUnreadNotifications(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return [];
        
        return this.notifications.filter(n => 
            n.userId === userId && !n.read
        );
    }

    markNotificationsAsRead(userId) {
        const unread = this.getUnreadNotifications(userId);
        unread.forEach(n => n.read = true);
        return unread.length;
    }

    // ======================
    // PRIVATE METHODS
    // ======================
    
    _initializeDefaultData() {
        // Create admin user
        const adminUser = {
            id: 'admin-001',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            password: this._hashPasswordSync('Admin123!'), // Stronger default password
            role: 'admin',
            department: 'management',
            isActive: true,
            createdAt: new Date('2023-01-01'),
            lastLogin: new Date(),
            requests: [],
            notifications: []
        };
        this.users.push(adminUser);
        
        // Create support user
        const supportUser = {
            id: 'support-001',
            firstName: 'Support',
            lastName: 'Agent',
            email: 'support@example.com',
            password: this._hashPasswordSync('Support123!'),
            role: 'support',
            department: 'technical',
            isActive: true,
            createdAt: new Date('2023-01-01'),
            lastLogin: new Date(),
            requests: [],
            notifications: []
        };
        this.users.push(supportUser);
        
        // Create regular user
        const regularUser = {
            id: 'user-001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: this._hashPasswordSync('Password123!'),
            role: 'user',
            department: 'sales',
            isActive: true,
            createdAt: new Date('2023-01-15'),
            lastLogin: new Date(),
            requests: [],
            notifications: []
        };
        this.users.push(regularUser);
        
        // Default departments
        this.departments = [
            { id: 1, name: 'Technical Support', slug: 'technical', manager: 'support-001' },
            { id: 2, name: 'Billing', slug: 'billing', manager: null },
            { id: 3, name: 'Feature Requests', slug: 'features', manager: null },
            { id: 4, name: 'Management', slug: 'management', manager: 'admin-001' }
        ];
        
        // Default templates
        this.templates = [
            {
                id: 1,
                name: 'Bug Report',
                slug: 'bug',
                title: 'Bug Report: {{description}}',
                description: '**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n**Actual behavior:**\n\n**Environment:**\n- Device: \n- OS: \n- Browser: ',
                priority: 7,
                category: 'bug',
                department: 'technical'
            },
            {
                id: 2,
                name: 'Feature Request',
                slug: 'feature',
                title: 'Feature: {{description}}',
                description: '**Description of the feature:**\n\n**Why is this needed?**\n\n**Suggested implementation:**',
                priority: 3,
                category: 'feature',
                department: 'features'
            },
            {
                id: 3,
                name: 'Support Ticket',
                slug: 'support',
                title: 'Support: {{description}}',
                description: '**Description of the issue:**\n\n**Steps to reproduce:**\n\n**Error messages (if any):**',
                priority: 5,
                category: 'support',
                department: 'technical'
            }
        ];
        
        // Sample requests
        this.createRequest(regularUser.id, {
            title: 'Login page not working',
            description: 'When I try to login, I get a 500 error. This happens on both Chrome and Firefox.',
            priority: 7,
            category: 'bug',
            department: 'technical'
        });
        
        this.createRequest(regularUser.id, {
            title: 'Add dark mode',
            description: 'Please add a dark mode option to the interface. Many users prefer dark themes for eye comfort.',
            priority: 3,
            category: 'feature',
            department: 'features'
        });
        
        this.createRequest(regularUser.id, {
            title: 'Billing information incorrect',
            description: 'My billing statement for January shows incorrect charges.',
            priority: 5,
            category: 'billing',
            department: 'billing'
        });
        
        // Add some completed requests
        const completedRequest = this.createRequest(regularUser.id, {
            title: 'Password reset not working',
            description: 'The password reset link in emails is not working.',
            priority: 5,
            category: 'support',
            department: 'technical'
        });
        this.updateRequestStatus(completedRequest.id, supportUser.id, 'completed', 'Fixed in v1.2.3');
        
        // Add some notifications
        this.addNotification(regularUser.id, 'Your request "Password reset not working" has been completed', 'success');
        this.addNotification(supportUser.id, 'New high priority request: Login page not working', 'warning');
        this.addNotification(adminUser.id, 'System maintenance scheduled for tonight', 'info');
    }

    _validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    _validatePassword(password) {
        const requirements = this.settings.passwordRequirements;
        
        if (password.length < requirements.minLength) {
            return false;
        }
        
        if (requirements.requireNumber && !/\d/.test(password)) {
            return false;
        }
        
        if (requirements.requireSpecialChar && !/[!@#$%^&*]/.test(password)) {
            return false;
        }
        
        return true;
    }

    async _hashPassword(password) {
        // In a real app, use proper hashing like bcrypt
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    _hashPasswordSync(password) {
        // Simplified for demo - don't use in production
        return 'hashed_' + password;
    }

    async _verifyPassword(inputPassword, storedHash) {
        const inputHash = await this._hashPassword(inputPassword);
        return inputHash === storedHash;
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    _generateSessionId() {
        return 'sess_' + this._generateId();
    }

    _logAction(userId, action) {
        this.auditLogs.push({
            id: this._generateId(),
            userId,
            action,
            timestamp: new Date(),
            ipAddress: this._getClientIp(),
            userAgent: navigator.userAgent
        });
    }

    _notifyDepartment(department, request) {
        // In a real app, this would send notifications to department members
        const dept = this.departments.find(d => d.slug === department);
        if (!dept) return;
        
        // Notify department manager if exists
        if (dept.manager) {
            this.addNotification(
                dept.manager,
                `New request in ${dept.name}: ${request.title}`,
                request.priority >= 7 ? 'danger' : 'info'
            );
        }
        
        // Also notify admin
        const admin = this.users.find(u => u.role === 'admin');
        if (admin && admin.id !== dept.manager) {
            this.addNotification(
                admin.id,
                `New request in ${dept.name}: ${request.title}`,
                request.priority >= 7 ? 'danger' : 'info'
            );
        }
    }

    _getClientIp() {
        // Simplified - in a real app get from request headers
        return '127.0.0.1';
    }
}

// UI Controller Class
class AppController {
    constructor(system) {
        this.system = system;
        this.currentUser = null;
        this.currentSession = null;
        this.currentPage = 'home';
        this.currentAdminPage = 'dashboard';
        this.charts = {};
        this.currentRequestFilter = 'all';
        
        this.initElements();
        this.bindEvents();
        this.initTheme();
        this.checkSession();
    }

    initElements() {
        // Main pages
        this.elements = {
            homePage: document.getElementById('homePage'),
            authPage: document.getElementById('authPage'),
            queuePage: document.getElementById('queuePage'),
            adminPage: document.getElementById('adminPage'),
            
            // Navigation
            navHome: document.getElementById('navHome'),
            navQueue: document.getElementById('navQueue'),
            navAdminItem: document.getElementById('navAdminItem'),
            navQueueItem: document.getElementById('navQueueItem'),
            navUserName: document.getElementById('navUserName'),
            notificationBadge: document.getElementById('notificationBadge'),
            navLogout: document.getElementById('navLogout'),
            navDarkMode: document.getElementById('navDarkMode'),
            darkModeText: document.getElementById('darkModeText'),
            
            // Auth elements
            loginForm: document.getElementById('loginForm'),
            loginEmail: document.getElementById('loginEmail'),
            loginPassword: document.getElementById('loginPassword'),
            toggleLoginPassword: document.getElementById('toggleLoginPassword'),
            loginBtn: document.getElementById('loginBtn'),
            
            registerForm: document.getElementById('registerForm'),
            registerFirstName: document.getElementById('registerFirstName'),
            registerLastName: document.getElementById('registerLastName'),
            registerEmail: document.getElementById('registerEmail'),
            registerPassword: document.getElementById('registerPassword'),
            registerConfirm: document.getElementById('registerConfirm'),
            toggleRegisterPassword: document.getElementById('toggleRegisterPassword'),
            registerBtn: document.getElementById('registerBtn'),
            
            forgotForm: document.getElementById('forgotForm'),
            forgotBtn: document.getElementById('forgotBtn'),
            
            loginTabBtn: document.getElementById('loginTabBtn'),
            registerTabBtn: document.getElementById('registerTabBtn'),
            forgotTabBtn: document.getElementById('forgotTabBtn'),
            
            // Queue elements
            requestForm: document.getElementById('requestForm'),
            requestTitle: document.getElementById('requestTitle'),
            requestDescription: document.getElementById('requestDescription'),
            requestPriority: document.getElementById('requestPriority'),
            requestCategory: document.getElementById('requestCategory'),
            requestAttachments: document.getElementById('requestAttachments'),
            submitRequestBtn: document.getElementById('submitRequestBtn'),
            
            userRequestsList: document.getElementById('userRequestsList'),
            requestsCount: document.getElementById('requestsCount'),
            refreshRequestsBtn: document.getElementById('refreshRequestsBtn'),
            filterDropdown: document.getElementById('filterDropdown'),
            
            // Admin elements
            adminDashboardContent: document.getElementById('adminDashboardContent'),
            adminUsersContent: document.getElementById('adminUsersContent'),
            adminQueueContent: document.getElementById('adminQueueContent'),
            
            adminDashboardLink: document.getElementById('adminDashboardLink'),
            adminUsersLink: document.getElementById('adminUsersLink'),
            adminQueueLink: document.getElementById('adminQueueLink'),
            
            totalUsersCount: document.getElementById('totalUsersCount'),
            activeUsersCount: document.getElementById('activeUsersCount'),
            newUsersCount: document.getElementById('newUsersCount'),
            activeRequestsCount: document.getElementById('activeRequestsCount'),
            highPriorityCount: document.getElementById('highPriorityCount'),
            newRequestsCount: document.getElementById('newRequestsCount'),
            pendingRequestsCount: document.getElementById('pendingRequestsCount'),
            pendingOverdueCount: document.getElementById('pendingOverdueCount'),
            pendingAssignedCount: document.getElementById('pendingAssignedCount'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            resolutionRate: document.getElementById('resolutionRate'),
            satisfactionRate: document.getElementById('satisfactionRate'),
            
            usersTable: document.getElementById('usersTable'),
            queueTable: document.getElementById('queueTable'),
            queueSearchInput: document.getElementById('queueSearchInput'),
            queueSearchBtn: document.getElementById('queueSearchBtn'),
            
            // Modals
            userModal: new bootstrap.Modal(document.getElementById('userModal')),
            requestModal: new bootstrap.Modal(document.getElementById('requestModal')),
            termsModal: new bootstrap.Modal(document.getElementById('termsModal')),
            
            // Toast
            liveToast: new bootstrap.Toast(document.getElementById('liveToast')),
            toastTitle: document.getElementById('toastTitle'),
            toastMessage: document.getElementById('toastMessage'),
            toastTime: document.getElementById('toastTime'),
            
            // Charts
            priorityChart: document.getElementById('priorityChart'),
            categoryChart: document.getElementById('categoryChart')
        };
    }

    bindEvents() {
        // Navigation
        this.elements.navHome.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHomePage();
        });
        
        this.elements.navQueue.addEventListener('click', (e) => {
            e.preventDefault();
            this.showQueuePage();
        });
        
        this.elements.navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        this.elements.navDarkMode.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleDarkMode();
        });
        
        // Auth forms
        this.elements.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        this.elements.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        this.elements.forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
        
        this.elements.toggleLoginPassword.addEventListener('click', () => {
            this.togglePasswordVisibility(this.elements.loginPassword);
        });
        
        this.elements.toggleRegisterPassword.addEventListener('click', () => {
            this.togglePasswordVisibility(this.elements.registerPassword);
        });
        
        // Queue forms
        this.elements.requestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRequest();
        });
        
        this.elements.refreshRequestsBtn.addEventListener('click', () => {
            this.loadUserRequests(this.currentRequestFilter);
        });
        
        // Admin navigation
        this.elements.adminDashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminDashboard();
        });
        
        this.elements.adminUsersLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminUsers();
        });
        
        this.elements.adminQueueLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAdminQueue();
        });
        
        // Template dropdown items
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const template = e.target.getAttribute('data-template');
                this.applyTemplate(template);
            });
        });
        
        // Filter dropdown items
        document.querySelectorAll('.filter-option').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = e.target.getAttribute('data-filter');
                this.currentRequestFilter = filter;
                this.loadUserRequests(filter);
                
                // Update active state
                document.querySelectorAll('.filter-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Get started button
        document.getElementById('getStartedBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.showQueuePage();
            } else {
                this.showAuthPage();
                this.elements.loginTabBtn.click();
            }
        });
        
        // Admin queue search
        this.elements.queueSearchBtn.addEventListener('click', () => {
            this.loadAdminQueue();
        });
        
        this.elements.queueSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadAdminQueue();
            }
        });
        
        // Request modal form submission
        document.getElementById('saveRequestBtn').addEventListener('click', () => {
            this.saveRequestChanges();
        });
    }

    initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme') || this.system.settings.theme;
        
        // Handle 'auto' theme
        if (savedTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        } else {
            this.setTheme(savedTheme);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.system.settings.theme === 'auto') {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        this.system.settings.theme = theme;
        localStorage.setItem('theme', theme);
        
        // Update toggle button text
        this.elements.darkModeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    checkSession() {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            this.currentUser = this.system.verifySession(sessionId);
            if (this.currentUser) {
                this.currentSession = sessionId;
                this.updateUIAfterLogin();
                this.showHomePage();
                return;
            }
        }
        
        // No valid session, show home page
        this.showHomePage();
    }

    async handleLogin() {
        const email = this.elements.loginEmail.value;
        const password = this.elements.loginPassword.value;
        
        // Show loading state
        const originalText = this.elements.loginBtn.innerHTML;
        this.elements.loginBtn.disabled = true;
        this.elements.loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
        
        try {
            const result = await this.system.authenticate(email, password);
            if (result) {
                this.currentUser = result.user;
                this.currentSession = result.sessionId;
                localStorage.setItem('sessionId', result.sessionId);
                
                this.updateUIAfterLogin();
                this.showHomePage();
                this.showToast('Success', 'You have been logged in successfully', 'success');
            } else {
                throw new Error('Invalid email or password');
            }
        } catch (error) {
            this.showToast('Login Failed', error.message, 'danger');
        } finally {
            // Restore button state
            this.elements.loginBtn.disabled = false;
            this.elements.loginBtn.innerHTML = originalText;
        }
    }

    async handleRegister() {
        const firstName = this.elements.registerFirstName.value;
        const lastName = this.elements.registerLastName.value;
        const email = this.elements.registerEmail.value;
        const password = this.elements.registerPassword.value;
        const confirm = this.elements.registerConfirm.value;
        
        if (password !== confirm) {
            this.showToast('Registration Failed', 'Passwords do not match', 'danger');
            return;
        }
        
        // Show loading state
        const originalText = this.elements.registerBtn.innerHTML;
        this.elements.registerBtn.disabled = true;
        this.elements.registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating account...';
        
        try {
            const user = await this.system.registerUser({
                firstName,
                lastName,
                email,
                password
            });
            
            // Automatically log in the new user
            const result = await this.system.authenticate(email, password);
            this.currentUser = result.user;
            this.currentSession = result.sessionId;
            localStorage.setItem('sessionId', result.sessionId);
            
            this.updateUIAfterLogin();
            this.showHomePage();
            this.showToast('Success', 'Account created and logged in successfully', 'success');
        } catch (error) {
            this.showToast('Registration Failed', error.message, 'danger');
        } finally {
            // Restore button state
            this.elements.registerBtn.disabled = false;
            this.elements.registerBtn.innerHTML = originalText;
        }
    }

    handleForgotPassword() {
        this.showToast('Password Reset', 'If an account exists with this email, a reset link has been sent', 'info');
        this.elements.forgotForm.reset();
    }

    logout() {
        if (this.currentSession) {
            this.system.logout(this.currentSession);
            localStorage.removeItem('sessionId');
        }
        
        this.currentUser = null;
        this.currentSession = null;
        this.updateUIAfterLogout();
        this.showHomePage();
        this.showToast('Logged Out', 'You have been logged out successfully', 'info');
    }

    updateUIAfterLogin() {
        // Update navigation
        this.elements.navUserName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        
        // Show/hide nav items based on role
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'support') {
            this.elements.navAdminItem.style.display = 'block';
        } else {
            this.elements.navAdminItem.style.display = 'none';
        }
        
        this.elements.navQueueItem.style.display = 'block';
        
        // Update notification badge
        this.updateNotificationBadge();
        
        // Mark notifications as read when dropdown is opened
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.addEventListener('shown.bs.dropdown', () => {
                const unreadCount = this.system.markNotificationsAsRead(this.currentUser.id);
                if (unreadCount > 0) {
                    this.updateNotificationBadge();
                }
            });
        }
    }

    updateUIAfterLogout() {
        // Reset navigation
        this.elements.navUserName.textContent = 'Guest';
        this.elements.navAdminItem.style.display = 'none';
        this.elements.navQueueItem.style.display = 'none';
        this.elements.notificationBadge.textContent = '0';
        
        // Reset forms
        this.elements.loginForm.reset();
        this.elements.registerForm.reset();
    }

    updateNotificationBadge() {
        if (!this.currentUser) return;
        
        const unread = this.system.getUnreadNotifications(this.currentUser.id).length;
        this.elements.notificationBadge.textContent = unread;
        
        // Update badge visibility
        if (unread > 0) {
            this.elements.notificationBadge.style.display = 'inline-block';
        } else {
            this.elements.notificationBadge.style.display = 'none';
        }
    }

    showToast(title, message, type = 'info') {
        this.elements.toastTitle.textContent = title;
        this.elements.toastMessage.textContent = message;
        this.elements.toastTime.textContent = new Date().toLocaleTimeString();
        
        // Set background color based on type
        const toast = document.getElementById('liveToast');
        toast.classList.remove('text-bg-primary', 'text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info');
        toast.classList.add(`text-bg-${type}`);
        
        this.elements.liveToast.show();
    }

    togglePasswordVisibility(inputElement) {
        const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
        inputElement.setAttribute('type', type);
        
        // Toggle icon
        const icon = inputElement.nextElementSibling.querySelector('i');
        if (icon) {
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        }
    }

    // ======================
    // PAGE NAVIGATION
    // ======================
    
    showHomePage() {
        this.currentPage = 'home';
        this.hideAllPages();
        this.elements.homePage.style.display = 'block';
    }

    showAuthPage() {
        this.currentPage = 'auth';
        this.hideAllPages();
        this.elements.authPage.style.display = 'block';
    }

    showQueuePage() {
        if (!this.currentUser) {
            this.showAuthPage();
            return;
        }
        
        this.currentPage = 'queue';
        this.hideAllPages();
        this.elements.queuePage.style.display = 'block';
        
        // Load user requests
        this.loadUserRequests(this.currentRequestFilter);
    }

    showAdminPage() {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.role !== 'support')) {
            this.showHomePage();
            return;
        }
        
        this.currentPage = 'admin';
        this.hideAllPages();
        this.elements.adminPage.style.display = 'block';
        
        // Show dashboard by default
        this.showAdminDashboard();
    }

    showAdminDashboard() {
        this.currentAdminPage = 'dashboard';
        this.hideAdminSections();
        this.elements.adminDashboardContent.style.display = 'block';
        
        // Load stats
        this.loadAdminStats();
        
        // Initialize charts
        this.initCharts();
        
        // Load recent activity
        this.loadRecentActivity();
    }

    showAdminUsers() {
        if (this.currentUser.role !== 'admin') {
            this.showAdminDashboard();
            return;
        }
        
        this.currentAdminPage = 'users';
        this.hideAdminSections();
        this.elements.adminUsersContent.style.display = 'block';
        
        // Load users
        this.loadAdminUsers();
    }

    showAdminQueue() {
        this.currentAdminPage = 'queue';
        this.hideAdminSections();
        this.elements.adminQueueContent.style.display = 'block';
        
        // Load queue
        this.loadAdminQueue();
    }

    hideAllPages() {
        this.elements.homePage.style.display = 'none';
        this.elements.authPage.style.display = 'none';
        this.elements.queuePage.style.display = 'none';
        this.elements.adminPage.style.display = 'none';
    }

    hideAdminSections() {
        this.elements.adminDashboardContent.style.display = 'none';
        this.elements.adminUsersContent.style.display = 'none';
        this.elements.adminQueueContent.style.display = 'none';
    }

    // ======================
    // QUEUE MANAGEMENT
    // ======================
    
    loadUserRequests(filter = 'all') {
        if (!this.currentUser) return;
        
        const requests = this.system.getRequestsForUser(this.currentUser.id, filter);
        this.elements.requestsCount.textContent = requests.length;
        
        const requestsList = this.elements.userRequestsList;
        requestsList.innerHTML = '';
        
        if (requests.length === 0) {
            requestsList.innerHTML = `
                <div class="list-group-item text-center py-5 text-muted">
                    <i class="bi bi-inbox" style="font-size: 2.5rem; opacity: 0.5;"></i>
                    <h5 class="h6 mt-3">No requests found</h5>
                    <p class="small mb-0">${filter === 'all' ? 'Submit your first request using the form' : 'No requests match this filter'}</p>
                </div>
            `;
            return;
        }
        
        requests.forEach(request => {
            const priorityClass = this.getPriorityClass(request.priority);
            const statusClass = this.getStatusClass(request.status);
            
            const requestEl = document.createElement('a');
            requestEl.href = '#';
            requestEl.className = 'list-group-item list-group-item-action queue-item';
            requestEl.style.borderLeftColor = this.getPriorityColor(request.priority);
            requestEl.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${request.title}</h6>
                    <small class="text-nowrap">${this.formatDate(request.createdAt)}</small>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${request.category}</small>
                    <div>
                        <span class="badge ${priorityClass} me-1">Priority: ${request.priority}</span>
                        <span class="badge ${statusClass}">${request.status}</span>
                    </div>
                </div>
            `;
            
            requestEl.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRequestModal(request.id);
            });
            
            requestsList.appendChild(requestEl);
        });
    }

    async submitRequest() {
        if (!this.currentUser) {
            this.showToast('Error', 'You must be logged in to submit a request', 'danger');
            return;
        }
        
        const title = this.elements.requestTitle.value;
        const description = this.elements.requestDescription.value;
        const priority = this.elements.requestPriority.value;
        const category = this.elements.requestCategory.value;
        
        if (!title || title.length < 5) {
            this.showToast('Error', 'Title must be at least 5 characters', 'danger');
            return;
        }
        
        if (!description || description.length < 10) {
            this.showToast('Error', 'Description must be at least 10 characters', 'danger');
            return;
        }
        
        if (!priority || !category) {
            this.showToast('Error', 'Please select priority and category', 'danger');
            return;
        }
        
        // Show loading state
        const originalText = this.elements.submitRequestBtn.innerHTML;
        this.elements.submitRequestBtn.disabled = true;
        this.elements.submitRequestBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
        
        try {
            const request = this.system.createRequest(this.currentUser.id, {
                title,
                description,
                priority: parseInt(priority),
                category
            });
            
            this.elements.requestForm.reset();
            this.loadUserRequests(this.currentRequestFilter);
            this.showToast('Success', 'Request submitted successfully', 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to submit request: ' + error.message, 'danger');
        } finally {
            // Restore button state
            this.elements.submitRequestBtn.disabled = false;
            this.elements.submitRequestBtn.innerHTML = originalText;
        }
    }

    applyTemplate(templateSlug) {
        const template = this.system.templates.find(t => t.slug === templateSlug);
        if (!template) return;
        
        this.elements.requestTitle.value = template.title.replace('{{description}}', '');
        this.elements.requestDescription.value = template.description;
        this.elements.requestPriority.value = template.priority;
        this.elements.requestCategory.value = template.category;
        
        // Focus on description field
        this.elements.requestDescription.focus();
    }

    // ======================
    // ADMIN FUNCTIONS
    // ======================
    
    loadAdminStats() {
        const stats = this.system.getSystemStats();
        
        this.elements.totalUsersCount.textContent = stats.totalUsers;
        this.elements.activeUsersCount.textContent = stats.activeUsers;
        this.elements.newUsersCount.textContent = stats.newUsers;
        
        this.elements.activeRequestsCount.textContent = stats.totalRequests;
        this.elements.highPriorityCount.textContent = stats.highPriorityRequests;
        this.elements.newRequestsCount.textContent = stats.newRequests;
        
        this.elements.pendingRequestsCount.textContent = stats.pendingRequests;
        this.elements.pendingOverdueCount.textContent = '0'; // Would need due dates
        this.elements.pendingAssignedCount.textContent = '0'; // Would need assignment tracking
        
        this.elements.avgResponseTime.textContent = `${stats.avgResponseTime}h`;
        this.elements.resolutionRate.textContent = stats.resolutionRate;
        this.elements.satisfactionRate.textContent = '90'; // Would need feedback system
    }

    initCharts() {
        // Destroy existing charts if they exist
        if (this.charts.priorityChart) {
            this.charts.priorityChart.destroy();
        }
        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }
        
        // Priority chart
        const priorityCtx = this.elements.priorityChart.getContext('2d');
        this.charts.priorityChart = new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: ['Low (1)', 'Medium (3)', 'High (5)', 'Urgent (7)', 'Emergency (9)'],
                datasets: [{
                    label: 'Requests by Priority',
                    data: [5, 12, 8, 4, 2],
                    backgroundColor: [
                        '#6c757d',
                        '#0dcaf0',
                        '#ffc107',
                        '#fd7e14',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        // Category chart
        const categoryCtx = this.elements.categoryChart.getContext('2d');
        this.charts.categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['General', 'Technical', 'Billing', 'Feature', 'Bug'],
                datasets: [{
                    label: 'Requests by Category',
                    data: [5, 12, 8, 7, 3],
                    backgroundColor: [
                        '#6c757d',
                        '#0d6efd',
                        '#198754',
                        '#ffc107',
                        '#dc3545'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    loadRecentActivity() {
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;
        
        // Get recent activity (in a real app, this would come from the system)
        const activities = [
            { action: 'New request submitted', user: 'John Doe', time: '2 minutes ago' },
            { action: 'Request #1234 completed', user: 'Support Agent', time: '15 minutes ago' },
            { action: 'New user registered', user: 'System', time: '1 hour ago' },
            { action: 'Priority changed on request #1233', user: 'Admin User', time: '2 hours ago' },
            { action: 'System maintenance completed', user: 'System', time: 'Yesterday' }
        ];
        
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const activityEl = document.createElement('div');
            activityEl.className = 'list-group-item list-group-item-action';
            activityEl.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <p class="mb-1">${activity.action}</p>
                    <small class="text-muted">${activity.time}</small>
                </div>
                <small class="text-muted">${activity.user}</small>
            `;
            activityList.appendChild(activityEl);
        });
    }

    loadAdminUsers() {
        const users = this.system.getAllUsers();
        const tbody = this.elements.usersTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-people" style="font-size: 2rem;"></i>
                        <p class="mt-2 mb-0">No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="badge ${this.getRoleClass(user.role)}">${user.role}</span></td>
                <td>${user.lastLogin ? this.formatDate(user.lastLogin) : 'Never'}</td>
                <td>${user.requests ? user.requests.length : 0}</td>
                <td>
                    <span class="badge ${user.isActive ? 'bg-success' : 'bg-secondary'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-user-id="${user.id}">
                        <i class="bi bi-pencil-square"></i> Edit
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
            
            // Add edit button handler
            tr.querySelector('button').addEventListener('click', () => {
                this.showUserModal(user.id);
            });
        });
    }

    loadAdminQueue() {
        const searchTerm = this.elements.queueSearchInput.value.toLowerCase();
        const requests = this.system.getAllRequests({
            search: searchTerm
        });
        
        const tbody = this.elements.queueTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        if (requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-list-check" style="font-size: 2rem;"></i>
                        <p class="mt-2 mb-0">${searchTerm ? 'No matching requests found' : 'No requests in queue'}</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        requests.forEach(request => {
            const user = this.system.users.find(u => u.id === request.userId);
            const requesterName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
            const priorityClass = this.getPriorityClass(request.priority);
            const statusClass = this.getStatusClass(request.status);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${request.id.substring(0, 6)}</td>
                <td>${request.title}</td>
                <td>${requesterName}</td>
                <td><span class="badge ${priorityClass}">${request.priority}</span></td>
                <td><span class="badge ${statusClass}">${request.status}</span></td>
                <td>${this.formatDate(request.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-request-id="${request.id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
            
            // Add view button handler
            tr.querySelector('button').addEventListener('click', () => {
                this.showRequestModal(request.id);
            });
        });
    }

    showUserModal(userId) {
        const user = this.system.users.find(u => u.id === userId);
        if (!user) return;
        
        // Populate form
        document.getElementById('userId').value = user.id;
        document.getElementById('userFirstName').value = user.firstName;
        document.getElementById('userLastName').value = user.lastName;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userDepartment').value = user.department || '';
        document.getElementById('userStatus').value = user.isActive ? 'active' : 'inactive';
        
        // Show/hide password fields based on whether this is a new user
        const passwordFields = document.getElementById('passwordFields');
        passwordFields.style.display = 'none';
        
        // Show modal
        this.elements.userModal.show();
    }

    showRequestModal(requestId) {
        const request = this.system.requests.find(r => r.id === requestId);
        if (!request) return;
        
        const user = this.system.users.find(u => u.id === request.userId);
        const requesterName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        
        // Update modal content
        document.getElementById('requestModalLabel').textContent = `Request #${request.id.substring(0, 6)}`;
        document.getElementById('requestModalTitle').textContent = request.title;
        document.getElementById('requestModalPriority').textContent = `Priority: ${request.priority}`;
        document.getElementById('requestModalDescription').innerHTML = marked.parse(request.description);
        document.getElementById('requestModalRequester').textContent = requesterName;
        document.getElementById('requestModalCreated').textContent = this.formatDate(request.createdAt);
        document.getElementById('requestModalUpdated').textContent = this.formatDate(request.updatedAt);
        document.getElementById('requestModalCategory').textContent = request.category;
        document.getElementById('requestModalStatus').value = request.status;
        document.getElementById('requestModalPrioritySelect').value = request.priority;
        
        // Populate assignee dropdown
        const assigneeSelect = document.getElementById('requestModalAssignee');
        assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
        
        this.system.users.filter(u => u.role === 'admin' || u.role === 'support').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.firstName} ${user.lastName}`;
            if (request.assignedTo === user.id) {
                option.selected = true;
            }
            assigneeSelect.appendChild(option);
        });
        
        // Populate attachments
        const attachmentsContainer = document.getElementById('requestModalAttachments');
        attachmentsContainer.innerHTML = request.attachments && request.attachments.length > 0 
            ? request.attachments.map(a => `
                <div class="attachment-chip">
                    <i class="bi bi-paperclip"></i>
                    ${a.name}
                </div>
            `).join('')
            : '<div class="text-muted small">No attachments</div>';
        
        // Populate activity log
        const activityLog = document.getElementById('requestActivityLog');
        activityLog.innerHTML = request.history.map(entry => {
            const user = this.system.users.find(u => u.id === entry.by);
            const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
            
            let actionText = '';
            if (entry.action === 'created') {
                actionText = 'Request created';
            } else if (entry.action === 'status_change') {
                actionText = `Status changed from ${entry.from} to ${entry.to}`;
            }
            
            return `
                <div class="timeline-item">
                    <div class="timeline-point"></div>
                    <div class="timeline-content">
                        <p class="mb-1 small">${actionText}</p>
                        <p class="text-muted small mb-0">${userName} • ${this.formatDate(entry.at)}</p>
                        ${entry.comment ? `<p class="small mt-1">${entry.comment}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Show modal
        this.elements.requestModal.show();
    }

    saveRequestChanges() {
        const requestId = document.getElementById('requestModalLabel').textContent.replace('Request #', '');
        const request = this.system.requests.find(r => r.id.startsWith(requestId));
        if (!request) return;
        
        const status = document.getElementById('requestModalStatus').value;
        const priority = document.getElementById('requestModalPrioritySelect').value;
        const assignee = document.getElementById('requestModalAssignee').value;
        const note = document.getElementById('requestNoteText').value;
        
        try {
            // Update status if changed
            if (status !== request.status) {
                this.system.updateRequestStatus(request.id, this.currentUser.id, status, note || 'Status updated');
            }
            
            // Update priority if changed
            if (parseInt(priority) !== request.priority) {
                request.priority = parseInt(priority);
                request.history.push({
                    action: 'priority_change',
                    by: this.currentUser.id,
                    at: new Date(),
                    from: request.priority,
                    to: parseInt(priority),
                    comment: note || 'Priority updated'
                });
            }
            
            // Update assignee if changed
            if (assignee !== request.assignedTo) {
                const oldAssignee = request.assignedTo;
                request.assignedTo = assignee;
                request.history.push({
                    action: 'assignment_change',
                    by: this.currentUser.id,
                    at: new Date(),
                    from: oldAssignee,
                    to: assignee,
                    comment: note || 'Assignment updated'
                });
                
                // Notify new assignee if assigned
                if (assignee) {
                    this.system.addNotification(
                        assignee,
                        `You've been assigned to request: ${request.title}`,
                        'info'
                    );
                }
            }
            
            // Clear note field
            document.getElementById('requestNoteText').value = '';
            
            // Refresh views
            this.loadUserRequests(this.currentRequestFilter);
            this.loadAdminQueue();
            
            // Close modal
            this.elements.requestModal.hide();
            
            this.showToast('Success', 'Request updated successfully', 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to update request: ' + error.message, 'danger');
        }
    }

    // ======================
    // UTILITY FUNCTIONS
    // ======================
    
    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString();
        }
    }

    getPriorityClass(priority) {
        if (priority >= 7) return 'bg-danger';
        if (priority >= 5) return 'bg-warning';
        if (priority >= 3) return 'bg-primary';
        return 'bg-secondary';
    }

    getStatusClass(status) {
        switch (status) {
            case 'pending': return 'bg-warning';
            case 'processing': return 'bg-info';
            case 'completed': return 'bg-success';
            case 'rejected': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getRoleClass(role) {
        switch (role) {
            case 'admin': return 'bg-danger';
            case 'support': return 'bg-info';
            case 'manager': return 'bg-primary';
            default: return 'bg-secondary';
        }
    }

    getPriorityColor(priority) {
        if (priority >= 7) return '#dc3545';
        if (priority >= 5) return '#fd7e14';
        if (priority >= 3) return '#0dcaf0';
        return '#6c757d';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Marked.js for markdown rendering
    marked.setOptions({
        breaks: true,
        gfm: true
    });
    
    // Initialize Flatpickr for date inputs
    flatpickr('[data-flatpickr]', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i'
    });
    
    // Create and initialize the application
    const system = new PriorityQueueSystem();
    const app = new AppController(system);
    
    // Expose for debugging
    window.app = app;
    window.system = system;
    
    // Add demo login buttons for testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const demoLoginContainer = document.createElement('div');
        demoLoginContainer.className = 'position-fixed bottom-0 start-0 p-3';
        demoLoginContainer.style.zIndex = '1000';
        demoLoginContainer.innerHTML = `
            <div class="btn-group shadow">
                <button class="btn btn-sm btn-primary demo-login" data-email="admin@example.com" data-password="Admin123!">Admin</button>
                <button class="btn btn-sm btn-info demo-login" data-email="support@example.com" data-password="Support123!">Support</button>
                <button class="btn btn-sm btn-secondary demo-login" data-email="john@example.com" data-password="Password123!">User</button>
            </div>
        `;
        document.body.appendChild(demoLoginContainer);
        
        // Add demo login handlers
        document.querySelectorAll('.demo-login').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-email');
                const password = btn.getAttribute('data-password');
                
                app.elements.loginEmail.value = email;
                app.elements.loginPassword.value = password;
                app.handleLogin();
            });
        });
    }
});