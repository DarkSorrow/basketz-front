import crypto from 'crypto';
//import cryptoJS from 'crypto-js';

interface HashPair {
  secret: string
  hash: string
}

export const createHash = (): HashPair => {
  const secret = crypto.randomBytes(32);
  const hash = crypto.createHash('sha256').update(secret).digest();
  return {
    secret: `0x${secret.toString('hex')}`,
    hash: `0x${hash.toString('hex')}`,
  }
}