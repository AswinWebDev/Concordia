/**
 * E2EE Crypto Utility for Concordia Agent (Node.js)
 * 
 * Uses Node.js built-in crypto module for AES-256-GCM symmetric encryption/decryption.
 * Mirrors the browser Web Crypto API implementation in the frontend.
 */

import * as crypto from 'crypto';

// Decrypt base64-encoded (IV + ciphertext) back to plaintext using base64url key
export function decryptData(encryptedBase64: string, keyBase64Url: string): string {
  const combined = Buffer.from(encryptedBase64, 'base64');
  const keyBytes = base64UrlToBuffer(keyBase64Url);

  const iv = combined.subarray(0, 12);       // 96-bit IV
  const ciphertext = combined.subarray(12, combined.length - 16); // ciphertext without auth tag
  const authTag = combined.subarray(combined.length - 16);        // 128-bit auth tag

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf-8');
}

// Encrypt plaintext with AES-256-GCM. Returns base64-encoded (IV + ciphertext + authTag).
export function encryptData(plaintext: string, keyBase64Url: string): string {
  const keyBytes = base64UrlToBuffer(keyBase64Url);
  const iv = crypto.randomBytes(12); // 96-bit IV

  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);
  let encrypted = cipher.update(plaintext, 'utf-8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: IV (12) + ciphertext + authTag (16) — matches Web Crypto API output
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}

// --- Encoding utilities ---

function base64UrlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function bufferToBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Derive a deterministic AES-256 key from an Ethereum address.
// Must produce the exact same output as the frontend version.
export function deriveKeyFromAddress(ethAddress: string): string {
  const data = `concordia-e2ee-${ethAddress.toLowerCase()}-agent-key`;
  const hashBuffer = crypto.createHash('sha256').update(data).digest();
  return bufferToBase64Url(hashBuffer);
}
