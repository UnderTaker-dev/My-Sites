const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function setTheme(mode){
    document.body.className = mode;
    localStorage.setItem('theme', mode);
    themeIcon.className = mode === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// Toggle
themeToggle.addEventListener('click', () => {
    const newTheme = document.body.className === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});
