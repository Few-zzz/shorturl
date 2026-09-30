import { createHash } from 'crypto';

// หน้าเว็บของ Gateway เก็บเป็นข้อความเพื่อให้ถูก bundle ไปกับโค้ด ไม่ต้องคัดลอกไฟล์ตอน build
// สคริปต์ในหน้านี้ห้ามใช้ backtick เพราะทั้งหมดอยู่ใน template literal
// และห้ามใช้ attribute style="..." หรือ onclick="..." เพราะ CSP ด้านล่างจะบล็อก
export const PAGE_HTML = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Short URL</title>
<style>
  :root {
    --bg: #f6f7f9; --card: #ffffff; --text: #1c2430; --muted: #667085;
    --line: #e3e6ec; --accent: #2f6fed; --accent-text: #ffffff;
    --ok-bg: #e9f7ef; --ok-text: #17663a; --err-bg: #fdecec; --err-text: #a12626;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #12161c; --card: #1b212a; --text: #e8ecf2; --muted: #98a2b3;
      --line: #2c3440; --accent: #5b8ff5; --accent-text: #0e1116;
      --ok-bg: #173324; --ok-text: #8fdcab; --err-bg: #3a1c1c; --err-text: #f2a3a3;
    }
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body {
    margin: 0; padding: 32px 16px; background: var(--bg); color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif;
    line-height: 1.5;
  }
  main { max-width: 860px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 28px; }
  h2 { margin: 0; font-size: 18px; }
  p.lead { margin: 0 0 24px; color: var(--muted); }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 20px; margin-bottom: 20px;
  }
  label { display: block; font-size: 14px; color: var(--muted); margin-bottom: 4px; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
  .grow { flex: 1 1 280px; }
  .alias { flex: 0 1 180px; }
  input {
    width: 100%; padding: 10px 12px; font: inherit; color: var(--text);
    background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
  }
  input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  button, a.button {
    display: inline-block; padding: 10px 18px; font: inherit; font-weight: 600; cursor: pointer;
    color: var(--accent-text); background: var(--accent); border: 0; border-radius: 8px;
    text-decoration: none;
  }
  button.plain {
    color: var(--text); background: transparent; border: 1px solid var(--line);
    font-weight: 400; padding: 6px 12px;
  }
  button:disabled { opacity: .6; cursor: default; }
  .message { margin-top: 16px; padding: 12px 14px; border-radius: 8px; display: none; word-break: break-all; }
  .message.ok { display: block; background: var(--ok-bg); color: var(--ok-text); }
  .message.err { display: block; background: var(--err-bg); color: var(--err-text); }
  .message a { color: inherit; font-weight: 600; }
  .qr {
    margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line);
    display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
  }
  .qr img { width: 180px; height: 180px; border-radius: 8px; background: #ffffff; }
  .qr p { margin: 0 0 12px; word-break: break-all; }
  .qr .hint { color: var(--muted); font-size: 14px; }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; white-space: nowrap; }
  td.url { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td a { color: var(--accent); text-decoration: none; }
  td a:hover { text-decoration: underline; }
  .empty { color: var(--muted); text-align: center; padding: 24px 8px; }
</style>
</head>
<body>
<main>
  <h1>Short URL</h1>
  <p class="lead">ย่อลิงก์ยาวให้สั้น สร้าง QR Code และดูจำนวนคลิกของแต่ละลิงก์</p>

  <section class="card">
    <form id="form">
      <div class="row">
        <div class="grow">
          <label for="url">URL ที่ต้องการย่อ</label>
          <input id="url" type="url" placeholder="https://example.com/some/long/path" maxlength="2048" required>
        </div>
        <div class="alias">
          <label for="alias">ชื่อที่กำหนดเอง (ไม่บังคับ)</label>
          <input id="alias" type="text" placeholder="3-10 ตัวอักษร" maxlength="10">
        </div>
        <button id="submit" type="submit">ย่อลิงก์</button>
      </div>
    </form>
    <div id="message" class="message"></div>
    <div id="qr" class="qr" hidden>
      <img id="qr-image" alt="QR Code ของลิงก์สั้น">
      <div>
        <p class="hint">QR Code ของ</p>
        <p id="qr-caption"></p>
        <a id="qr-download" class="button">ดาวน์โหลด PNG</a>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="head">
      <h2>ลิงก์ล่าสุด</h2>
      <button id="refresh" class="plain" type="button">รีเฟรช</button>
    </div>
    <div class="scroll">
      <table>
        <thead>
          <tr><th>ลิงก์สั้น</th><th>URL ต้นทาง</th><th class="num">คลิก</th><th>สร้างเมื่อ</th><th>QR</th></tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </section>
</main>

<script>
  var form = document.getElementById('form');
  var urlInput = document.getElementById('url');
  var aliasInput = document.getElementById('alias');
  var submitButton = document.getElementById('submit');
  var message = document.getElementById('message');
  var rows = document.getElementById('rows');
  var qrBox = document.getElementById('qr');
  var qrImage = document.getElementById('qr-image');
  var qrCaption = document.getElementById('qr-caption');
  var qrDownload = document.getElementById('qr-download');
  var COLUMNS = 5;

  function shortUrl(code) {
    return location.origin + '/' + code;
  }

  function cell(text, className) {
    var td = document.createElement('td');
    if (className) { td.className = className; }
    td.textContent = text;
    return td;
  }

  function linkCell(href, text) {
    var td = document.createElement('td');
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    td.appendChild(a);
    return td;
  }

  function showQr(code) {
    var path = '/api/qr/' + encodeURIComponent(code);
    qrImage.src = path;
    qrCaption.textContent = shortUrl(code);
    qrDownload.href = path + '?format=png';
    qrBox.hidden = false;
  }

  function qrCell(code) {
    var td = document.createElement('td');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'plain';
    button.textContent = 'QR';
    button.addEventListener('click', function () {
      showQr(code);
      qrBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    td.appendChild(button);
    return td;
  }

  function showMessage(kind, text, href) {
    message.className = 'message ' + kind;
    message.textContent = text;
    if (href) {
      var a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = href;
      message.appendChild(a);
    }
  }

  function errorText(data) {
    if (data && data.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  }

  function showEmpty(text) {
    rows.textContent = '';
    var tr = document.createElement('tr');
    var td = cell(text, 'empty');
    td.colSpan = COLUMNS;
    tr.appendChild(td);
    rows.appendChild(tr);
  }

  async function loadLinks() {
    try {
      var response = await fetch('/api/links');
      var data = await response.json();
      if (!response.ok) { showEmpty(errorText(data)); return; }
      if (data.length === 0) { showEmpty('ยังไม่มีลิงก์'); return; }
      rows.textContent = '';
      data.forEach(function (link) {
        var tr = document.createElement('tr');
        tr.appendChild(linkCell(shortUrl(link.code), '/' + link.code));
        var original = cell(link.originalUrl, 'url');
        original.title = link.originalUrl;
        tr.appendChild(original);
        var clicks = cell(link.clicks === null ? '–' : String(link.clicks), 'num');
        if (link.clicks === null) { clicks.title = 'ระบบสถิติไม่พร้อมใช้งานชั่วคราว'; }
        tr.appendChild(clicks);
        tr.appendChild(cell(new Date(link.createdAt).toLocaleString('th-TH')));
        tr.appendChild(qrCell(link.code));
        rows.appendChild(tr);
      });
    } catch (e) {
      showEmpty('โหลดรายการไม่สำเร็จ');
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    submitButton.disabled = true;
    var payload = { url: urlInput.value.trim() };
    var alias = aliasInput.value.trim();
    if (alias) { payload.alias = alias; }
    try {
      var response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await response.json();
      if (response.ok) {
        showMessage('ok', 'ลิงก์สั้นของคุณ: ', shortUrl(data.code));
        showQr(data.code);
        form.reset();
        loadLinks();
      } else {
        showMessage('err', errorText(data));
      }
    } catch (e) {
      showMessage('err', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    submitButton.disabled = false;
  });

  document.getElementById('refresh').addEventListener('click', loadLinks);
  loadLinks();
</script>
</body>
</html>
`;

// อนุญาตเฉพาะ <style> และ <script> ที่อยู่ในหน้านี้ โดยอ้างด้วยค่า hash ของเนื้อหา
// สคริปต์อื่นที่ถูกแทรกเข้ามา (XSS) จะไม่ตรง hash และถูก browser บล็อก
function inlineHash(tag: 'style' | 'script'): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(PAGE_HTML);
  const digest = createHash('sha256')
    .update(match?.[1] ?? '', 'utf8')
    .digest('base64');
  return `'sha256-${digest}'`;
}

export const PAGE_CSP = [
  "default-src 'none'",
  `script-src ${inlineHash('script')}`,
  `style-src ${inlineHash('style')}`,
  "img-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
