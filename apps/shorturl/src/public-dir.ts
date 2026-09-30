import { join } from 'path';

// หน้าเว็บอยู่นอกผลลัพธ์ของการ build จึงอ้างจากโฟลเดอร์หลักของโปรเจกต์
// ทั้ง `nest start` บนเครื่องและ start command บน Render รันจากโฟลเดอร์หลักเหมือนกัน
export const PUBLIC_DIR = join(process.cwd(), 'apps', 'shorturl', 'public');
