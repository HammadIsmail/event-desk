// src/lib/crypto.ts
import * as Crypto from 'expo-crypto';

const SALT = '_eventdesk_salt_2026';

export async function hashPassword(password: string): Promise<string> {
  const salted = password + SALT;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salted
  );
}

export function generateQrToken(regNo: string, sportName: string): string {
  const cleanReg = regNo.toUpperCase().trim();
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  // Format: EVT-<REG_NO>-<SPORT_CODE>-<HASH>
  const sportPrefix = sportName.slice(0, 3).toUpperCase();
  return `EVT-${cleanReg}-${sportPrefix}-${timestamp}-${randomPart}`;
}
