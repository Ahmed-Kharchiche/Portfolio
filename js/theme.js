const toggleBtn = document.getElementById('theme-toggle');

const savedTheme = localStorage.getItem('theme') || 'dark';

if (savedTheme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    toggleBtn.checked = true;
}

toggleBtn.addEventListener('change', () => {
    if (toggleBtn.checked) {
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    }
});