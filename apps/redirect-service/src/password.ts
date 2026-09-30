import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

// ตรวจรหัสผ่านกับ hash รูปแบบ scrypt$<salt>$<hash> (base64)
// ที่สร้างโดย apps/link-service/src/password.ts ถ้าแก้ต้องแก้ทั้งสองไฟล์
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltText, hashText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) {
    return false;
  }
  const expected = Buffer.from(hashText, 'base64');
  if (expected.length === 0) {
    return false;
  }
  const actual = await scryptAsync(
    password,
    Buffer.from(saltText, 'base64'),
    expected.length,
  );
  // เทียบแบบใช้เวลาคงที่ ไม่ให้เดารหัสจากเวลาที่ใช้ตอบ
  return timingSafeEqual(actual, expected);
}
