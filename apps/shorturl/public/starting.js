// หน้านี้แสดงเมื่อเปิดลิงก์สั้นขณะที่ service ข้างหลังพักอยู่
// ปลุก service จาก browser แล้วโหลดลิงก์เดิมซ้ำ นับจำนวนครั้งไว้ใน hash ของ URL เพื่อไม่ให้วนไม่จบ

(async () => {
  const MAX_ATTEMPTS = 3;
  const status = document.getElementById('status');
  const spinner = document.getElementById('spinner');
  const retry = document.getElementById('retry');

  const match = /^#retry(\d+)$/.exec(location.hash);
  const attempts = match ? Number(match[1]) : 0;

  retry.addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    location.reload();
  });

  if (attempts >= MAX_ATTEMPTS) {
    document.getElementById('title').textContent = 'ระบบยังไม่พร้อม';
    status.textContent = 'เปิดลิงก์นี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้งในอีกสักครู่';
    spinner.hidden = true;
    retry.hidden = false;
    return;
  }

  history.replaceState(null, '', `${location.pathname}#retry${attempts + 1}`);
  await window.wakeBackends();
  location.reload();
})();
