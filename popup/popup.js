// ViVault Popup Script
document.addEventListener('DOMContentLoaded', function() {
    const lockedView = document.getElementById('locked-view');
    const unlockedView = document.getElementById('unlocked-view');
    const masterPasswordInput = document.getElementById('master-password');
    const unlockBtn = document.getElementById('unlock-btn');
    const searchInput = document.getElementById('search');
    const passwordsList = document.getElementById('passwords-list');
    const addNewBtn = document.getElementById('add-new-btn');
    const addForm = document.getElementById('add-form');
    const siteNameInput = document.getElementById('site-name');
    const siteUrlInput = document.getElementById('site-url');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const generateBtn = document.getElementById('generate-btn');
    const saveBtn = document.getElementById('save-btn');

    let isUnlocked = false;
    let passwords = [];

    // Check if already unlocked
    checkUnlockStatus();

    // Test background script connection
    testBackgroundConnection();

    // Event listeners
    unlockBtn.addEventListener('click', handleUnlock);
    masterPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    });

    searchInput.addEventListener('input', filterPasswords);
    addNewBtn.addEventListener('click', toggleAddForm);
    generateBtn.addEventListener('click', generatePassword);
    saveBtn.addEventListener('click', savePassword);

    async function sendMessageWithRetry(message, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Sending message (attempt ${attempt}):`, message);
                
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                console.log('Response received:', response);
                return response;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }

    async function testBackgroundConnection() {
        try {
            console.log('Testing background script connection...');
            const response = await sendMessageWithRetry({
                type: 'PING'
            });
            
            if (!response) {
                console.warn('Background script not responding. Extension may need to be reloaded.');
                return false;
            }
            
            console.log('Background script is responsive');
            return true;
        } catch (error) {
            console.error('Background script connection failed:', error);
            return false;
        }
    }

    async function checkUnlockStatus() {
        try {
            const result = await chrome.storage.session.get(['isUnlocked', 'unlockTime']);
            
            if (result.isUnlocked) {
                // Check if session is still valid
                const sessionAge = Date.now() - (result.unlockTime || 0);
                const maxSessionAge = 60 * 60 * 1000; // 1 hour
                
                if (sessionAge < maxSessionAge) {
                    console.log('Found valid session');
                    isUnlocked = true;
                    
                    // Try to load passwords to verify background state
                    const response = await sendMessageWithRetry({ type: 'GET_PASSWORDS' });
                    
                    if (response && response.success) {
                        passwords = response.passwords || [];
                        displayPasswords(passwords);
                        showUnlockedView();
                    } else {
                        console.log('Background not ready, showing locked view');
                        isUnlocked = false;
                        await chrome.storage.session.set({ isUnlocked: false });
                    }
                } else {
                    console.log('Session expired');
                    await chrome.storage.session.set({ isUnlocked: false });
                    isUnlocked = false;
                }
            }
        } catch (error) {
            console.error('Error checking unlock status:', error);
        }
    }

    async function handleUnlock() {
        const masterPassword = masterPasswordInput.value;
        if (!masterPassword) {
            alert('Por favor, digite a senha mestra');
            return;
        }

        try {
            unlockBtn.textContent = 'Desbloqueando...';
            unlockBtn.disabled = true;

            // Send unlock request to background script
            const response = await sendMessageWithRetry({
                type: 'UNLOCK_VAULT',
                masterPassword: masterPassword
            });

            console.log('Background response:', response);

            // Check if response exists and handle it
            if (!response) {
                console.error('No response from background script');
                alert('Erro de comunicação com o background script. Tente recarregar a extensão.');
                return;
            }

            if (response.success) {
                isUnlocked = true;
                await chrome.storage.session.set({ isUnlocked: true });
                await loadPasswords();
                showUnlockedView();
                if (response.message) {
                    showTooltip(unlockBtn, response.message);
                }
            } else {
                alert(response.message || 'Senha mestra incorreta');
            }
        } catch (error) {
            console.error('Error unlocking vault:', error);
            alert('Erro ao desbloquear o cofre: ' + error.message);
        } finally {
            unlockBtn.textContent = 'Desbloquear';
            unlockBtn.disabled = false;
            masterPasswordInput.value = '';
        }
    }

    async function loadPasswords() {
        try {
            const response = await sendMessageWithRetry({
                type: 'GET_PASSWORDS'
            });

            if (!response) {
                console.error('No response from background script when loading passwords');
                return;
            }

            if (response.success) {
                passwords = response.passwords || [];
                displayPasswords(passwords);
            } else {
                console.error('Error loading passwords:', response.message);
                // If vault is locked, show locked view again
                if (response.message === 'Cofre bloqueado') {
                    isUnlocked = false;
                    await chrome.storage.session.set({ isUnlocked: false });
                    showLockedView();
                }
            }
        } catch (error) {
            console.error('Error loading passwords:', error);
        }
    }

    function showUnlockedView() {
        lockedView.style.display = 'none';
        unlockedView.style.display = 'flex';
    }

    function showLockedView() {
        unlockedView.style.display = 'none';
        lockedView.style.display = 'flex';
    }

    function displayPasswords(passwordsToShow) {
        passwordsList.innerHTML = '';
        
        if (passwordsToShow.length === 0) {
            passwordsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">Nenhuma senha salva ainda</p>';
            return;
        }

        passwordsToShow.forEach(password => {
            const item = document.createElement('div');
            item.className = 'password-item';
            item.innerHTML = `
                <h4>${password.siteName}</h4>
                <p>${password.username}</p>
            `;
            
            item.addEventListener('click', async () => {
                try {
                    // Get the actual password from background
                    const response = await chrome.runtime.sendMessage({
                        type: 'GET_PASSWORD_BY_ID',
                        passwordId: password.id
                    });
                    
                    if (response.success) {
                        copyToClipboard(response.password);
                        showTooltip(item, 'Senha copiada!');
                    } else {
                        showTooltip(item, 'Erro ao copiar senha');
                    }
                } catch (error) {
                    console.error('Error copying password:', error);
                    showTooltip(item, 'Erro ao copiar senha');
                }
            });

            passwordsList.appendChild(item);
        });
    }

/**
 * Filter the list of passwords to show only those that contain the search text
 * entered by the user.
 *
 * @param {string} query - The search text entered by the user.
 * @returns {Array} A list of filtered passwords.
 */
    function filterPasswords() {
        const query = searchInput.value.toLowerCase();
        const filtered = passwords.filter(password => 
            password.siteName.toLowerCase().includes(query) ||
            password.username.toLowerCase().includes(query) ||
            password.siteUrl.toLowerCase().includes(query)
        );
        displayPasswords(filtered);
    }

/**
 * Toggle the visibility of the add form and change the text of the add new button accordingly.
 * If the form is visible, clear the form fields and change the button text to 'Cancel'.
 * If the form is not visible, focus the site name input field and change the button text to '+ Add New Password'.
 */
    function toggleAddForm() {
        const isVisible = addForm.style.display !== 'none';
        addForm.style.display = isVisible ? 'none' : 'block';
        addNewBtn.textContent = isVisible ? '+ Add New Password' : 'Cancel';
        
        if (!isVisible) {
            siteNameInput.focus();
        } else {
            clearForm();
        }
    }

    function generatePassword() {
        const length = 16;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        passwordInput.value = password;
    }

    async function savePassword() {
        const siteName = siteNameInput.value.trim();
        const siteUrl = siteUrlInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!siteName || !username || !password) {
            alert('Please fill in all the required fields');
            return;
        }

        try {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const response = await chrome.runtime.sendMessage({
                type: 'SAVE_PASSWORD',
                password: {
                    siteName,
                    siteUrl,
                    username,
                    password,
                    createdAt: new Date().toISOString()
                }
            });

            if (!response) {
                alert('Error saving password.');
                return;
            }

            if (response.success) {
                await loadPasswords();
                toggleAddForm();
                showTooltip(saveBtn, response.message || 'Password saved successfully!');
            } else {
                alert(response.message || 'Error saving password');
            }
        } catch (error) {
            console.error('Error saving password:', error);
            alert('Error saving password: ' + error.message);
        } finally {
            saveBtn.textContent = 'Save Password';
            saveBtn.disabled = false;
        }
    }

    function clearForm() {
        siteNameInput.value = '';
        siteUrlInput.value = '';
        usernameInput.value = '';
        passwordInput.value = '';
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Error copying to clipboard:', err);
        });
    }

    function showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
        `;
        
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 2000);
    }
});