// Armazena credenciais criptografadas
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request. action === 'getCredentials') {
    chrome.storage.local.get(['passwords', 'masterKey'], (result) => {
      if (result.passwords && result. masterKey) {
        const credentials = findCredentialsForUrl(request.url, result.passwords);
        
        if (credentials) {
          // Descriptografa a senha
          const decrypted = decryptPassword(credentials.password, result.masterKey);
          sendResponse({
            success: true,
            username: credentials.username,
            password: decrypted
          });
        } else {
          sendResponse({ success: false, message: 'Nenhuma credencial encontrada' });
        }
      }
    });
    return true; // Mantém o canal aberto para resposta assíncrona
  }
  
  if (request.action === 'saveCredentials') {
    saveCredentials(request.url, request.username, request.password);
    sendResponse({ success: true });
  }
});

function findCredentialsForUrl(url, passwords) {
  return passwords.find(p => p.url. includes(url) || url.includes(p.url));
}