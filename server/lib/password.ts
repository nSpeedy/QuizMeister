import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${(await scryptAsync(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    const expected = Buffer.from(hash, 'hex');
    const actual = await scryptAsync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}
