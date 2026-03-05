/**
 * Password hashing utility using Web Crypto API (SHA-256)
 * For production use, swap this with bcrypt on a server endpoint.
 */

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = 'csc-management-salt-2026' // static salt for demo
    const data = encoder.encode(password + salt)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password)
    return computed === hash
}
