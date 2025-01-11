import { AES, enc } from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export const encryptData = (text: string): string => {
  try {
    const encrypted = AES.encrypt(text, ENCRYPTION_KEY);
    return encrypted.toString()
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptData = (encryptedText: string): string => {
  try {
    const normalizedText = encryptedText
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedText = normalizedText.padEnd(
      normalizedText.length + (4 - (normalizedText.length % 4)) % 4,
      '='
    );
    const decrypted = AES.decrypt(paddedText, ENCRYPTION_KEY);
    return decrypted.toString(enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};