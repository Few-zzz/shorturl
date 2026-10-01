// ข้อมูลจาก server ทุกค่าแสดงผ่าน textContent เท่านั้น ห้ามใช้ innerHTML เพื่อป้องกัน XSS

const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const aliasInput = document.getElementById('alias');
const submitButton = document.getElementById('submit');
const errorBox = document.getElementById('error');
const result = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const copyButton = document.getElementById('copy');
const rows = document.getElementById('rows');
const useExpiry = document.getElementById('use-expiry');
const usePassword = document.getElementById('use-password');
const expiryField = document.getElementById('expiry-field');
const passwordField = document.getElementById('password-field');
const expiryInput = document.getElementById('expiry');
const passwordInput = document.getElementById('password');
const COLUMNS = 5;

document.getElementById('alias-prefix').textContent = `${location.host}/`;

// ค่าเวลาในรูปแบบที่ช่อง datetime-local ใช้ (เวลาท้องถิ่นของผู้ใช้)
function localDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// แสดงช่องกรอกของตัวเลือกเสริมเฉพาะเมื่อติ๊กเลือก และล้างค่าเมื่อเลิกเลือก
function syncOptions() {
  expiryField.hidden = !useExpiry.checked;
  passwordField.hidden = !usePassword.checked;
  if (useExpiry.checked) {
    expiryInput.min = localDateTime(new Date());
  } else {
    expiryInput.value = '';
  }
  if (!usePassword.checked) {
    passwordInput.value = '';
  }
}

useExpiry.addEventListener('change', () => {
  syncOptions();
  if (useExpiry.checked) {
    expiryInput.focus();
  }
});
usePassword.addEventListener('change', () => {
  syncOptions();
  if (usePassword.checked) {
    passwordInput.focus();
  }
});
syncOptions();

function shortUrl(code) {
  return `${location.origin}/${code}`;
}

function cell(text, className) {
  const td = document.createElement('td');
  if (className) {
    td.className = className;
  }
  td.textContent = text;
  return td;
}

function showError(text) {
  errorBox.textContent = text;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
}

function errorText(data) {
  if (data && data.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function showResult(code) {
  const url = shortUrl(code);
  resultLink.href = url;
  resultLink.textContent = url.replace(/^https?:\/\//, '');
  // รูป QR และปุ่มดาวน์โหลดจัดการใน qr-custom.js ตามการปรับแต่งที่เลือกไว้
  window.qrCustom.setCode(code);
  copyButton.textContent = 'คัดลอก';
  result.hidden = false;
}

function showEmpty(text) {
  rows.textContent = '';
  const tr = document.createElement('tr');
  const td = cell(text, 'empty');
  td.colSpan = COLUMNS;
  tr.appendChild(td);
  rows.appendChild(tr);
}

function tag(text, className) {
  const span = document.createElement('span');
  span.className = className ? `tag ${className}` : 'tag';
  span.textContent = text;
  return span;
}

// ป้ายบอกตัวเลือกเสริมของลิงก์: รหัสผ่านและวันหมดอายุ
function linkTags(link) {
  const items = [];
  if (link.hasPassword) {
    items.push(tag('รหัสผ่าน'));
  }
  if (link.expiresAt) {
    const expires = new Date(link.expiresAt);
    if (expires.getTime() <= Date.now()) {
      items.push(tag('หมดอายุแล้ว', 'expired'));
    } else {
      const text = expires.toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      items.push(tag(`หมดอายุ ${text}`));
    }
  }
  if (items.length === 0) {
    return null;
  }
  const box = document.createElement('div');
  box.className = 'tags';
  items.forEach((item) => box.appendChild(item));
  return box;
}

function linkRow(link) {
  const tr = document.createElement('tr');

  const code = document.createElement('td');
  code.className = 'code';
  const anchor = document.createElement('a');
  anchor.href = shortUrl(link.code);
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = `/${link.code}`;
  code.appendChild(anchor);
  const tags = linkTags(link);
  if (tags) {
    code.appendChild(tags);
  }
  tr.appendChild(code);

  // server ไม่ส่ง URL ต้นทางของลิงก์ที่ตั้งรหัสผ่านมาให้
  const original = cell(link.originalUrl ?? 'ซ่อนไว้', 'url');
  if (link.originalUrl) {
    original.title = link.originalUrl;
  }
  tr.appendChild(original);

  const clicks = cell(link.clicks === null ? '–' : String(link.clicks), 'num');
  if (link.clicks === null) {
    clicks.title = 'ระบบสถิติไม่พร้อมใช้งานชั่วคราว';
  }
  tr.appendChild(clicks);

  const created = new Date(link.createdAt).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  tr.appendChild(cell(created, 'date'));

  const qr = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost';
  button.textContent = 'QR';
  button.setAttribute('aria-label', `แสดง QR Code ของ ${link.code}`);
  button.addEventListener('click', () => {
    showResult(link.code);
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  qr.appendChild(button);
  tr.appendChild(qr);

  return tr;
}

const WAKING_TEXT = 'กำลังเริ่มระบบ อาจใช้เวลาประมาณ 1 นาที…';
const MAX_WAKE_RETRIES = 2;

async function loadLinks(attempt = 0) {
  try {
    const response = await fetch('/api/links');
    const data = await response.json();
    if (window.isBackendAsleep(response.status) && attempt < MAX_WAKE_RETRIES) {
      showEmpty(WAKING_TEXT);
      await window.wakeBackends();
      return loadLinks(attempt + 1);
    }
    if (!response.ok) {
      showEmpty(errorText(data));
      return;
    }
    if (data.length === 0) {
      showEmpty('ยังไม่มีลิงก์');
      return;
    }
    rows.textContent = '';
    data.forEach((link) => rows.appendChild(linkRow(link)));
  } catch {
    showEmpty('โหลดรายการไม่สำเร็จ');
  }
}

function createLink(payload) {
  return fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const url = urlInput.value.trim();
  if (!url) {
    showError('กรุณาใส่ URL ที่ต้องการย่อ');
    urlInput.focus();
    return;
  }

  const payload = { url };
  const alias = aliasInput.value.trim();
  if (alias) {
    payload.alias = alias;
  }

  if (useExpiry.checked) {
    const expires = new Date(expiryInput.value);
    if (!expiryInput.value || Number.isNaN(expires.getTime())) {
      showError('กรุณาเลือกวันและเวลาหมดอายุ');
      expiryInput.focus();
      return;
    }
    if (expires.getTime() <= Date.now()) {
      showError('วันหมดอายุต้องเป็นเวลาในอนาคต');
      expiryInput.focus();
      return;
    }
    // แปลงจากเวลาท้องถิ่นของผู้ใช้เป็นเวลามาตรฐาน (UTC) ก่อนส่ง
    payload.expiresAt = expires.toISOString();
  }

  if (usePassword.checked) {
    if (passwordInput.value.length < 4) {
      showError('รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร');
      passwordInput.focus();
      return;
    }
    payload.password = passwordInput.value;
  }

  submitButton.disabled = true;
  try {
    let response = await createLink(payload);
    if (window.isBackendAsleep(response.status)) {
      showError(WAKING_TEXT);
      await window.wakeBackends();
      response = await createLink(payload);
      clearError();
    }
    const data = await response.json();
    if (response.ok) {
      showResult(data.code);
      form.reset();
      syncOptions();
      loadLinks();
    } else {
      showError(errorText(data));
    }
  } catch {
    showError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');
  }
  submitButton.disabled = false;
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultLink.href);
    copyButton.textContent = 'คัดลอกแล้ว';
  } catch {
    copyButton.textContent = 'คัดลอกไม่ได้';
  }
});

document.getElementById('refresh').addEventListener('click', () => loadLinks());

// ปลุก service ข้างหลังทุกครั้งที่เปิดหน้า เพื่อให้พร้อมก่อนผู้ใช้ย่อหรือเปิดลิงก์
window.wakeBackends();
loadLinks();
