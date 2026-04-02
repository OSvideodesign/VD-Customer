// js/auth.js

// רשימת משתמשים עם הגדרות העיצוב החדשות
const users = [
    { name: 'אופיר', letter: 'א', color: 'blue' },
    { name: 'גלאל', letter: 'ג', color: 'green' },
    { name: 'מוטי', letter: 'מ', color: 'cyan' },
    { name: 'ר', letter: 'ר', color: 'gray' }
];

let currentUser = null;

// פונקציית אתחול מסך הכניסה
export function initLogin() {
    const grid = document.getElementById('user-grid');
    if (!grid) return;

    grid.innerHTML = '';
    users.forEach(user => {
        const btn = document.createElement('button');
        btn.className = `user-btn ${user.color}`;
        // המבנה החדש שמתאים ל-pages.css
        btn.innerHTML = `
            <span class="ub-letter">${user.letter}</span>
            <span class="ub-name">${user.name}</span>
        `;
        btn.onclick = () => selectUser(user.name);
        grid.appendChild(btn);
    });
}

// בחירת משתמש והצגת אזור הסיסמה + כפתור כניסה
function selectUser(name) {
    currentUser = name;
    
    // הדגשת המשתמש הנבחר (אופציונלי)
    document.querySelectorAll('.user-btn').forEach(b => {
        b.classList.remove('selected');
        if (b.querySelector('.ub-name').innerText === name) b.classList.add('selected');
    });

    // הצגת שדה הסיסמה וכפתור ה"כנס" המוזהב
    const passArea = document.getElementById('pass-area');
    const enterBtn = document.getElementById('login-enter-btn');
    
    if (passArea) passArea.style.display = 'block';
    if (enterBtn) enterBtn.style.display = 'block';
    
    const passInput = document.getElementById('pass-input');
    if (passInput) {
        passInput.value = '';
        passInput.focus();
    }
}

// פונקציית הכניסה בפועל (מופעלת מהכפתור המוזהב או מ-Enter)
export function login() {
    const passInput = document.getElementById('pass-input');
    const pass = passInput ? passInput.value : '';

    if (!currentUser) {
        alert('אנא בחר משתמש');
        return;
    }

    // לוגיקת בדיקת סיסמה פשוטה (ניתן להחליף בבדיקה מול ה-DB)
    if (pass === '1234' || pass === '0526') {
        localStorage.setItem('cv_user', currentUser);
        window.location.reload(); // טעינת המערכת מחדש למשתמש מחובר
    } else {
        alert('סיסמה שגויה');
        if (passInput) passInput.value = '';
    }
}

// האזנה למקש Enter בשדה הסיסמה
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('pass-area')?.style.display === 'block') {
        login();
    }
});