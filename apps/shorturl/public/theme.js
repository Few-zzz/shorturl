// ธีมมืดและสว่าง: ถ้าผู้ใช้ยังไม่เคยเลือก จะใช้ตามการตั้งค่าของอุปกรณ์
// ถ้าเลือกแล้ว จะจำไว้ใน localStorage ของ browser เครื่องนั้น (ไม่ได้ส่งไปที่ server)

(() => {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;

  // browser บางโหมดปิดการใช้ localStorage หน้าเว็บต้องยังทำงานได้
  function readSaved() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // จำไม่ได้ก็ไม่เป็นไร ธีมยังเปลี่ยนในหน้านี้
    }
  }

  function currentTheme() {
    return (
      root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  }

  const saved = readSaved();
  if (saved) {
    root.dataset.theme = saved;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');

    function updateLabel() {
      const label =
        currentTheme() === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด';
      button.setAttribute('aria-label', label);
      button.title = label;
    }

    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      save(next);
      updateLabel();
    });

    updateLabel();
  });
})();
