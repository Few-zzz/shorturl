// หน้านี้แสดงเมื่อเปิดลิงก์สั้นที่ตั้งรหัสผ่านไว้
// ส่งรหัสไปให้ server ตรวจ ถ้าถูก server จึงคืน URL ต้นทางมาให้ แล้วพาผู้ใช้ไปที่นั่น

const form = document.getElementById('form');
const passwordInput = document.getElementById('password');
const submitButton = document.getElementById('submit');
const errorBox = document.getElementById('error');
const code = location.pathname.slice(1);

function showError(text) {
  errorBox.textContent = text;
  errorBox.hidden = false;
}

function unlock(password) {
  return fetch(`/api/unlock/${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const password = passwordInput.value;
  if (!password) {
    showError('กรุณากรอกรหัสผ่าน');
    passwordInput.focus();
    return;
  }

  submitButton.disabled = true;
  try {
    let response = await unlock(password);
    if (window.isBackendAsleep(response.status)) {
      showError('กำลังเริ่มระบบ อาจใช้เวลาประมาณ 1 นาที…');
      await window.wakeBackends();
      response = await unlock(password);
    }
    const data = await response.json();

    // ไปต่อเฉพาะ URL แบบ http/https เท่านั้น
    if (response.ok && data && /^https?:\/\//i.test(data.url)) {
      location.replace(data.url);
      return;
    }
    if (response.status === 403) {
      showError('รหัสผ่านไม่ถูกต้อง');
      passwordInput.select();
    } else if (response.status === 410) {
      showError('ลิงก์นี้หมดอายุแล้ว');
    } else if (response.status === 404) {
      showError('ไม่พบลิงก์นี้');
    } else {
      showError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  } catch {
    showError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');
  }
  submitButton.disabled = false;
});
