# 🔐 ViVault - Gerenciador de Senhas Seguro

ViVault é uma extensão do Chrome para gerenciamento seguro de senhas com criptografia AES-256 e preenchimento automático.

## ✨ Recursos

- 🔒 **Criptografia AES-256-GCM** - Senhas protegidas com criptografia de nível militar
- 🎯 **Preenchimento automático** - Detecta e preenche formulários automaticamente
- 🎨 **Interface moderna** - Design limpo com gradientes e efeitos visuais
- 🔍 **Busca inteligente** - Encontre rapidamente suas senhas salvas
- 🎲 **Gerador de senhas** - Crie senhas fortes automaticamente
- 📱 **Responsivo** - Interface otimizada para diferentes tamanhos

## 🏗️ Arquitetura da Extensão

```
├── manifest.json          # Configuração da extensão
├── background.js          # Service worker principal
├── content-script.js      # Interface com páginas web
├── content-style.css      # Estilos para content script
├── crypto.js              # Funções de criptografia (legacy)
├── popup/
│   ├── popup.html         # Interface do popup
│   ├── popup.js           # Lógica do popup
│   └── popup.css          # Estilos do popup
└── icons/                 # Ícones da extensão
    ├── bloqueio-nfc-16.png
    ├── bloqueio-nfc-32.png
    ├── bloqueio-nfc-64.png
    └── bloqueio-nfc-128.png
```

## 🚀 Como Instalar

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/eiAlex/vivault.git
   cd vivault
   ```

2. **Abra o Chrome** e vá para `chrome://extensions/`

3. **Ative o "Modo do desenvolvedor"** (canto superior direito)

4. **Clique em "Carregar sem compactação"**

5. **Selecione a pasta `vivault`**

## 🔧 Como Usar

### Primeira Configuração

1. **Clique no ícone da extensão** na barra de ferramentas
2. **Digite uma senha mestra** (será sua chave de acesso)
3. **Clique em "Desbloquear"** - esta senha será salva como sua senha mestra

### Adicionando Senhas

1. **Abra o popup** da extensão
2. **Clique em "+ Adicionar Nova Senha"**
3. **Preencha os dados**:
   - Nome do site
   - URL (opcional)
   - Usuário/Email
   - Senha (ou use o gerador)
4. **Clique em "Salvar"**

### Usando Senhas Salvas

1. **Navegue para um site** que tenha senha salva
2. **A extensão detectará automaticamente** os campos de login
3. **Clique na senha no popup** para copiá-la
4. **Cole manualmente** ou aguarde o preenchimento automático

## 🔐 Segurança

- **Criptografia AES-256-GCM** com derivação de chave PBKDF2
- **Salt único** para cada senha criptografada  
- **100.000 iterações** PBKDF2 para proteção contra ataques
- **Chave mestra** nunca armazenada em texto plano
- **Sessão segura** - dados descriptografados apenas na memória

## 🛡️ Importantes de Segurança

⚠️ **ATENÇÃO**: Não há sistema de recuperação de senha mestra implementado!

- **Anote sua senha mestra** em local seguro
- **Use uma senha forte** (mín. 12 caracteres, maiúsculas, números, símbolos)
- **Se esquecer a senha**, terá que limpar os dados da extensão

## 🔄 Recuperação de Dados

Se esquecer a senha mestra:

1. Vá para `chrome://extensions/`
2. Encontre "ViVault" e clique nos detalhes
3. Clique em "Limpar dados de armazenamento"
4. Redefina uma nova senha mestra

## 🐛 Solução de Problemas

### Erro "Cannot read properties of undefined"
- ✅ **Corrigido** - Handlers de mensagem implementados

### Arquivo CSS não encontrado
- ✅ **Corrigido** - Arquivo `content-style.css` criado

### Estrutura de popup incorreta
- ✅ **Corrigido** - Arquivos organizados na pasta `popup/`

## 🚧 Desenvolvimento

### Recursos Implementados
- ✅ Sistema de senha mestra com hash SHA-256
- ✅ Criptografia AES-256-GCM para senhas
- ✅ Interface moderna com CSS Grid/Flexbox
- ✅ Gerador de senhas seguras
- ✅ Sistema de busca e filtros
- ✅ Handlers completos para todas as operações

### Próximas Funcionalidades
- 🔄 Sistema de backup e importação
- 🔄 Categorias e tags para senhas
- 🔄 Histórico de senhas alteradas
- 🔄 Verificação de senhas vazadas
- 🔄 Autenticação biométrica

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature
3. Fazer commit das mudanças
4. Fazer push para a branch
5. Abrir um Pull Request

---

**ViVault** - Sua segurança digital em boas mãos! 🔐✨