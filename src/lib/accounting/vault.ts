import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AccountingError } from './model';
export type Sealed = {
    version: string;
    iv: string;
    tag: string;
    data: string;
};
function key(version: string) {
    const encoded = process.env[`ACCOUNTING_KEY_${version}`];
    const bytes = Buffer.from(encoded || '', 'base64');
    if (!/^[A-Z0-9_]+$/.test(version) || bytes.length !== 32)
        throw new AccountingError('CONFIG', '会計連携の暗号鍵が未設定です。');
    return bytes;
}
export function checkVault() { key(process.env.ACCOUNTING_KEY_VERSION || 'V1'); }
export function seal(value: unknown, tenant: string, credential: string): Sealed {
    const version = process.env.ACCOUNTING_KEY_VERSION || 'V1';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key(version), iv);
    cipher.setAAD(Buffer.from(JSON.stringify(['accounting', tenant, credential])));
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { version, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
export function unseal<T>(value: Sealed, tenant: string, credential: string): T {
    const cipher = createDecipheriv('aes-256-gcm', key(value.version), Buffer.from(value.iv, 'base64'));
    cipher.setAAD(Buffer.from(JSON.stringify(['accounting', tenant, credential])));
    cipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.data, 'base64')), cipher.final()]).toString('utf8')) as T;
}
