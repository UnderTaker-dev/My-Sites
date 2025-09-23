/**
 * Personal Website Controller
 * Handles dark/light mode and basic interactions for Mathias' personal site
 */

class PersonalWebsite {
    constructor() {
        this.currentTheme = this.getPreferredTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
        this.animateElements();
        console.log('Personal website initialized!');
    }

    getPreferredTheme() {
        // Check if user has explicitly set a theme preference
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme;
        }
        
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Update toggle button text
        const darkModeText = document.getElementById('darkModeText');
        const darkModeIcon = document.getElementById('darkModeIcon');
        
        if (darkModeText) {
            darkModeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
        
        if (darkModeIcon) {
            darkModeIcon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    bindEvents() {
        // Dark mode toggle
        const darkModeBtn = document.getElementById('navDarkMode');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Contact form handling
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm(contactForm);
            });
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Add loading states to buttons
        this.handleButtonLoadingStates();
    }

    handleContactForm(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        
        // Simulate form submission (in real implementation, this would be an AJAX call)
        setTimeout(() => {
            // Show success message
            this.showNotification('Message sent!', 'Thanks for reaching out. I\'ll get back to you soon!', 'success');
            
            // Reset form
            form.reset();
            
            // Restore button
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }, 1500);
    }

    showNotification(title, message, type = 'info') {
        // Create toast notification
        const toastContainer = document.createElement('div');
        toastContainer.innerHTML = `
            <div class="toast align-items-center text-bg-${type} border-0 show" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong><br>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        // Add styles for toast positioning
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        
        document.body.appendChild(toastContainer);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toastContainer.parentNode) {
                toastContainer.parentNode.removeChild(toastContainer);
            }
        }, 5000);
        
        // Add click to dismiss
        toastContainer.querySelector('.btn-close').addEventListener('click', () => {
            toastContainer.remove();
        });
    }

    animateElements() {
        // Add animation to elements when they come into view
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with data-animate attribute
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });

        // Animate cards on hover
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    handleButtonLoadingStates() {
        // Add loading states to all buttons with data-loading attribute
        document.querySelectorAll('button[data-loading]').forEach(button => {
            button.addEventListener('click', function() {
                const originalText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
                this.disabled = true;
                
                // Reset after 3 seconds (for demo purposes)
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 3000);
            });
        });
    }
}

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const website = new PersonalWebsite();
    
    // Expose to global scope for debugging
    window.personalWebsite = website;
});

// Add some fun easter eggs
document.addEventListener('keypress', (e) => {
    if (e.key === 'u') { // UnderTaker shortcut
        console.log('🎮 UnderTaker mode activated!');
    }
});

// Handle page transitions
window.addEventListener('beforeunload', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
});