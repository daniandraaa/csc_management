/**
 * Password hashing utility using Web Crypto API (SHA-256)
 * For production use, swap this with bcrypt on a server endpoint.
 */

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = 'csc-management-salt-2026' // static salt for demo
    const data = encoder.encode(password + salt)
    
    // Ensure crypto and crypto.subtle are available (requires secure context like HTTPS or localhost)
    const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null
    
    if (!cryptoObj || !cryptoObj.subtle) {
        console.error('Web Crypto API is not available. Please ensure you are using a secure context (HTTPS or localhost).')
        // Throw a clear error instead of letting it crash on 'undefined'
        throw new Error('Fitur keamanan tidak tersedia di browser ini atau koneksi tidak aman (harus HTTPS/localhost).')
    }

    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password)
    return computed === hash
}
