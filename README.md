# ViVault

## Architecture of the extension

```
├── manifest.json          # Cofiguration of extension
├── background.js          # Service worker
├── content-script.js      # Interface with the page
├── popup/
│   ├── popup.html         # Popup interface
│   ├── popup.js           # service popup
│   └── popup.css          # estyle popup
└── storage/
    └── crypto.js          # functions to encrypt and decrypt
```