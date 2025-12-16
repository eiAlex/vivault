// Detecta campos de senha e usuário
function detectLoginFields() {
  const usernameField = document.querySelector('input[type="email"], input[type="text"][name*="user"], input[name*="email"]');
  const passwordField = document.querySelector('input[type="password"]');
  
  if (usernameField && passwordField) {
    addAutoCompleteButton(usernameField, passwordField);
  }
}

// Adiciona botão de auto-complete
function addAutoCompleteButton(usernameField, passwordField) {
  const button = document.createElement('button');
  button.innerHTML = '🔑';
  button.className = 'password-manager-btn';
  button.style.cssText = `
    position: absolute;
    z-index: 10000;
    background: #4285f4;
    border: none;
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
  `;
  
  // Posiciona o botão
  const rect = passwordField.getBoundingClientRect();
  button.style.top = `${rect.top + window.scrollY}px`;
  button.style.left = `${rect.right + window.scrollX - 40}px`;
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = window.location.hostname;
    
    // Solicita credenciais ao background script
    chrome.runtime.sendMessage(
      { action: 'getCredentials', url: url },
      (response) => {
        if (response.success) {
          usernameField.value = response. username;
          passwordField.value = response.password;
        }
      }
    );
  });
  
  document.body.appendChild(button);
}

// Executa quando a página carrega
window.addEventListener('load', detectLoginFields);