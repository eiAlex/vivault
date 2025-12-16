// Usa Web Crypto API
async function encryptPassword(password, masterPassword) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Deriva chave da senha mestra
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await window. crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('salt-único'), // Use salt aleatório em produção
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return {
    encrypted: btoa(String.fromCharCode(... new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

// Gerador de senhas fortes
function generateStrongPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  return Array. from(array)
    .map(x => charset[x % charset.length])
    .join('');
}