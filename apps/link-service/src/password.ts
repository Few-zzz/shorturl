import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

// เก็บรหัสผ่านเป็น hash เท่านั้น รูปแบบ: scrypt$<salt>$<hash> (base64)
// apps/redirect-service/src/password.ts ตรวจรหัสด้วยรูปแบบเดียวกัน ถ้าแก้ต้องแก้ทั้งสองไฟล์
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
