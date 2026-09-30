// service ข้างหลังบน free host จะพักเมื่อไม่มีคนใช้ และตื่นเฉพาะเมื่อถูกเรียกจากภายนอก
// Gateway ปลุกเองไม่ได้ จึงให้ browser ของผู้ใช้เรียก service เหล่านั้นโดยตรง
// คำขอจะค้างจนกว่า service จะตื่น (ประมาณหนึ่งนาที) แล้วจึงจบ

const WAKE_TIMEOUT_MS = 120000;

window.wakeBackends = async function wakeBackends() {
  try {
    const response = await fetch('/api/wake-targets');
    const targets = await response.json();
    await Promise.allSettled(
      targets.map((url) =>
        // no-cors: ไม่ต้องอ่านคำตอบ ต้องการแค่ให้คำขอไปถึง service
        fetch(url, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
        }),
      ),
    );
  } catch {
    // ปลุกไม่สำเร็จก็ให้ผู้เรียกลองคำขอจริงต่อ แล้วแสดงข้อผิดพลาดตามผลนั้น
  }
};

window.isBackendAsleep = function isBackendAsleep(status) {
  return status === 502 || status === 503;
};
