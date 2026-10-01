// ปรับแต่ง QR Code: รูปร่างจุด สี และกรอบ
// server วาด SVG ตามค่าที่ส่งไปทาง URL ส่วน PNG สร้างใน browser จาก SVG นั้น

(() => {
  const DEFAULTS = { shape: 'square', fg: '#000000', bg: '#ffffff' };
  const MIN_CONTRAST = 4;
  const PNG_SCALE = 3;

  const image = document.getElementById('qr-image');
  const pngButton = document.getElementById('qr-download');
  const svgLink = document.getElementById('qr-download-svg');
  const fgInput = document.getElementById('qr-fg');
  const bgInput = document.getElementById('qr-bg');
  const frameInput = document.getElementById('qr-frame');
  const labelField = document.getElementById('qr-label-field');
  const labelInput = document.getElementById('qr-label');
  const warning = document.getElementById('qr-warning');
  const shapeInputs = document.querySelectorAll('input[name="qr-shape"]');

  let code = null;
  let timer = null;

  function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // กฎเดียวกับ isScannable ใน apps/shorturl/src/qr-style.ts
  function isScannable(fg, bg) {
    const dark = luminance(fg);
    const light = luminance(bg);
    return light > dark && (light + 0.05) / (dark + 0.05) >= MIN_CONTRAST;
  }

  function selectedShape() {
    const checked = document.querySelector('input[name="qr-shape"]:checked');
    return checked ? checked.value : DEFAULTS.shape;
  }

  // ใส่เฉพาะค่าที่ต่างจากค่าเริ่มต้น เพื่อให้ URL ของรูปสั้นที่สุด
  function qrPath() {
    const params = new URLSearchParams();
    if (selectedShape() !== DEFAULTS.shape) {
      params.set('shape', selectedShape());
    }
    if (fgInput.value.toLowerCase() !== DEFAULTS.fg) {
      params.set('fg', fgInput.value.slice(1));
    }
    if (bgInput.value.toLowerCase() !== DEFAULTS.bg) {
      params.set('bg', bgInput.value.slice(1));
    }
    if (frameInput.checked) {
      params.set('frame', '1');
      if (labelInput.value.trim()) {
        params.set('label', labelInput.value.trim());
      }
    }
    const query = params.toString();
    return `/api/qr/${encodeURIComponent(code)}${query ? `?${query}` : ''}`;
  }

  function setDownloadsEnabled(enabled) {
    pngButton.disabled = !enabled;
    svgLink.toggleAttribute('aria-disabled', !enabled);
    svgLink.classList.toggle('disabled', !enabled);
  }

  function update() {
    if (!code) {
      return;
    }
    labelField.hidden = !frameInput.checked;
    if (!isScannable(fgInput.value, bgInput.value)) {
      warning.textContent = 'สีจุดต้องเข้มกว่าสีพื้นหลังมากพอ ไม่อย่างนั้นกล้องจะสแกนไม่ได้';
      warning.hidden = false;
      setDownloadsEnabled(false);
      return;
    }
    warning.hidden = true;
    setDownloadsEnabled(true);
    const path = qrPath();
    image.src = path;
    svgLink.href = path;
    svgLink.download = `qr-${code}.svg`;
  }

  // รอให้ผู้ใช้หยุดลากสีหรือพิมพ์ก่อน ไม่ให้ขอรูปใหม่ทุกครั้งที่ค่าเปลี่ยนเล็กน้อย
  function updateSoon() {
    clearTimeout(timer);
    timer = setTimeout(update, 250);
  }

  async function downloadPng() {
    try {
      const source = new Image();
      source.src = image.src;
      await source.decode();
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth * PNG_SCALE;
      canvas.height = source.naturalHeight * PNG_SCALE;
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-${code}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      warning.textContent = 'สร้างไฟล์ PNG ไม่สำเร็จ กรุณาลองใหม่';
      warning.hidden = false;
    }
  }

  function reset() {
    shapeInputs.forEach((input) => {
      input.checked = input.value === DEFAULTS.shape;
    });
    fgInput.value = DEFAULTS.fg;
    bgInput.value = DEFAULTS.bg;
    frameInput.checked = false;
    labelInput.value = '';
    update();
  }

  shapeInputs.forEach((input) => input.addEventListener('change', update));
  fgInput.addEventListener('input', updateSoon);
  bgInput.addEventListener('input', updateSoon);
  frameInput.addEventListener('change', update);
  labelInput.addEventListener('input', updateSoon);
  pngButton.addEventListener('click', downloadPng);
  svgLink.addEventListener('click', (event) => {
    if (svgLink.classList.contains('disabled')) {
      event.preventDefault();
    }
  });
  document.getElementById('qr-reset').addEventListener('click', reset);

  window.qrCustom = {
    setCode(value) {
      code = value;
      update();
    },
  };
})();
