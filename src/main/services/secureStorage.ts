import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storageService } from './storageService';

export class SecureStorageService {
  private vaultPath: string;
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    const dataDir = storageService.getFolder('Data');
    this.vaultPath = path.join(dataDir, '.secure_vault.json');
    this.loadVault();
  }

  private loadVault(): void {
    if (fs.existsSync(this.vaultPath)) {
      try {
        const raw = fs.readFileSync(this.vaultPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [key, encHex] of Object.entries(parsed)) {
          if (typeof encHex === 'string') {
            const decrypted = this.decryptValue(encHex);
            if (decrypted) {
              this.memoryCache.set(key, decrypted);
            }
          }
        }
      } catch (err) {
        // Vault corrupted or empty, start fresh
      }
    }
  }

  private persistVault(): void {
    const vaultObject: Record<string, string> = {};
    for (const [key, value] of this.memoryCache.entries()) {
      const encrypted = this.encryptValue(value);
      vaultObject[key] = encrypted;
    }
    fs.writeFileSync(this.vaultPath, JSON.stringify(vaultObject, null, 2), 'utf-8');
  }

  private encryptValue(plaintext: string): string {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(plaintext);
      return 'enc:' + encryptedBuffer.toString('hex');
    } else {
      // Fallback fallback with local machine salt if safeStorage not yet initialized
      const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync('ses-fallback-salt', 'salt', 32), Buffer.alloc(16, 0));
      let enc = cipher.update(plaintext, 'utf8', 'hex');
      enc += cipher.final('hex');
      return 'aes:' + enc;
    }
  }

  private decryptValue(ciphertext: string): string | null {
    try {
      if (ciphertext.startsWith('enc:') && safeStorage && safeStorage.isEncryptionAvailable()) {
        const hex = ciphertext.slice(4);
        const buffer = Buffer.from(hex, 'hex');
        return safeStorage.decryptString(buffer);
      } else if (ciphertext.startsWith('aes:')) {
        const hex = ciphertext.slice(4);
        const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync('ses-fallback-salt', 'salt', 32), Buffer.alloc(16, 0));
        let dec = decipher.update(hex, 'hex', 'utf8');
        dec += decipher.final('utf8');
        return dec;
      }
    } catch {
      return null;
    }
    return null;
  }

  public setSecret(key: string, secretValue: string): void {
    this.memoryCache.set(key, secretValue);
    this.persistVault();
  }

  public getSecret(key: string): string | null {
    return this.memoryCache.get(key) || null;
  }

  public deleteSecret(key: string): void {
    this.memoryCache.delete(key);
    this.persistVault();
  }

  public hasSecret(key: string): boolean {
    return this.memoryCache.has(key);
  }
}

export const secureStorageService = new SecureStorageService();
