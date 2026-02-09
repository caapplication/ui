const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';

let cachedPublicKey = null;

/**
 * Fetch the server's public key
 */
async function fetchPublicKey() {
    if (cachedPublicKey) return cachedPublicKey;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/public-key`);
        const data = await response.json();
        cachedPublicKey = data.public_key;
        return cachedPublicKey;
    } catch (error) {
        console.error('Failed to fetch public key:', error);
        return null;
    }
}

/**
 * Convert PEM public key to a CryptoKey object
 */
async function importPublicKey(pem) {
    // Remove header and footer from PEM
    const pemContents = pem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '');

    // Decode Base64 to binary
    const binaryDerString = window.atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return window.crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256',
        },
        true,
        ['encrypt']
    );
}

/**
 * Encrypt data using RSA-OAEP
 * @param {string} data - The plain text to encrypt
 */
export async function encryptData(data) {
    if (!data) return data;

    try {
        const pem = await fetchPublicKey();
        if (!pem) return data;

        const publicKey = await importPublicKey(pem);
        const encodedData = new TextEncoder().encode(data);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP',
            },
            publicKey,
            encodedData
        );

        // Convert encrypted buffer to Base64 string
        const encryptedBytes = new Uint8Array(encryptedBuffer);
        let binary = '';
        encryptedBytes.forEach(byte => binary += String.fromCharCode(byte));
        return window.btoa(binary);
    } catch (error) {
        console.error('Encryption failed:', error);
        return data; // Fallback to plain text on error
    }
}
