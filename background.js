// ViVault Background Script - Service Worker
console.log('ViVault background script loaded');

let masterKey = null;
let isUnlocked = false;

// Initialize state on startup
initializeBackground();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type, request);

  // Handle ping messages for connection testing
  if (request.type === 'PING') {
    console.log('Background script ping received');
    sendResponse({ success: true, message: 'pong' });
    return;
  }

  if (request.type === 'UNLOCK_VAULT') {
    handleUnlockVault(request, sendResponse);
    return true;
  }
  
  if (request.type === 'GET_PASSWORDS') {
    handleGetPasswords(request, sendResponse);
    return true;
  }
  
  if (request.type === 'SAVE_PASSWORD') {
    handleSavePassword(request, sendResponse);
    return true;
  }
  
  if (request.type === 'GET_PASSWORD_BY_ID') {
    handleGetPasswordById(request, sendResponse);
    return true;
  }

  // Legacy handlers for content script
  if (request.action === 'getCredentials') {
    chrome.storage.local.get(['passwords', 'masterKeyHash'], (result) => {
      if (result.passwords && masterKey) {
        const credentials = findCredentialsForUrl(request.url, result.passwords);
        
        if (credentials) {
          try {
            // Descriptografa a senha
            const decrypted = decryptPassword(credentials.encryptedPassword, masterKey);
            sendResponse({
              success: true,
              username: credentials.username,
              password: decrypted
            });
          } catch (error) {
            console.error('Error decrypting password:', error);
            sendResponse({ success: false, message: 'Erro ao descriptografar senha' });
          }
        } else {
          sendResponse({ success: false, message: 'Nenhuma credencial encontrada' });
        }
      } else {
        sendResponse({ success: false, message: 'Cofre bloqueado' });
      }
    });
    return true;
  }
  
  if (request.action === 'saveCredentials') {
    if (masterKey) {
      saveCredentialsLegacy(request.url, request.username, request.password);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'Cofre bloqueado' });
    }
    return true;
  }
});

// Unlock vault handler
async function handleUnlockVault(request, sendResponse) {
  try {
    const { masterPassword } = request;
    
    // Get stored master key hash
    const result = await chrome.storage.local.get(['masterKeyHash', 'isFirstTime']);
    
    if (result.isFirstTime !== false) {
      // First time setup - any password becomes the master password
      const hash = await hashPassword(masterPassword);
      await chrome.storage.local.set({ 
        masterKeyHash: hash,
        isFirstTime: false,
        passwords: []
      });
      masterKey = masterPassword;
      isUnlocked = true;
      
      // Store unlock session
      await chrome.storage.session.set({
        isUnlocked: true,
        unlockTime: Date.now()
      });
      
      console.log('Master password set for first time');
      sendResponse({ 
        success: true, 
        message: 'Senha mestra definida com sucesso!' 
      });
    } else {
      // Verify existing master password
      const isValid = await verifyPassword(masterPassword, result.masterKeyHash);
      
      if (isValid) {
        masterKey = masterPassword;
        isUnlocked = true;
        
        // Store unlock session
        await chrome.storage.session.set({
          isUnlocked: true,
          unlockTime: Date.now()
        });
        
        console.log('Vault unlocked successfully');
        sendResponse({ 
          success: true, 
          message: 'Cofre desbloqueado com sucesso!' 
        });
      } else {
        console.log('Invalid master password');
        sendResponse({ 
          success: false, 
          message: 'Senha mestra incorreta' 
        });
      }
    }
  } catch (error) {
    console.error('Error unlocking vault:', error);
    sendResponse({ 
      success: false, 
      message: 'Erro interno ao desbloquear cofre' 
    });
  }
}

// Get passwords handler
async function handleGetPasswords(request, sendResponse) {
  try {
    console.log('Getting passwords - current state:', { isUnlocked, hasMasterKey: !!masterKey });
    
    // Check session state
    const sessionResult = await chrome.storage.session.get(['isUnlocked', 'unlockTime']);
    
    if (!sessionResult.isUnlocked || !isUnlocked || !masterKey) {
      console.log('Vault is locked - session:', sessionResult.isUnlocked, 'memory:', isUnlocked, 'masterKey:', !!masterKey);
      sendResponse({ success: false, message: 'Cofre bloqueado' });
      return;
    }

    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];
    
    console.log(`Found ${passwords.length} passwords`);
    
    // Decrypt passwords for display
    const decryptedPasswords = passwords.map(p => ({
      id: p.id,
      siteName: p.siteName,
      siteUrl: p.siteUrl,
      username: p.username,
      createdAt: p.createdAt,
      // Don't send actual password, just indicate it exists
      hasPassword: true
    }));

    sendResponse({ 
      success: true, 
      passwords: decryptedPasswords 
    });
  } catch (error) {
    console.error('Error getting passwords:', error);
    sendResponse({ 
      success: false, 
      message: 'Erro ao carregar senhas' 
    });
  }
}

// Save password handler
async function handleSavePassword(request, sendResponse) {
  try {
    if (!isUnlocked || !masterKey) {
      sendResponse({ success: false, message: 'Cofre bloqueado' });
      return;
    }

    const { password } = request;
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];
    
    // Encrypt the password
    const encryptedPassword = await encryptPassword(password.password, masterKey);
    
    const newPassword = {
      id: Date.now().toString(),
      siteName: password.siteName,
      siteUrl: password.siteUrl,
      username: password.username,
      encryptedPassword: encryptedPassword,
      createdAt: password.createdAt
    };

    passwords.push(newPassword);
    await chrome.storage.local.set({ passwords });

    sendResponse({ 
      success: true, 
      message: 'Senha salva com sucesso!' 
    });
  } catch (error) {
    console.error('Error saving password:', error);
    sendResponse({ 
      success: false, 
      message: 'Erro ao salvar senha' 
    });
  }
}

// Get password by ID handler
async function handleGetPasswordById(request, sendResponse) {
  try {
    if (!isUnlocked || !masterKey) {
      sendResponse({ success: false, message: 'Cofre bloqueado' });
      return;
    }

    const { passwordId } = request;
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];
    
    const password = passwords.find(p => p.id === passwordId);
    if (!password) {
      sendResponse({ success: false, message: 'Senha não encontrada' });
      return;
    }

    // Decrypt the password
    const decryptedPassword = await decryptPassword(password.encryptedPassword, masterKey);

    sendResponse({ 
      success: true, 
      password: decryptedPassword 
    });
  } catch (error) {
    console.error('Error getting password by ID:', error);
    sendResponse({ 
      success: false, 
      message: 'Erro ao descriptografar senha' 
    });
  }
}

// Utility functions
function findCredentialsForUrl(url, passwords) {
  return passwords.find(p => 
    p.siteUrl && (p.siteUrl.includes(url) || url.includes(p.siteUrl))
  );
}

// Legacy save function
async function saveCredentialsLegacy(url, username, password) {
  if (!masterKey) return;
  
  try {
    const result = await chrome.storage.local.get(['passwords']);
    const passwords = result.passwords || [];
    
    const encryptedPassword = await encryptPassword(password, masterKey);
    const newPassword = {
      id: Date.now().toString(),
      siteName: extractDomainFromUrl(url),
      siteUrl: url,
      username: username,
      encryptedPassword: encryptedPassword,
      createdAt: new Date().toISOString()
    };

    passwords.push(newPassword);
    await chrome.storage.local.set({ passwords });
  } catch (error) {
    console.error('Error saving credentials:', error);
  }
}

function extractDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
}

// Password hashing and verification
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Encryption/Decryption functions
async function encryptPassword(password, masterPassword) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Derive key from master password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    salt: Array.from(salt)
  };
}

async function decryptPassword(encryptedData, masterPassword) {
  const encoder = new TextEncoder();
  
  // Derive key from master password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(encryptedData.salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { 
      name: 'AES-GCM', 
      iv: new Uint8Array(encryptedData.iv) 
    },
    key,
    new Uint8Array(encryptedData.encrypted)
  );
  
  return new TextDecoder().decode(decrypted);
}

// Initialize background state
async function initializeBackground() {
  try {
    console.log('Initializing background script...');
    
    // Check if there's an active session
    const sessionResult = await chrome.storage.session.get(['isUnlocked', 'unlockTime']);
    
    if (sessionResult.isUnlocked) {
      // Check if session is still valid (within 1 hour)
      const sessionAge = Date.now() - (sessionResult.unlockTime || 0);
      const maxSessionAge = 60 * 60 * 1000; // 1 hour
      
      if (sessionAge < maxSessionAge) {
        console.log('Found valid session, but masterKey needs to be re-entered');
        // Note: We can't restore masterKey for security reasons
        // User will need to unlock again, but we know they were recently authenticated
      } else {
        console.log('Session expired, clearing session data');
        await chrome.storage.session.set({ isUnlocked: false });
      }
    }
  } catch (error) {
    console.error('Error initializing background:', error);
  }
}

// Lock vault when extension is suspended
chrome.runtime.onSuspend.addListener(async () => {
  console.log('Background script suspending...');
  masterKey = null;
  isUnlocked = false;
  // Keep session data for potential restoration
});