const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz20JxZO0UPJRUmdhRxIrYnHGbgu3dmgBpgvk2RAg8KXNqYayT5XAfp20CppI9NZ7U/exec"; // الصق الرابط الجديد هنا
let currentEmployeeId = "";
let availableRoles = [];
let spunRoles = [];
let spinsLeft = 3;
let currentRotation = 0;

// دوال التنقل بين الشاشات
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(id).classList.add('active');
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
            availableRoles = data.availableRoles.length > 0 ? data.availableRoles : ["ضيف شرف"];
            
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

// 2. رسم العجلة (Canvas)
function drawWheel() {
    const canvas = document.getElementById("wheelCanvas");
    const ctx = canvas.getContext("2d");
    const numSlices = availableRoles.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const colors = ["#1c2541", "#3a506b", "#0b132b", "#2c3e50", "#1a252c"];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < numSlices; i++) {
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.arc(150, 150, 150, i * sliceAngle, (i + 1) * sliceAngle);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.stroke();
        
        // رسم النص
        ctx.save();
        ctx.translate(150, 150);
        ctx.rotate(i * sliceAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#d4af37";
        ctx.font = "bold 14px Tajawal";
        ctx.fillText(availableRoles[i], 130, 5);
        ctx.restore();
    }
}

// 3. تدوير العجلة
function spinWheel() {
    if (spinsLeft <= 0) return;
    
    const btn = document.getElementById('spinBtn');
    btn.disabled = true;
    
    // تدوير عشوائي إضافي (بين 3 و 5 دورات كاملة)
    const randomDegree = Math.floor(Math.random() * 360) + (360 * 4); 
    currentRotation += randomDegree;
    
    const canvas = document.getElementById("wheelCanvas");
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    // حساب النتيجة بعد انتهاء الحركة (4 ثواني)
    setTimeout(() => {
        // حساب الزاوية الفعلية
        const actualDegree = currentRotation % 360;
        // المؤشر في الأعلى (زاوية 270 أو -90)، نحتاج لمطابقة الزاوية مع الشريحة
        const numSlices = availableRoles.length;
        const sliceDegree = 360 / numSlices;
        
        // معادلة تحديد الشريحة الرابحة بناءً على الدوران والمؤشر
        let winningIndex = Math.floor((360 - actualDegree + 270) % 360 / sliceDegree);
        let wonRole = availableRoles[winningIndex];

        // تسجيل النتيجة إذا لم تكن مكررة
        if (!spunRoles.includes(wonRole)) {
            spunRoles.push(wonRole);
            const li = document.createElement('li');
            li.innerText = wonRole;
            document.getElementById('spunList').appendChild(li);
            document.getElementById('spunOptionsArea').classList.remove('hidden');
        }

        spinsLeft--;
        document.getElementById('spinsLeft').innerText = spinsLeft;

        if (spinsLeft > 0 && spunRoles.length < Math.min(3, availableRoles.length)) {
            btn.disabled = false;
        } else {
            btn.style.display = "none";
            document.getElementById('proceedBtn').classList.remove('hidden');
        }
    }, 4000);
}

// 4. عرض شاشة الاختيار النهائي
function showSelection() {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = "";
    
    spunRoles.forEach(role => {
        const div = document.createElement('div');
        div.className = "option-card";
        div.innerText = role;
        div.onclick = () => saveFinalRole(role);
        container.appendChild(div);
    });
    
    showSection('selectionSection');
}

// 5. حفظ الدور في Google Sheets
async function saveFinalRole(role) {
    showSection('resultSection'); // إظهار الشاشة فوراً لتجنب الملل
    document.getElementById('finalRoleName').innerText = "جاري الحفظ... ⏳";
    document.getElementById('finalRoleDesc').innerText = "";
    document.querySelector('.coordinator-note').style.display = "none";

    try {
        const formData = new URLSearchParams({ action: "save", empId: currentEmployeeId, chosenRole: role });
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.status === "error") {
            alert(data.message); // في حال اكتمل العدد أثناء التفكير
            location.reload(); 
        } else {
            document.getElementById('finalRoleName').innerText = role;
            document.getElementById('finalRoleDesc').innerText = data.roleDesc;
            document.querySelector('.coordinator-note').style.display = "block";
        }
    } catch (err) {
        document.getElementById('finalRoleName').innerText = "حدث خطأ!";
    }
}
