/**
 * Universal Base64 decoder that works in all environments:
 * - Node.js (without Buffer dependency)
 * - Edge Runtime (Vercel, Cloudflare Workers, etc.)
 * - Browser (without atob dependency)
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Decode a base64 string to a regular string
 * @param str - The base64 encoded string
 * @returns The decoded string
 */
export function base64Decode(str: string): string {
  // Handle URL-safe base64 (replace - and _ with + and /)
  let inputStr = str.replaceAll('-', '+').replaceAll('_', '/');

  // Add padding if missing
  while (inputStr.length % 4) {
    inputStr += '=';
  }

  // Pure implementation for all environments (Node.js, Edge Runtime, Browser)
  let output = '';
  let buffer = 0;
  let accumulatedBits = 0;

  for (const element of inputStr) {
    const c = BASE64_CHARS.indexOf(element);
    if (c === -1) continue; // Skip invalid characters

    buffer = (buffer << 6) | c;
    accumulatedBits += 6;

    if (accumulatedBits >= 8) {
      accumulatedBits -= 8;
      output += String.fromCharCode((buffer >> accumulatedBits) & 0xFF);
    }
  }

  return output;
}

/**
 * Encode a string to base64
 * @param str - The string to encode
 * @returns The base64 encoded string
 */
export function base64Encode(str: string): string {
  // Pure implementation for all environments (Node.js, Edge Runtime, Browser)
  let output = '';
  let buffer = 0;
  let accumulatedBits = 0;

  for (let i = 0; i < str.length; i++) {
    buffer = (buffer << 8) | str.charCodeAt(i);
    accumulatedBits += 8;

    while (accumulatedBits >= 6) {
      accumulatedBits -= 6;
      output += BASE64_CHARS[(buffer >> accumulatedBits) & 0x3F];
    }
  }

  // Handle remaining bits
  if (accumulatedBits > 0) {
    buffer = buffer << (6 - accumulatedBits);
    output += BASE64_CHARS[buffer & 0x3F];
  }

  // Add padding
  while (output.length % 4) {
    output += '=';
  }

  return output;
}

/**
 * Decode base64 to Uint8Array (for binary data)
 * @param str - The base64 encoded string
 * @returns Uint8Array containing the decoded bytes
 */
export function base64DecodeToBytes(str: string): Uint8Array {
  const decoded = base64Decode(str);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

/**
 * Encode Uint8Array to base64
 * @param bytes - The bytes to encode
 * @returns The base64 encoded string
 */
export function base64EncodeFromBytes(bytes: Uint8Array): string {
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return base64Encode(str);
}

/**
 * Universal base64 decoder that works in Node.js, Edge Runtime, and browsers
 * without relying on Buffer or atob
 */
export function decodeBase64(str: string): string {
  let inputStr = str;

  // Remove padding if present
  inputStr = inputStr.replace(/=+$/, '');

  // Convert to binary string
  let binaryStr = '';
  for (let i = 0; i < inputStr.length; i += 4) {
    const chunk = inputStr.slice(i, i + 4);
    let binary = '';

    for (const char of chunk) {
      const index = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
        char,
      );
      if (index !== -1) {
        binary += index.toString(2).padStart(6, '0');
      }
    }

    binaryStr += binary;
  }

  // Convert binary to string
  let result = '';
  for (let i = 0; i < binaryStr.length; i += 8) {
    const byte = binaryStr.slice(i, i + 8);
    if (byte.length === 8) {
      result += String.fromCharCode(parseInt(byte, 2));
    }
  }

  return result;
}
