// Import Firebase authentication functions
import { signIn, signUp, checkAuthState } from './auth.js';

// List of admin emails
const ADMIN_EMAILS = [
    'admin@gmail.com',
    'admin1@gmail.com'
];

// Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openSignupModal() {
    document.getElementById('signupModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchToSignup() {
    closeLoginModal();
    setTimeout(openSignupModal, 100);
}

function switchToLogin() {
    closeSignupModal();
    setTimeout(openLoginModal, 100);
}

// Close modal when clicking outside
window.onclick = function (event) {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');

    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === signupModal) {
        closeSignupModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeLoginModal();
        closeSignupModal();
    }
});

// Handle Login Form Submit
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Show loading state
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
        const result = await signIn(email, password);
        
        if (result.success) {
            closeLoginModal();
            
            // Check if user is admin and redirect accordingly
            if (ADMIN_EMAILS.includes(email)) {
                window.location.href = 'pages/adminpanel.html';
            } else {
                window.location.href = 'pages/userdashboard.html';
            }
        } else {
            alert('Login failed: ' + result.error);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        alert('An error occurred during login');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Signup Form Submit
async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    // Show loading state
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;

    try {
        const result = await signUp(email, password, name);
        
        if (result.success) {
            closeSignupModal();
            // Redirect to dashboard
            window.location.href = 'pages/userdashboard.html';
        } else {
            alert('Signup failed: ' + result.error);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        alert('An error occurred during signup');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Check authentication state on page load
checkAuthState((user) => {
    if (user) {
        // User is signed in, check if admin
        console.log('User is signed in:', user.email);
        
        // Redirect admin to admin panel
        if (ADMIN_EMAILS.includes(user.email)) {
            window.location.href = 'pages/adminpanel.html';
        }
    } else {
        // User is signed out
        console.log('User is signed out');
    }
});

// Make functions globally available
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openSignupModal = openSignupModal;
window.closeSignupModal = closeSignupModal;
window.switchToSignup = switchToSignup;
window.switchToLogin = switchToLogin;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
