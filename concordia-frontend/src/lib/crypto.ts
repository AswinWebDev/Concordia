/**
 * E2EE Crypto Utility for Concordia
 * 
 * Uses the Web Crypto API (AES-GCM) for symmetric encryption.
 * - generateRoomKey(): Creates a new 256-bit AES key, returns as base64url string.
 * - encryptData(plaintext, keyB64): Encrypts plaintext → base64 ciphertext (iv prepended).
 * - decryptData(ciphertext, keyB64): Decrypts base64 ciphertext → plaintext.
 * 
 * The key is shared via URL fragment (#key=...) and stored in localStorage.
 * It NEVER touches our servers, ensuring true End-to-End Encryption.
 */

// Generate a random 256-bit AES-GCM key and return as base64url string
export async function generateRoomKey(): Promise<string> {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return uint8ArrayToBase64Url(key);
}

// Encrypt plaintext with AES-256-GCM. Returns base64-encoded (IV + ciphertext).
export async function encryptData(plaintext: string, keyBase64Url: string): Promise<string> {
  const keyBytes = base64UrlToUint8Array(keyBase64Url);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );

  // Prepend IV to ciphertext so we can extract it during decryption
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return uint8ArrayToBase64(combined);
}

// Decrypt base64-encoded (IV + ciphertext) back to plaintext.
export async function decryptData(encryptedBase64: string, keyBase64Url: string): Promise<string> {
  const combined = base64ToUint8Array(encryptedBase64);
  const keyBytes = base64UrlToUint8Array(keyBase64Url);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt']
  );

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// --- localStorage key management ---

export function saveRoomKey(roomId: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`concordia_key_${roomId}`, key);
  }
}

export function getRoomKey(roomId: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`concordia_key_${roomId}`);
  }
  return null;
}

// Derive a deterministic AES-256 key from an Ethereum address.
// Uses SHA-256(address + salt) to produce exactly 32 bytes.
// Both the frontend and the agent can independently derive the same key.
export async function deriveKeyFromAddress(ethAddress: string): Promise<string> {
  const data = new TextEncoder().encode(`concordia-e2ee-${ethAddress.toLowerCase()}-agent-key`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return uint8ArrayToBase64Url(new Uint8Array(hashBuffer));
}

// Extract key from URL hash fragment: #key=<base64url>
export function extractKeyFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const match = hash.match(/key=([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// --- Encoding utilities ---

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
