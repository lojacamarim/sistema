// ============================================
// SISTEMA SIMPLIFICADO DE BACKUP NO GOOGLE DRIVE
// ============================================

// 🔧 CONFIGURAÇÃO - SUBSTITUA COM SUAS CREDENCIAIS
const DRIVE_CONFIG = {
    clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
    apiKey: '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',
    scope: 'https://www.googleapis.com/auth/drive.file',
    folderName: 'Camarim-Backup-System'
};

// Sistema principal simplificado
const CamarimDriveBackup = {
    isInitialized: false,
    isLoggedIn: false,
    userEmail: null,
    
    // Inicializar quando a página carregar
    async init() {
        console.log('🚀 Iniciando Drive Backup...');
        
        try {
            // 1. Adicionar botão na interface
            this.addButtonToUI();
            
            // 2. Tentar carregar Google API
            await this.loadGoogleAPI();
            
            console.log('✅ Drive Backup inicializado');
            return true;
        } catch (error) {
            console.warn('⚠️ Drive Backup não disponível:', error.message);
            this.showErrorMessage();
            return false;
        }
    },
    
    // Adicionar botão na interface
    addButtonToUI() {
        console.log('🎨 Adicionando botão Drive...');
        
        // Função para tentar adicionar o botão
        const tryAddButton = () => {
            const headerButtons = document.querySelector('.header-buttons');
            
            if (!headerButtons) {
                console.log('⏳ Aguardando header carregar...');
                setTimeout(tryAddButton, 500);
                return;
            }
            
            // Verificar se o botão já existe
            if (document.getElementById('drive-simple-btn')) {
                return;
            }
            
            // Criar botão
            const button = document.createElement('button');
            button.id = 'drive-simple-btn';
            button.className = 'btn btn-primary';
            button.innerHTML = '<i class="fab fa-google-drive"></i> Drive Backup';
            button.title = 'Backup no Google Drive';
            button.style.marginLeft = '10px';
            
            // Adicionar evento
            button.addEventListener('click', () => {
                this.showSimpleModal();
            });
            
            // Adicionar ao header
            headerButtons.appendChild(button);
            console.log('✅ Botão Drive adicionado');
        };
        
        // Tentar adicionar o botão
        setTimeout(tryAddButton, 1000);
    },
    
    // Mostrar mensagem de erro
    showErrorMessage() {
        const tryShowError = () => {
            const headerButtons = document.querySelector('.header-buttons');
            
            if (headerButtons) {
                const errorBtn = document.createElement('button');
                errorBtn.id = 'drive-error-btn';
                errorBtn.className = 'btn btn-danger';
                errorBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Drive';
                errorBtn.title = 'Google Drive indisponível';
                errorBtn.style.marginLeft = '10px';
                
                errorBtn.addEventListener('click', () => {
                    alert('Google Drive Backup não está disponível no momento.\n\nVerifique:\n1. Sua conexão com a internet\n2. As credenciais do Google API\n3. O console do navegador (F12)');
                });
                
                headerButtons.appendChild(errorBtn);
            }
        };
        
        setTimeout(tryShowError, 2000);
    },
    
    // Carregar Google API
    async loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Verificar se já está carregada
            if (window.gapi && window.gapi.load) {
                console.log('✅ Google API já carregada');
                resolve();
                return;
            }
            
            console.log('📦 Carregando Google API...');
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('✅ Google API carregada');
                
                // Inicializar a API
                gapi.load('client:auth2', () => {
                    console.log('✅ Google Auth2 carregado');
                    
                    gapi.client.init({
                        apiKey: DRIVE_CONFIG.apiKey,
                        clientId: DRIVE_CONFIG.clientId,
                        scope: DRIVE_CONFIG.scope,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                    }).then(() => {
                        console.log('✅ Google Client inicializado');
                        this.isInitialized = true;
                        
                        // Verificar login existente
                        const authInstance = gapi.auth2.getAuthInstance();
                        if (authInstance.isSignedIn.get()) {
                            this.isLoggedIn = true;
                            this.userEmail = authInstance.currentUser.get().getBasicProfile().getEmail();
                            this.updateButtonStatus();
                        }
                        
                        resolve();
                    }).catch(error => {
                        console.error('❌ Erro na inicialização:', error);
                        reject(error);
                    });
                });
            };
            
            script.onerror = () => {
                console.error('❌ Falha ao carregar Google API');
                reject(new Error('Falha ao carregar Google API'));
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Atualizar status do botão
    updateButtonStatus() {
        const button = document.getElementById('drive-simple-btn');
        if (!button) return;
        
        if (this.isLoggedIn && this.userEmail) {
            button.className = 'btn btn-success';
            button.innerHTML = `<i class="fab fa-google-drive"></i> ${this.userEmail.split('@')[0]}`;
            button.title = `Conectado como ${this.userEmail}`;
        } else {
            button.className = 'btn btn-primary';
            button.innerHTML = '<i class="fab fa-google-drive"></i> Drive Backup';
            button.title = 'Conectar ao Google Drive';
        }
    },
    
    // Login simplificado
    async login() {
        try {
            console.log('🔑 Tentando login...');
            
            const authInstance = gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn({
                prompt: 'select_account'
            });
            
            this.isLoggedIn = true;
            this.userEmail = user.getBasicProfile().getEmail();
            this.updateButtonStatus();
            
            console.log('✅ Login realizado:', this.userEmail);
            return true;
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            alert(`Erro ao conectar: ${error.error || error.message}`);
            return false;
        }
    },
    
    // Logout
    async logout() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            
            this.isLoggedIn = false;
            this.userEmail = null;
            this.updateButtonStatus();
            
            console.log('✅ Logout realizado');
            return true;
            
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            return false;
        }
    },
    
    // Modal simples
    showSimpleModal() {
        // Criar modal se não existir
        if (!document.getElementById('simple-drive-modal')) {
            this.createSimpleModal();
        }
        
        // Mostrar modal
        document.getElementById('simple-drive-modal').style.display = 'flex';
        this.updateModalContent();
    },
    
    // Criar modal simples
    createSimpleModal() {
        const modal = document.createElement('div');
        modal.id = 'simple-drive-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                ">
                    <h3 style="margin: 0;">
                        <i class="fab fa-google-drive"></i> Google Drive Backup
                    </h3>
                    <button id="close-simple-modal" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                    ">&times;</button>
                </div>
                
                <div id="simple-modal-content" style="padding: 20px;">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #4285f4;"></i>
                        <p style="margin-top: 15px;">Carregando...</p>
                    </div>
                </div>
                
                <div style="
                    padding: 20px;
                    border-top: 1px solid #eee;
                    text-align: right;
                ">
                    <button id="simple-modal-close" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners para fechar
        modal.querySelector('#close-simple-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.querySelector('#simple-modal-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    },
    
    // Atualizar conteúdo do modal
    updateModalContent() {
        const content = document.getElementById('simple-modal-content');
        if (!content) return;
        
        if (!this.isInitialized) {
            content.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="color: #dc3545; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                    </div>
                    <h4>Google Drive não disponível</h4>
                    <p style="color: #666; margin-bottom: 20px;">
                        Não foi possível carregar o Google Drive.
                    </p>
                    <button id="retry-init" style="
                        background: #4285f4;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
            
            document.getElementById('retry-init').addEventListener('click', async () => {
                await this.loadGoogleAPI();
                this.updateModalContent();
            });
            
            return;
        }
        
        if (!this.isLoggedIn) {
            content.innerHTML = `
                <div style="text-align: center;">
                    <div style="color: #4285f4; margin-bottom: 20px;">
                        <i class="fab fa-google-drive" style="font-size: 64px;"></i>
                    </div>
                    <h4>Conectar ao Google Drive</h4>
                    <p style="color: #666; margin-bottom: 30px;">
                        Faça backup e restaure seus dados do Camarim Boutique
                    </p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: left;">
                        <p style="margin: 0 0 10px 0;"><strong>Benefícios:</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Backup seguro na nuvem</li>
                            <li>Acesso de qualquer dispositivo</li>
                            <li>Restauração de versões anteriores</li>
                            <li>15GB gratuitos com Google</li>
                        </ul>
                    </div>
                    
                    <button id="simple-login-btn" style="
                        background: #34a853;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-bottom: 20px;
                    ">
                        <i class="fab fa-google"></i> Conectar com Google
                    </button>
                    
                    <p style="font-size: 12px; color: #888;">
                        Será solicitado acesso apenas para arquivos criados por este aplicativo
                    </p>
                </div>
            `;
            
            document.getElementById('simple-login-btn').addEventListener('click', async () => {
                const btn = document.getElementById('simple-login-btn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                
                const success = await this.login();
                if (success) {
                    this.updateModalContent();
                } else {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fab fa-google"></i> Conectar com Google';
                }
            });
            
        } else {
            // Usuário logado - mostrar opções principais
            content.innerHTML = `
                <div>
                    <div style="
                        background: linear-gradient(135deg, #4285f4, #34a853);
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 18px; font-weight: bold;">${this.userEmail}</div>
                                <div style="font-size: 12px; opacity: 0.9;">Conectado ao Google Drive</div>
                            </div>
                            <button id="simple-logout-btn" style="
                                background: rgba(255,255,255,0.2);
                                color: white;
                                border: 1px solid rgba(255,255,255,0.3);
                                padding: 6px 12px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 12px;
                            ">
                                <i class="fas fa-sign-out-alt"></i> Sair
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px;">
                            <i class="fas fa-cloud-upload-alt"></i> Criar Backup
                        </h4>
                        <input type="text" id="backup-desc" placeholder="Descrição (opcional)" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            margin-bottom: 10px;
                        ">
                        <button id="create-simple-backup" style="
                            background: #34a853;
                            color: white;
                            border: none;
                            padding: 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            width: 100%;
                            font-size: 16px;
                        ">
                            <i class="fas fa-cloud-upload-alt"></i> Criar Backup Agora
                        </button>
                        <p style="font-size: 12px; color: #666; margin-top: 10px;">
                            Será salvo todo o sistema: produtos, vendas e configurações
                        </p>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 10px;">
                            <i class="fas fa-history"></i> Backups Disponíveis
                        </h4>
                        <div id="backups-list" style="
                            max-height: 300px;
                            overflow-y: auto;
                            border: 1px solid #eee;
                            border-radius: 4px;
                            padding: 10px;
                            background: #f8f9fa;
                        ">
                            <div style="text-align: center; padding: 20px; color: #666;">
                                <i class="fas fa-spinner fa-spin"></i> Carregando...
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Evento logout
            document.getElementById('simple-logout-btn').addEventListener('click', async () => {
                if (confirm('Deseja desconectar do Google Drive?')) {
                    await this.logout();
                    this.updateModalContent();
                }
            });
            
            // Evento criar backup
            document.getElementById('create-simple-backup').addEventListener('click', async () => {
                await this.handleCreateBackup();
            });
            
            // Carregar lista de backups
            this.loadBackupsList();
        }
    },
    
    // Carregar lista de backups
    async loadBackupsList() {
        const listContainer = document.getElementById('backups-list');
        if (!listContainer) return;
        
        try {
            // Primeiro, criar/obter a pasta
            const folderId = await this.getOrCreateFolder();
            
            // Listar arquivos
            const response = await gapi.client.drive.files.list({
                q: \`'\${folderId}' in parents and name contains 'camarim' and mimeType='application/json' and trashed=false\`,
                fields: 'files(id, name, createdTime, size)',
                orderBy: 'createdTime desc',
                pageSize: 10
            });
            
            const backups = response.result.files || [];
            
            if (backups.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <i class="fas fa-database" style="font-size: 32px; margin-bottom: 10px;"></i>
                        <p>Nenhum backup encontrado</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            backups.forEach(backup => {
                const date = new Date(backup.createdTime).toLocaleDateString('pt-BR');
                const time = new Date(backup.createdTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                const size = this.formatFileSize(parseInt(backup.size) || 0);
                
                html += `
                    <div style="
                        background: white;
                        border: 1px solid #dee2e6;
                        border-radius: 4px;
                        padding: 10px;
                        margin-bottom: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <div style="font-weight: bold; margin-bottom: 4px;">${backup.name}</div>
                            <div style="font-size: 11px; color: #666;">
                                ${date} ${time} • ${size}
                            </div>
                        </div>
                        <button class="restore-simple-btn" data-id="${backup.id}" style="
                            background: #4285f4;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">
                            <i class="fas fa-download"></i> Restaurar
                        </button>
                    </div>
                `;
            });
            
            listContainer.innerHTML = html;
            
            // Adicionar eventos aos botões de restaurar
            document.querySelectorAll('.restore-simple-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await this.handleRestoreBackup(e.target.dataset.id);
                });
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar backups:', error);
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar backups</p>
                    <button id="retry-backups" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Tentar Novamente</button>
                </div>
            `;
            
            document.getElementById('retry-backups').addEventListener('click', () => {
                this.loadBackupsList();
            });
        }
    },
    
    // Obter ou criar pasta
    async getOrCreateFolder() {
        try {
            // Procurar pasta existente
            const response = await gapi.client.drive.files.list({
                q: \`name='\${DRIVE_CONFIG.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false\`,
                fields: 'files(id)'
            });
            
            if (response.result.files.length > 0) {
                return response.result.files[0].id;
            }
            
            // Criar nova pasta
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: DRIVE_CONFIG.folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            
            return createResponse.result.id;
            
        } catch (error) {
            console.error('❌ Erro ao obter/criar pasta:', error);
            throw error;
        }
    },
    
    // Criar backup
    async handleCreateBackup() {
        try {
            const descInput = document.getElementById('backup-desc');
            const description = descInput ? descInput.value : '';
            
            if (!confirm('Criar backup dos dados atuais?')) {
                return;
            }
            
            const btn = document.getElementById('create-simple-backup');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
            
            // Obter dados do sistema
            const systemData = window.systemData;
            if (!systemData) {
                throw new Error('Dados do sistema não disponíveis');
            }
            
            // Gerar nome do arquivo
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = \`camarim-backup-\${timestamp}.json\`;
            
            // Preparar dados
            const backupData = {
                ...systemData,
                _backupMetadata: {
                    created: new Date().toISOString(),
                    description: description,
                    user: this.userEmail
                }
            };
            
            // Obter pasta
            const folderId = await this.getOrCreateFolder();
            
            // Criar arquivo
            await gapi.client.drive.files.create({
                resource: {
                    name: fileName,
                    parents: [folderId],
                    mimeType: 'application/json',
                    description: description
                },
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify(backupData, null, 2)
                }
            });
            
            alert('✅ Backup criado com sucesso!');
            
            // Limpar descrição
            if (descInput) descInput.value = '';
            
            // Recarregar lista
            await this.loadBackupsList();
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            alert(\`Erro ao criar backup: \${error.message}\`);
        } finally {
            const btn = document.getElementById('create-simple-backup');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Criar Backup Agora';
            }
        }
    },
    
    // Restaurar backup
    async handleRestoreBackup(fileId) {
        if (!confirm('⚠️ ATENÇÃO\n\nRestaurar este backup substituirá TODOS os dados atuais.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            // Baixar arquivo
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const backupData = response.result;
            
            // Validar
            if (!backupData.products || !Array.isArray(backupData.products)) {
                throw new Error('Arquivo de backup inválido');
            }
            
            // Remover metadados
            delete backupData._backupMetadata;
            
            // Atualizar sistema
            window.systemData = backupData;
            
            // Salvar localmente
            if (window.databaseManager && databaseManager.saveSystemData) {
                await databaseManager.saveSystemData(backupData);
            }
            
            // Atualizar interface
            if (window.loadData) loadData();
            if (window.updateDashboard) updateDashboard();
            if (window.updateProductsList) updateProductsList();
            if (window.updateSalesList) updateSalesList();
            
            alert('✅ Backup restaurado com sucesso!');
            
            // Fechar modal
            document.getElementById('simple-drive-modal').style.display = 'none';
            
        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
            alert(\`Erro ao restaurar backup: \${error.message}\`);
        }
    },
    
    // Formatar tamanho do arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// ============================================
// INICIALIZAÇÃO
// ============================================

// Esperar o sistema principal carregar
window.addEventListener('load', () => {
    console.log('📁 Inicializando Drive Backup System...');
    
    // Aguardar um pouco para garantir que o sistema principal carregou
    setTimeout(() => {
        CamarimDriveBackup.init();
    }, 2000);
});

// Expor para debug
window.CamarimDriveBackup = CamarimDriveBackup;

console.log('✅ Drive Backup System (simplificado) carregado');
