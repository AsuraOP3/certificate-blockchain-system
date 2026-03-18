// API Configuration
const API_URL = 'http://localhost:5000/api';

// Global variables
let currentUser = null;
let token = localStorage.getItem('token');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    
    // Check if user is logged in
    if (token) {
        const userData = localStorage.getItem('user');
        if (userData) {
            currentUser = JSON.parse(userData);
            updateUIForLoggedInUser();
        }
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load page specific content
    loadPageSpecificContent();
});

// Setup all event listeners
function setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openModal('loginModal'));
    }
    
    // Register button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => openModal('registerModal'));
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });
    
    // Show register from login
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('loginModal');
            openModal('registerModal');
        });
    }
    
    // Show login from register
    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('registerModal');
            openModal('loginModal');
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Issue certificate form
    const issueForm = document.getElementById('issueCertificateForm');
    if (issueForm) {
        issueForm.addEventListener('submit', handleIssueCertificate);
    }
    
    // Verify form
    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerify);
    }
    
    // File upload for certificate
    const certFile = document.getElementById('certificateDocument');
    if (certFile) {
        certFile.addEventListener('change', generateCertificateHash);
    }
    
    // Extract hash from file
    const extractBtn = document.getElementById('extractHashBtn');
    if (extractBtn) {
        extractBtn.addEventListener('click', extractHashFromFile);
    }
}

// Load page specific content
function loadPageSpecificContent() {
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/') {
        loadDashboardStats();
    } else if (path.includes('issuer.html')) {
        loadRecentCertificates();
    } else if (path.includes('verify.html')) {
        loadRecentVerifications();
    }
}

// ==================== AUTHENTICATION ====================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            token = data.token;
            
            // Close modal and update UI
            closeModal('loginModal');
            updateUIForLoggedInUser();
            
            // Clear form
            document.getElementById('loginForm').reset();
            
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Failed to connect to server', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        walletAddress: document.getElementById('regWallet').value,
        role: document.getElementById('regRole').value
    };
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            token = data.token;
            
            // Close modal and update UI
            closeModal('registerModal');
            updateUIForLoggedInUser();
            
            // Clear form
            document.getElementById('registerForm').reset();
            
            showNotification('Registration successful!', 'success');
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Failed to connect to server', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    token = null;
    
    // Update UI
    updateUIForLoggedOutUser();
    
    // Redirect to home
    window.location.href = 'index.html';
    
    showNotification('Logged out successfully', 'success');
}

function updateUIForLoggedInUser() {
    // Update navigation buttons
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons) {
        if (currentUser) {
            navButtons.innerHTML = `
                <span class="user-email">${currentUser.email}</span>
                <button id="logoutBtn" class="btn btn-outline">Logout</button>
            `;
            
            // Re-attach logout event listener
            document.getElementById('logoutBtn').addEventListener('click', logout);
        }
    }
    
    // Show user email on pages
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan && currentUser) {
        userEmailSpan.textContent = currentUser.email;
    }
    
    // Update wallet info on issuer page
    const walletSpan = document.getElementById('walletAddress');
    if (walletSpan && currentUser && currentUser.walletAddress) {
        walletSpan.textContent = currentUser.walletAddress;
    }
}

function updateUIForLoggedOutUser() {
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons) {
        navButtons.innerHTML = `
            <button id="loginBtn" class="btn btn-outline">Login</button>
            <button id="registerBtn" class="btn btn-primary">Register</button>
        `;
        
        // Re-attach event listeners
        document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
        document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
    }
    
    // Clear user email
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan) {
        userEmailSpan.textContent = '';
    }
}

// ==================== MODAL FUNCTIONS ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ==================== CERTIFICATE FUNCTIONS ====================

async function handleIssueCertificate(e) {
    e.preventDefault();
    
    if (!token || !currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('studentName', document.getElementById('studentName').value);
    formData.append('studentEmail', document.getElementById('studentEmail').value);
    formData.append('courseName', document.getElementById('courseName').value);
    formData.append('grade', document.getElementById('grade').value);
    formData.append('issueDate', document.getElementById('issueDate').value);
    formData.append('certificateHash', document.getElementById('certificateHash').textContent);
    
    const fileInput = document.getElementById('certificateDocument');
    if (fileInput.files[0]) {
        formData.append('document', fileInput.files[0]);
    }
    
    try {
        document.getElementById('issueBtn').disabled = true;
        document.getElementById('issueBtn').textContent = 'Issuing...';
        
        const response = await fetch(`${API_URL}/issue-certificate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success modal
            document.getElementById('successDetails').innerHTML = `
                <p><strong>Certificate ID:</strong> ${data.certificate.id}</p>
                <p><strong>Student:</strong> ${data.certificate.studentName}</p>
                <p><strong>Course:</strong> ${data.certificate.courseName}</p>
                <p><strong>Blockchain Hash:</strong></p>
                <code>${data.certificate.hash}</code>
            `;
            openModal('successModal');
            
            // Reset form
            document.getElementById('issueCertificateForm').reset();
            document.getElementById('certificateHash').textContent = '-';
            
            // Refresh recent certificates
            loadRecentCertificates();
        } else {
            showNotification(data.error || 'Failed to issue certificate', 'error');
        }
    } catch (error) {
        console.error('Issue certificate error:', error);
        showNotification('Failed to connect to server', 'error');
    } finally {
        document.getElementById('issueBtn').disabled = false;
        document.getElementById('issueBtn').textContent = 'Issue Certificate on Blockchain';
    }
}

function closeSuccessModal() {
    closeModal('successModal');
}

// REPLACE THIS FUNCTION in script.js
function generateCertificateHash() {
    const fileInput = document.getElementById('certificateDocument');
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // FIXED: Better hash generation
            const content = new Uint8Array(e.target.result);
            let hash = 5381; // Better initial value
            
            for (let i = 0; i < content.length; i++) {
                hash = ((hash << 5) + hash) + content[i]; // hash * 33 + c
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            // Convert to positive hex string
            const positiveHash = hash >>> 0; // Convert to unsigned
            const finalHash = '0x' + positiveHash.toString(16).padStart(64, '0');
            
            console.log('Generated hash:', finalHash); // Debug output
            document.getElementById('certificateHash').textContent = finalHash;
        };
        reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
        // FIXED: Generate random hash even without file (for demo)
        generateRandomHash();
    }
}

// ADD THIS NEW FUNCTION for demo purposes
function generateRandomHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * 16)];
    }
    document.getElementById('certificateHash').textContent = hash;
    console.log('Generated random hash:', hash);
}
async function handleVerify(e) {
    e.preventDefault();
    
    const certificateHash = document.getElementById('certificateHash').value;
    
    if (!certificateHash) {
        showNotification('Please enter a certificate hash', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/verify-certificate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ certificateHash })
        });
        
        const data = await response.json();
        
        const resultDiv = document.getElementById('verificationResult');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultDetails = document.getElementById('resultDetails');
        
        resultDiv.style.display = 'block';
        
        if (data.isValid) {
            resultDiv.className = 'verification-result valid';
            resultIcon.textContent = '✅';
            resultTitle.textContent = 'Valid Certificate';
            resultDetails.innerHTML = `
                <p><strong>Student:</strong> ${data.certificate.studentName}</p>
                <p><strong>Course:</strong> ${data.certificate.courseName}</p>
                <p><strong>Issue Date:</strong> ${new Date(data.certificate.issueDate).toLocaleDateString()}</p>
                <p><strong>Grade:</strong> ${data.certificate.grade || 'N/A'}</p>
                <p><strong>Certificate ID:</strong> ${data.certificate.certificateId}</p>
            `;
        } else {
            resultDiv.className = 'verification-result invalid';
            resultIcon.textContent = '❌';
            resultTitle.textContent = 'Invalid Certificate';
            resultDetails.innerHTML = `<p>${data.message || 'Certificate not found or has been revoked'}</p>`;
        }
    } catch (error) {
        console.error('Verification error:', error);
        showNotification('Failed to verify certificate', 'error');
    }
}

function extractHashFromFile() {
    const fileInput = document.getElementById('certificateFile');
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // For demo, we'll simulate extracting hash
            // In production, you'd parse the PDF and extract embedded hash
            const fakeHash = '0x' + Math.random().toString(16).substring(2, 34);
            document.getElementById('certificateHash').value = fakeHash;
            showNotification('Hash extracted from file', 'success');
        };
        reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
        showNotification('Please select a file first', 'error');
    }
}

// ==================== LOAD DATA FUNCTIONS ====================

async function loadDashboardStats() {
    // For demo, set some fake stats
    document.getElementById('certificatesIssued').textContent = '1,234';
    document.getElementById('verifiedToday').textContent = '567';
    document.getElementById('institutions').textContent = '89';
}

async function loadRecentCertificates() {
    const recentList = document.getElementById('recentList');
    if (!recentList) return;
    
    // For demo, show fake recent certificates
    recentList.innerHTML = `
        <div class="certificate-item">
            <h4>John Doe - Computer Science</h4>
            <div class="certificate-meta">
                <span>Issued: 2024-01-15</span>
                <span>Hash: 0x1234...5678</span>
            </div>
        </div>
        <div class="certificate-item">
            <h4>Jane Smith - Blockchain Course</h4>
            <div class="certificate-meta">
                <span>Issued: 2024-01-14</span>
                <span>Hash: 0xabcd...efgh</span>
            </div>
        </div>
        <div class="certificate-item">
            <h4>Bob Johnson - Web Development</h4>
            <div class="certificate-meta">
                <span>Issued: 2024-01-13</span>
                <span>Hash: 0x9876...5432</span>
            </div>
        </div>
    `;
}

async function loadRecentVerifications() {
    const recentList = document.getElementById('recentVerificationsList');
    if (!recentList) return;
    
    // For demo, show fake recent verifications
    recentList.innerHTML = `
        <div class="certificate-item">
            <h4>✅ Valid - John Doe</h4>
            <div class="certificate-meta">
                <span>Verified: Just now</span>
                <span>Hash: 0x1234...5678</span>
            </div>
        </div>
        <div class="certificate-item">
            <h4>✅ Valid - Jane Smith</h4>
            <div class="certificate-meta">
                <span>Verified: 5 mins ago</span>
                <span>Hash: 0xabcd...efgh</span>
            </div>
        </div>
        <div class="certificate-item">
            <h4>❌ Invalid - Suspicious Hash</h4>
            <div class="certificate-meta">
                <span>Verified: 10 mins ago</span>
                <span>Hash: 0x0000...0000</span>
            </div>
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);