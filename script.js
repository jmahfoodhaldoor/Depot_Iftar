const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz20JxZO0UPJRUmdhRxIrYnHGbgu3dmgBpgvk2RAg8KXNqYayT5XAfp20CppI9NZ7U/exec";

let currentEmployeeId = "";
let availableRoles = [];
let spunRoles = [];
let spinsLeft = 3;
let currentRotation = 0;
let isSpinning = false;

// ✅ إصلاح 1: showSection تشيل hidden وتضيف active
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
        sec.classList.add('hidden');
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('active');
}

// 1. تسجيل الدخول
async function login() {
    const idInput = document.getElementById('empId').value.trim();
    const errorMsg = document.getElementById('loginError');
    const btn = document.querySelector('#loginSection button');

    if (!idInput) return errorMsg.innerText = "يرجى إدخال الرقم الشخصي!";

    btn.disabled = true;
    btn.innerText = "جاري التحقق... ⏳";
    errorMsg.innerText = "";

    try {
        const formData = new URLSearchParams({ action: "login", empId: idInput });
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.status === "error") {
            errorMsg.innerText = data.message;
        } else {
            currentEmployeeId = idInput;
            availableRoles = (data.availableRoles && data.availableRoles.length > 0)
                ? data.availableRoles
                : ["ضيف شرف"];

            document.getElementById('welcomeMsg').innerText = `أهلاً بك يا ${data.name}!`;
            drawWheel();
            showSection('wheelSection');
        }
    } catch (err) {
        errorMsg.innerText = "خطأ في الاتصال بالسيرفر.";
    } finally {
        btn.disabled = false;
        btn.innerText = "دخول";
    }
}

// 2. رسم العجلة
function drawWheel() {
    const canvas = document.getElementById("wheelCanvas");
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 5;
    const numSlices = availableRoles.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const colors = ["#1c2541", "#3a506b", "#0b132b", "#2c3e50", "#1a252c", "#162032", "#243447"];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSlices; i++) {
        // رسم الشريحة
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, i * sliceAngle, (i + 1) * sliceAngle);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // رسم النص
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * sliceAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#d4af37";

        // ✅ تعديل حجم الخط حسب طول النص
        const fontSize = availableRoles[i].length > 8 ? 11 : 13;
        ctx.font = `bold ${fontSize}px Tajawal`;
        ctx.fillText(availableRoles[i], radius - 10, 5);
        ctx.restore();
    }

    // رسم دائرة مركزية
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#d4af37";
    ctx.fill();
}

// 3. تدوير العجلة
function spinWheel() {
    // ✅ إصلاح: منع التدوير المتكرر أثناء الحركة
    if (spinsLeft <= 0 || isSpinning) return;

    const btn = document.getElementById('spinBtn');
    btn.disabled = true;
    isSpinning = true;

    const randomDegree = Math.floor(Math.random() * 360) + (360 * (Math.floor(Math.random() * 3) + 4));
    currentRotation += randomDegree;

    const canvas = document.getElementById("wheelCanvas");
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        const numSlices = availableRoles.length;
        const sliceDegree = 360 / numSlices;

        // ✅ إصلاح 2: معادلة صحيحة مع % numSlices لتجنب index خارج الحدود
        const actualDegree = ((currentRotation % 360) + 360) % 360;
        let winningIndex = Math.floor(((360 - actualDegree + 270) % 360) / sliceDegree) % numSlices;
        let wonRole = availableRoles[winningIndex];

        // ✅ إصلاح 3: التحقق من التكرار بشكل صحيح
        if (!spunRoles.includes(wonRole)) {
            spunRoles.push(wonRole);
            const li = document.createElement('li');
            li.innerText = wonRole;
            document.getElementById('spunList').appendChild(li);
            document.getElementById('spunOptionsArea').classList.remove('hidden');
        }

        spinsLeft--;
        document.getElementById('spinsLeft').innerText = spinsLeft;
        isSpinning = false;

        // ✅ إصلاح 4: شروط واضحة لإظهار زر المتابعة
        const maxPossibleRoles = Math.min(3, availableRoles.length);
        const canSpinMore = spinsLeft > 0 && spunRoles.length < maxPossibleRoles;

        if (canSpinMore) {
            btn.disabled = false;
        } else {
            btn.style.display = "none";
            document.getElementById('proceedBtn').classList.remove('hidden');
        }
    }, 4000);
}

// 4. عرض شاشة الاختيار النهائي
async function showSelection() {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = "<p>جاري التحقق من الأدوار... ⏳</p>";
    showSection('selectionSection');

    // تحقق من الأدوار المتاحة الآن
    const formData = new URLSearchParams({ action: "login", empId: currentEmployeeId });
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
    const data = await res.json();

    // فلترة الخيارات اللي ما زالت متاحة
    const stillAvailable = spunRoles.filter(role => 
        data.availableRoles.includes(role) || role === "ضيف شرف"
    );

    container.innerHTML = "";

    if (stillAvailable.length === 0) {
        container.innerHTML = "<p class='error'>عذراً، جميع أدوارك اكتملت! يرجى تحديث الصفحة.</p>";
        return;
    }

    stillAvailable.forEach(role => {
        const div = document.createElement('div');
        div.className = "option-card";
        div.innerText = role;
        div.onclick = () => {
            document.querySelectorAll('.option-card').forEach(c => c.onclick = null);
            saveFinalRole(role);
        };
        container.appendChild(div);
    });
}

// 5. حفظ الدور في Google Sheets
async function saveFinalRole(role) {
    showSection('resultSection');
    document.getElementById('finalRoleName').innerText = "جاري الحفظ... ⏳";
    document.getElementById('finalRoleDesc').innerText = "";
    document.querySelector('.coordinator-note').style.display = "none";

    try {
        const formData = new URLSearchParams({ action: "save", empId: currentEmployeeId, chosenRole: role });
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.status === "error") {
            alert(data.message);
            location.reload();
        } else {
            document.getElementById('finalRoleName').innerText = role;
            document.getElementById('finalRoleDesc').innerText = data.roleDesc || "";
            document.querySelector('.coordinator-note').style.display = "block";
        }
    } catch (err) {
        document.getElementById('finalRoleName').innerText = "حدث خطأ في الاتصال!";
        document.getElementById('finalRoleDesc').innerText = "يرجى التواصل مع مسؤول الفعالية.";
    }
}
