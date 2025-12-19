// ViVault Content Script - Advanced Login Detection
console.log('ViVault content script loaded');

let loginFields = new Map();
let enhancedFields = new Set();

// Seletores avançados para campos de usuário/email
const usernameSelectors = [
  // Por tipo
  'input[type="email"]',
  'input[type="text"][autocomplete*="username"]',
  'input[type="text"][autocomplete*="email"]',
  
  // Por nome do campo
  'input[name*="user" i]',
  'input[name*="email" i]', 
  'input[name*="login" i]',
  'input[name*="account" i]',
  'input[name*="username" i]',
  
  // Por ID
  'input[id*="user" i]',
  'input[id*="email" i]',
  'input[id*="login" i]',
  'input[id*="account" i]',
  
  // Por placeholder
  'input[placeholder*="email" i]',
  'input[placeholder*="usuário" i]',
  'input[placeholder*="usuario" i]',
  'input[placeholder*="user" i]',
  'input[placeholder*="login" i]',
  
  // Por classe CSS
  'input[class*="email" i]',
  'input[class*="user" i]',
  'input[class*="login" i]'
];

// Seletores avançados para campos de senha
const passwordSelectors = [
  // Por tipo (principal)
  'input[type="password"]',
  
  // Por nome
  'input[name*="pass" i]',
  'input[name*="pwd" i]',
  'input[name*="senha" i]',
  
  // Por ID
  'input[id*="pass" i]',
  'input[id*="pwd" i]',
  'input[id*="senha" i]',
  
  // Por placeholder
  'input[placeholder*="password" i]',
  'input[placeholder*="senha" i]',
  'input[placeholder*="pass" i]',
  
  // Por autocomplete
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  
  // Campos que mudaram para type="text" mas são senhas
  'input[type="text"][name*="pass" i]',
  'input[type="text"][placeholder*="senha" i]'
];

// Detecta todos os campos de login na página
function detectAllLoginFields() {
  console.log('Detecting login fields...');
  
  const passwordFields = findPasswordFields();
  console.log(`Found ${passwordFields.length} password fields`);
  
  passwordFields.forEach((passwordField, index) => {
    const usernameField = findUsernameFieldFor(passwordField);
    
    if (usernameField) {
      const fieldPair = {
        username: usernameField,
        password: passwordField,
        form: passwordField.closest('form'),
        id: `field-pair-${index}`
      };
      
      console.log('Found field pair:', {
        username: getFieldIdentifier(usernameField),
        password: getFieldIdentifier(passwordField)
      });
      
      loginFields.set(fieldPair.id, fieldPair);
      enhanceLoginFields(fieldPair);
    } else {
      console.log('Password field without username:', getFieldIdentifier(passwordField));
      // Ainda assim, enhance o campo de senha
      enhancePasswordField(passwordField);
    }
  });
  
  console.log(`Enhanced ${loginFields.size} login field pairs`);
}

// Encontra todos os campos de senha
function findPasswordFields() {
  const fields = [];
  
  passwordSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (isVisibleField(el) && !fields.includes(el)) {
          fields.push(el);
        }
      });
    } catch (e) {
      console.warn('Invalid selector:', selector, e);
    }
  });
  
  // Filtrar campos que não parecem ser senhas reais
  return fields.filter(field => {
    const identifier = getFieldIdentifier(field).toLowerCase();
    // Excluir campos de confirmação/repetição
    if (identifier.includes('confirm') || 
        identifier.includes('repeat') || 
        identifier.includes('again') ||
        identifier.includes('verificar') ||
        identifier.includes('confirmar')) {
      return false;
    }
    return true;
  });
}

// Encontra o campo de usuário mais próximo para um campo de senha
function findUsernameFieldFor(passwordField) {
  const form = passwordField.closest('form') || document;
  
  // Tenta encontrar campos de usuário no mesmo formulário
  for (const selector of usernameSelectors) {
    try {
      const candidates = form.querySelectorAll(selector);
      
      for (const candidate of candidates) {
        if (isVisibleField(candidate) && 
            isLikelyUsernameField(candidate) &&
            !enhancedFields.has(candidate)) {
          
          // Prioriza campos próximos ao campo de senha
          if (areFieldsRelated(candidate, passwordField)) {
            return candidate;
          }
        }
      }
    } catch (e) {
      console.warn('Invalid username selector:', selector, e);
    }
  }
  
  return null;
}

// Verifica se um campo é visível e interativo
function isVisibleField(field) {
  if (!field || field.type === 'hidden' || field.disabled) return false;
  
  const style = window.getComputedStyle(field);
  if (style.display === 'none' || 
      style.visibility === 'hidden' || 
      style.opacity === '0') {
    return false;
  }
  
  const rect = field.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Verifica se um campo parece ser de usuário/email
function isLikelyUsernameField(field) {
  const identifier = getFieldIdentifier(field).toLowerCase();
  
  // Excluir campos que claramente não são de usuário
  const excludePatterns = [
    'search', 'busca', 'pesquisa', 'query',
    'phone', 'tel', 'telefone', 'celular',
    'first', 'last', 'nome', 'sobrenome',
    'address', 'endereco', 'cep', 'zip'
  ];
  
  for (const pattern of excludePatterns) {
    if (identifier.includes(pattern)) {
      return false;
    }
  }
  
  return true;
}

// Verifica se dois campos estão relacionados (mesmo formulário, próximos, etc)
function areFieldsRelated(usernameField, passwordField) {
  // Mesmo formulário
  const usernameForm = usernameField.closest('form');
  const passwordForm = passwordField.closest('form');
  
  if (usernameForm && passwordForm && usernameForm === passwordForm) {
    return true;
  }
  
  // Proximidade no DOM
  const usernameIndex = Array.from(document.querySelectorAll('input')).indexOf(usernameField);
  const passwordIndex = Array.from(document.querySelectorAll('input')).indexOf(passwordField);
  
  return Math.abs(usernameIndex - passwordIndex) <= 3;
}

// Obtém identificador do campo para debug
function getFieldIdentifier(field) {
  return field.id || field.name || field.placeholder || field.className || 'unnamed';
}

// Aplica melhorias visuais e funcionais nos campos de login
function enhanceLoginFields(fieldPair) {
  if (enhancedFields.has(fieldPair.username) || enhancedFields.has(fieldPair.password)) {
    return; // Já foi processado
  }
  
  enhancePasswordField(fieldPair.password);
  enhanceUsernameField(fieldPair.username);
  
  // Adiciona botão de preenchimento automático
  addViVaultButton(fieldPair);
  
  enhancedFields.add(fieldPair.username);
  enhancedFields.add(fieldPair.password);
}

// Melhora campo de senha
function enhancePasswordField(passwordField) {
  if (enhancedFields.has(passwordField)) return;
  
  passwordField.classList.add('vivault-enhanced');
  
  // Adiciona indicador de segurança
  const indicator = document.createElement('div');
  indicator.className = 'vivault-security-indicator';
  indicator.title = 'ViVault detectou este campo de senha';
  
  passwordField.parentNode.style.position = 'relative';
  passwordField.parentNode.appendChild(indicator);
  
  enhancedFields.add(passwordField);
}

// Melhora campo de usuário
function enhanceUsernameField(usernameField) {
  if (enhancedFields.has(usernameField)) return;
  
  usernameField.classList.add('vivault-enhanced');
  enhancedFields.add(usernameField);
}

// Adiciona botão do ViVault
function addViVaultButton(fieldPair) {
  const button = document.createElement('button');
  button.innerHTML = '🔐';
  button.className = 'vivault-autofill-btn';
  button.title = 'Preencher com ViVault';
  
  button.style.cssText = `
    position: absolute;
    z-index: 10001;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 14px;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  `;
  
  // Posiciona o botão
  positionButton(button, fieldPair.password);
  
  // Eventos do botão
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    await handleAutoFill(fieldPair);
  });
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  });
  
  document.body.appendChild(button);
  
  // Reposiciona em caso de mudanças na página
  fieldPair.button = button;
  observeFieldChanges(fieldPair);
}

// Posiciona o botão próximo ao campo de senha
function positionButton(button, passwordField) {
  const rect = passwordField.getBoundingClientRect();
  button.style.top = `${rect.top + window.scrollY + (rect.height - 32) / 2}px`;
  button.style.left = `${rect.right + window.scrollX - 40}px`;
}

// Observa mudanças nos campos para reposicionar botão
function observeFieldChanges(fieldPair) {
  const observer = new ResizeObserver(() => {
    if (fieldPair.button) {
      positionButton(fieldPair.button, fieldPair.password);
    }
  });
  
  observer.observe(fieldPair.password);
}

// Manipula o preenchimento automático
async function handleAutoFill(fieldPair) {
  // Salva o conteúdo original do botão antes de qualquer operação
  const button = fieldPair.button;
  const originalContent = button ? button.innerHTML : '🔐';
  
  try {
    const url = window.location.hostname;
    console.log('Requesting credentials for:', url);
    
    // Mostra loading
    if (button) {
      button.innerHTML = '⏳';
      button.disabled = true;
    }
    
    // Solicita credenciais ao background script com retry
    const response = await sendMessageWithRetry({ 
      action: 'getCredentials', 
      url: url 
    });
    
    console.log('Credentials response:', response);
    
    if (response && response.success) {
      // Preenche os campos com animação suave
      console.log('Filling fields with:', { username: response.username, hasPassword: !!response.password });
      
      if (fieldPair.username && response.username) {
        fillFieldWithAnimation(fieldPair.username, response.username);
      }
      
      if (fieldPair.password && response.password) {
        console.log('About to fill password field');
        setTimeout(() => {
          fillPasswordFieldWithAnimation(fieldPair.password, response.password);
        }, 150);
      }
      
      // Feedback visual
      showFeedback(fieldPair.password, '✅ Credenciais preenchidas!');
      
      // Adiciona classe para indicar preenchimento
      fieldPair.username?.classList.add('vivault-filled');
      fieldPair.password?.classList.add('vivault-filled');
      
    } else {
      console.log('No credentials found for:', url);
      showFeedback(fieldPair.password, '❌ Nenhuma senha salva para este site');
      
      // Sugere salvar credenciais
      setTimeout(() => {
        showSaveCredentialsPrompt(fieldPair);
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error in autofill:', error);
    showFeedback(fieldPair.password, '❌ Erro no preenchimento: ' + error.message);
  } finally {
    // Restaura botão
    if (fieldPair.button) {
      fieldPair.button.innerHTML = originalContent || '🔐';
      fieldPair.button.disabled = false;
    }
  }
}

// Função auxiliar para enviar mensagens com retry
async function sendMessageWithRetry(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
}

// Mostra prompt para salvar credenciais
function showSaveCredentialsPrompt(fieldPair) {
  if (!fieldPair.username?.value || !fieldPair.password?.value) {
    return; // Não há credenciais para salvar
  }
  
  const prompt = document.createElement('div');
  prompt.className = 'vivault-save-prompt';
  prompt.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🔐</span>
      <span>Salvar senha no ViVault?</span>
      <button class="vivault-save-yes">Sim</button>
      <button class="vivault-save-no">Não</button>
    </div>
  `;
  
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10003;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  
  // Botões
  const yesBtn = prompt.querySelector('.vivault-save-yes');
  const noBtn = prompt.querySelector('.vivault-save-no');
  
  yesBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
  `;
  
  noBtn.style.cssText = `
    background: transparent;
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 4px;
  `;
  
  // Events
  yesBtn.addEventListener('click', () => {
    saveCredentials(fieldPair);
    document.body.removeChild(prompt);
  });
  
  noBtn.addEventListener('click', () => {
    document.body.removeChild(prompt);
  });
  
  document.body.appendChild(prompt);
  
  // Auto remove after 10 seconds
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.parentNode.removeChild(prompt);
    }
  }, 10000);
}

// Salva credenciais no ViVault
async function saveCredentials(fieldPair) {
  try {
    const credentials = {
      url: window.location.hostname,
      username: fieldPair.username.value,
      password: fieldPair.password.value
    };
    
    console.log('Saving credentials for:', credentials.url);
    
    const response = await sendMessageWithRetry({
      action: 'saveCredentials',
      ...credentials
    });
    
    if (response && response.success) {
      showFeedback(fieldPair.password, '✅ Credenciais salvas no ViVault!');
    } else {
      showFeedback(fieldPair.password, '❌ Erro ao salvar credenciais');
    }
  } catch (error) {
    console.error('Error saving credentials:', error);
    showFeedback(fieldPair.password, '❌ Erro ao salvar: ' + error.message);
  }
}

// Preenche campo com animação e compatibilidade máxima
function fillFieldWithAnimation(field, value) {
  if (!field || !value) return;
  
  console.log('Filling field:', getFieldIdentifier(field), 'with value length:', value.length);
  
  // Remove readonly temporariamente se existir
  const wasReadOnly = field.readOnly;
  field.readOnly = false;
  
  // Foca no campo
  field.focus();
  field.click(); // Alguns sites precisam de click
  
  // Limpa valor anterior
  field.value = '';
  field.setAttribute('value', '');
  
  // Dispara eventos de limpeza
  triggerFieldEvents(field, '');
  
  // Simula digitação caractere por caractere
  let i = 0;
  const typeInterval = setInterval(() => {
    if (i < value.length) {
      const currentValue = field.value + value[i];
      
      // Múltiplas formas de definir o valor para máxima compatibilidade
      field.value = currentValue;
      field.setAttribute('value', currentValue);
      
      // Para campos React/Vue que usam propriedades
      if (field._valueTracker) {
        field._valueTracker.setValue('');
      }
      
      // Dispara eventos a cada caractere
      triggerFieldEvents(field, currentValue);
      
      i++;
    } else {
      clearInterval(typeInterval);
      
      // Eventos finais
      setTimeout(() => {
        triggerFinalEvents(field, value);
        
        // Restaura readonly
        field.readOnly = wasReadOnly;
        
        // Remove foco após preenchimento
        setTimeout(() => {
          field.blur();
        }, 100);
        
      }, 100);
    }
  }, 30); // Velocidade de digitação mais rápida
}

// Função específica para preencher campos de senha com técnicas robustas
function fillPasswordFieldWithAnimation(field, value) {
  if (!field || !value) {
    console.log('Password field or value is missing');
    return;
  }
  
  console.log('Filling PASSWORD field:', getFieldIdentifier(field), 'with value length:', value.length, 'field type:', field.type);
  
  // Salva estados originais
  const originalReadOnly = field.readOnly;
  const originalDisabled = field.disabled;
  const originalAutocomplete = field.autocomplete;
  
  // Remove proteções temporariamente
  field.readOnly = false;
  field.disabled = false;
  field.autocomplete = 'off';
  
  // Foca no campo com múltiplas tentativas
  field.focus();
  field.click();
  
  // Para sites que verificam se o campo está focado
  setTimeout(() => {
    field.focus();
  }, 10);
  
  // Limpa completamente o campo
  field.value = '';
  field.setAttribute('value', '');
  
  // Alguns sites verificam a propriedade defaultValue
  if (field.defaultValue !== undefined) {
    field.defaultValue = '';
  }
  
  // Dispara eventos de limpeza específicos para campos de senha
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Método 1: Preenchimento direto (mais rápido)
  field.value = value;
  field.setAttribute('value', value);
  
  console.log('Direct fill attempt - field value is now:', field.value.length, 'characters');
  
  // Dispara eventos completos
  triggerPasswordFieldEvents(field, value);
  
  // Método 2: Se o direto não funcionar, tenta caractere por caractere
  setTimeout(() => {
    if (!field.value || field.value !== value) {
      console.log('Direct fill failed for password, trying character by character. Current value:', field.value.length);
      
      field.value = '';
      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < value.length) {
          const char = value[i];
          field.value += char;
          field.setAttribute('value', field.value);
          
          // Eventos específicos para cada caractere
          triggerPasswordFieldEvents(field, field.value);
          
          console.log('Password char', i + 1, 'of', value.length, 'added. Current length:', field.value.length);
          
          i++;
        } else {
          clearInterval(typeInterval);
          finalizePasswordField(field, value, originalReadOnly, originalDisabled, originalAutocomplete);
        }
      }, 20); // Velocidade mais rápida para senhas
    } else {
      console.log('Direct fill succeeded for password field');
      finalizePasswordField(field, value, originalReadOnly, originalDisabled, originalAutocomplete);
    }
  }, 100);
}

// Dispara eventos específicos para campos de senha
function triggerPasswordFieldEvents(field, value) {
  // Eventos básicos
  field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  
  // Eventos de teclado (importantes para campos de senha)
  const lastChar = value.slice(-1) || '';
  field.dispatchEvent(new KeyboardEvent('keydown', { 
    bubbles: true, 
    key: lastChar,
    code: lastChar ? `Key${lastChar.toUpperCase()}` : 'Unidentified'
  }));
  field.dispatchEvent(new KeyboardEvent('keypress', { 
    bubbles: true, 
    key: lastChar 
  }));
  field.dispatchEvent(new KeyboardEvent('keyup', { 
    bubbles: true, 
    key: lastChar 
  }));
  
  // Eventos específicos para frameworks
  const inputEvent = new Event('input', { bubbles: true });
  inputEvent.simulated = true;
  inputEvent.isTrusted = false;
  field.dispatchEvent(inputEvent);
  
  // Para React (detecta mudanças por referência)
  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(field, value);
    }
  } catch (e) {
    console.log('React value setter not available:', e.message);
  }
  
  // Dispara evento React personalizado
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

// Finaliza o preenchimento do campo de senha
function finalizePasswordField(field, value, originalReadOnly, originalDisabled, originalAutocomplete) {
  // Verifica se o valor foi realmente definido
  if (field.value !== value) {
    console.log('Final attempt to set password value. Current:', field.value.length, 'Expected:', value.length);
    field.value = value;
    field.setAttribute('value', value);
  }
  
  // Eventos finais
  triggerFinalEvents(field, value);
  
  // Restaura estados originais
  field.readOnly = originalReadOnly;
  field.disabled = originalDisabled;
  field.autocomplete = originalAutocomplete;
  
  // Animação visual
  field.classList.add('vivault-filled');
  setTimeout(() => {
    field.classList.remove('vivault-filled');
  }, 2000);
  
  // Blur para finalizar
  setTimeout(() => {
    field.blur();
  }, 200);
  
  console.log('Password field filling completed. Final value length:', field.value.length, 'Expected:', value.length);
}

// Dispara eventos para compatibilidade com frameworks
function triggerFieldEvents(field, value) {
  // Eventos básicos
  field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  
  // Eventos de teclado para frameworks que os escutam
  field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) || '' }));
  field.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: value.slice(-1) || '' }));
  field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) || '' }));
  
  // Evento customizado para React
  const reactEvent = new Event('input', { bubbles: true });
  reactEvent.simulated = true;
  field.dispatchEvent(reactEvent);
}

// Eventos finais após preenchimento completo
function triggerFinalEvents(field, value) {
  // Eventos de finalização
  field.dispatchEvent(new Event('blur', { bubbles: true }));
  field.dispatchEvent(new Event('focusout', { bubbles: true }));
  
  // Para Angular
  field.dispatchEvent(new Event('ng-change', { bubbles: true }));
  
  // Para Vue
  field.dispatchEvent(new CustomEvent('vue:updated', { 
    bubbles: true, 
    detail: { value } 
  }));
  
  // Força atualização para frameworks que não detectam mudanças
  if (field.oninput) field.oninput({ target: field });
  if (field.onchange) field.onchange({ target: field });
}

// Mostra feedback visual
function showFeedback(field, message) {
  const feedback = document.createElement('div');
  feedback.className = 'vivault-feedback';
  feedback.textContent = message;
  feedback.style.cssText = `
    position: absolute;
    top: -35px;
    right: 0;
    background: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10002;
    animation: fadeInOut 3s ease;
  `;
  
  field.parentNode.style.position = 'relative';
  field.parentNode.appendChild(feedback);
  
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.parentNode.removeChild(feedback);
    }
  }, 3000);
}

// Inicialização
function initViVault() {
  console.log('Initializing ViVault content script');
  
  // Detecta campos imediatamente
  detectAllLoginFields();
  
  // Tenta preenchimento automático se houver credenciais
  setTimeout(tryAutoFill, 1000);
  
  // Observa mudanças no DOM
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Verifica se foram adicionados novos inputs
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'INPUT' || node.querySelector('input')) {
              shouldRedetect = true;
              break;
            }
          }
        }
      }
    });
    
    if (shouldRedetect) {
      setTimeout(() => {
        detectAllLoginFields();
        tryAutoFill();
      }, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Observa foco em campos para mostrar sugestões
  document.addEventListener('focusin', handleFieldFocus);
}

// Tenta preenchimento automático proativo
async function tryAutoFill() {
  if (loginFields.size === 0) {
    console.log('No login fields detected for proactive autofill');
    return;
  }
  
  try {
    const url = window.location.hostname;
    console.log('Trying proactive autofill for URL:', url);
    
    const response = await sendMessageWithRetry({ 
      action: 'getCredentials', 
      url: url 
    });
    
    console.log('Proactive autofill response:', response);
    
    if (response && response.success) {
      console.log('Found saved credentials for proactive fill. Username:', response.username, 'Password length:', response.password?.length);
      
      // Mostra sugestão de preenchimento para o primeiro par de campos
      const firstPair = loginFields.values().next().value;
      if (firstPair && !firstPair.username?.value && !firstPair.password?.value) {
        showAutoFillSuggestion(firstPair, response);
      } else {
        console.log('Fields already filled or invalid field pair');
      }
    } else {
      console.log('No saved credentials available for this site');
    }
  } catch (error) {
    console.log('Proactive autofill error:', error.message);
  }
}

// Mostra sugestão de preenchimento automático
function showAutoFillSuggestion(fieldPair, credentials) {
  const suggestion = document.createElement('div');
  suggestion.className = 'vivault-autofill-suggestion';
  suggestion.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🔐</span>
      <div>
        <div style="font-weight: 500;">ViVault encontrou uma senha salva</div>
        <div style="font-size: 12px; opacity: 0.8;">Usuário: ${credentials.username}</div>
      </div>
      <button class="vivault-fill-btn">Preencher</button>
      <button class="vivault-dismiss-btn">✕</button>
    </div>
  `;
  
  suggestion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10004;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #333;
    min-width: 300px;
    animation: slideInRight 0.3s ease;
  `;
  
  // Estilizar botões
  const fillBtn = suggestion.querySelector('.vivault-fill-btn');
  const dismissBtn = suggestion.querySelector('.vivault-dismiss-btn');
  
  fillBtn.style.cssText = `
    background: #667eea;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: auto;
  `;
  
  dismissBtn.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    margin-left: 8px;
    color: #666;
  `;
  
  // Eventos
  fillBtn.addEventListener('click', () => {
    handleAutoFill(fieldPair);
    document.body.removeChild(suggestion);
  });
  
  dismissBtn.addEventListener('click', () => {
    document.body.removeChild(suggestion);
  });
  
  document.body.appendChild(suggestion);
  
  // Auto remove após 15 segundos
  setTimeout(() => {
    if (suggestion.parentNode) {
      suggestion.parentNode.removeChild(suggestion);
    }
  }, 15000);
}

// Manipula foco em campos
function handleFieldFocus(event) {
  if (event.target.tagName !== 'INPUT') return;
  
  const field = event.target;
  
  // Se é um campo de senha vazio, mostra dica
  if (field.type === 'password' && !field.value) {
    setTimeout(() => {
      if (field === document.activeElement && !field.value) {
        showViVaultHint(field);
      }
    }, 1000);
  }
}

// Mostra dica do ViVault
function showViVaultHint(field) {
  // Verifica se já existe uma dica
  if (document.querySelector('.vivault-hint')) return;
  
  const hint = document.createElement('div');
  hint.className = 'vivault-hint';
  hint.textContent = '💡 Pressione Ctrl+Shift+V para preencher com ViVault';
  
  hint.style.cssText = `
    position: absolute;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10005;
    pointer-events: none;
    white-space: nowrap;
    animation: fadeIn 0.3s ease;
  `;
  
  // Posiciona abaixo do campo
  const rect = field.getBoundingClientRect();
  hint.style.top = `${rect.bottom + window.scrollY + 5}px`;
  hint.style.left = `${rect.left + window.scrollX}px`;
  
  document.body.appendChild(hint);
  
  // Remove quando o campo perde o foco ou após 5 segundos
  const removeHint = () => {
    if (hint.parentNode) {
      hint.parentNode.removeChild(hint);
    }
  };
  
  field.addEventListener('blur', removeHint, { once: true });
  setTimeout(removeHint, 5000);
}

// Adiciona atalho de teclado
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+V para preencher
  if (event.ctrlKey && event.shiftKey && event.key === 'V') {
    event.preventDefault();
    
    // Encontra o par de campos mais próximo
    const activeField = document.activeElement;
    if (activeField && activeField.tagName === 'INPUT') {
      
      for (const [id, fieldPair] of loginFields) {
        if (fieldPair.username === activeField || fieldPair.password === activeField) {
          handleAutoFill(fieldPair);
          break;
        }
      }
    }
  }
});

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViVault);
} else {
  initViVault();
}

// Também executa após o load completo para SPAs
window.addEventListener('load', () => {
  setTimeout(detectAllLoginFields, 1000);
});

// Adiciona estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(10px); }
    20% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-10px); }
  }
  
  @keyframes slideIn {
    0% { opacity: 0; transform: translateX(100%); }
    100% { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideInRight {
    0% { opacity: 0; transform: translateX(300px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .vivault-filled {
    background: linear-gradient(90deg, #e8f5e8, transparent) !important;
    animation: pulse 0.5s ease;
  }
  
  .vivault-autofill-btn:hover {
    animation: pulse 0.3s ease;
  }
`;
document.head.appendChild(style);