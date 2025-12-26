// ============================================
// SISTEMA DE BACKUP NO GOOGLE DRIVE - CAMARIM BOUTIQUE
// ============================================

// 🔒 IMPORTANTE: Substitua estas credenciais pelas suas do Google Cloud Console
// Acesse: https://console.cloud.google.com/ > Seu projeto > APIs & Serviços > Credenciais

const DRIVE_CONFIG = {
    clientId: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com', // 👈 Substituir
    apiKey: 'SUA_API_KEY_AQUI', // 👈 Substituir
    scope: 'https://www.googleapis.com/auth/drive.file',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    folderName: 'Camarim-Backup-System'
};

// Sistema principal
class DriveBackupSystem {
    constructor() {
        this.isInitialized = false;
        this.accessToken = null;
        this.folderId = null;
        this.backups = [];
        this.userEmail = null;
        this.initPromise = null;
    }

    // Inicialização única
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            console.log('🚀 Inicializando Google Drive Backup...');

            try {
                // 1. Carregar Google API
                await this.loadGoogleAPI();
                
                // 2. Inicializar cliente
                await gapi.client.init({
                    apiKey: DRIVE_CONFIG.apiKey,
                    clientId: DRIVE_CONFIG.clientId,
                    discoveryDocs: DRIVE_CONFIG.discoveryDocs,
                    scope: DRIVE_CONFIG.scope
                });

                console.log('✅ Google API inicializada');

                // 3. Verificar login existente
                const authInstance = gapi.auth2.getAuthInstance();
                if (authInstance.isSignedIn.get()) {
                    await this.handleSignedIn(authInstance.currentUser.get());
                }

                this.isInitialized = true;
                return true;

            } catch (error) {
                console.error('❌ Erro na inicialização:', error);
                this.isInitialized = false;
                throw error;
            }
        })();

        return this.initPromise;
    }

    // Carregar Google API dinamicamente
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi && window.gapi.load) {
                console.log('📦 Google API já carregada');
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
                gapi.load('client:auth2', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000
                });
            };

            script.onerror = () => {
                reject(new Error('Falha ao carregar Google API'));
            };

            document.head.appendChild(script);
        });
    }

    // Login no Google Drive
    async login() {
        try {
            console.log('🔑 Iniciando login...');
            
            if (!this.isInitialized) {
                await this.initialize();
            }

            const authInstance = gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn({
                prompt: 'select_account'
            });

            await this.handleSignedIn(user);
            
            console.log('✅ Login realizado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro no login:', error);
            
            // Verificar tipo de erro
            if (error.error === 'popup_closed_by_user') {
                throw new Error('Login cancelado pelo usuário');
            } else if (error.error === 'access_denied') {
                throw new Error('Acesso negado. Permita as permissões solicitadas.');
            } else {
                throw new Error(`Falha na conexão: ${error.error || error.message}`);
            }
        }
    }

    // Logout
    async logout() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            
            this.accessToken = null;
            this.folderId = null;
            this.userEmail = null;
            this.backups = [];
            
            console.log('✅ Logout realizado');
            return true;
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            throw error;
        }
    }

    // Manipular usuário logado
    async handleSignedIn(user) {
        const authResponse = user.getAuthResponse();
        this.accessToken = authResponse.access_token;
        this.userEmail = user.getBasicProfile().getEmail();
        
        console.log(`👤 Usuário: ${this.userEmail}`);
        
        // Configurar pasta de backups
        await this.setupBackupFolder();
        
        // Carregar backups existentes
        await this.listBackups();
    }

    // Criar/obter pasta de backups
    async setupBackupFolder() {
        try {
            console.log('📁 Configurando pasta de backups...');

            // Verificar se a pasta já existe
            const response = await gapi.client.drive.files.list({
                q: `name='${DRIVE_CONFIG.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.result.files.length > 0) {
                this.folderId = response.result.files[0].id;
                console.log(`✅ Pasta existente: ${this.folderId}`);
            } else {
                // Criar nova pasta
                const createResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: DRIVE_CONFIG.folderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        description: 'Backups do Sistema Camarim Boutique'
                    },
                    fields: 'id'
                });

                this.folderId = createResponse.result.id;
                console.log(`✅ Nova pasta criada: ${this.folderId}`);
            }

            return this.folderId;

        } catch (error) {
            console.error('❌ Erro ao configurar pasta:', error);
            throw error;
        }
    }

    // Listar backups
    async listBackups() {
        if (!this.folderId) {
            throw new Error('Pasta não configurada');
        }

        try {
            console.log('📋 Listando backups...');

            const response = await gapi.client.drive.files.list({
                q: `'${this.folderId}' in parents and name contains 'backup-camarim' and mimeType='application/json' and trashed=false`,
                fields: 'files(id, name, createdTime, modifiedTime, size, description)',
                orderBy: 'createdTime desc',
                pageSize: 20
            });

            this.backups = (response.result.files || []).map(file => ({
                id: file.id,
                name: file.name,
                description: file.description || '',
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                size: parseInt(file.size) || 0,
                readableSize: this.formatFileSize(parseInt(file.size) || 0)
            }));

            console.log(`✅ ${this.backups.length} backups encontrados`);
            return this.backups;

        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            throw error;
        }
    }

    // Criar novo backup
    async createBackup(data, description = '') {
        if (!this.folderId) {
            throw new Error('Pasta não configurada');
        }

        try {
            console.log('💾 Criando backup...');

            // Gerar nome único
            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .replace('T', '_')
                .slice(0, 19);
            
            const fileName = `backup-camarim-${timestamp}.json`;

            // Adicionar metadados
            const backupData = {
                ...data,
                _backupMetadata: {
                    created: new Date().toISOString(),
                    system: 'Camarim Boutique',
                    version: '1.0',
                    description: description,
                    user: this.userEmail,
                    productCount: data.products?.length || 0,
                    saleCount: data.sales?.length || 0
                }
            };

            const fileContent = JSON.stringify(backupData, null, 2);

            // Criar arquivo
            const response = await gapi.client.drive.files.create({
                resource: {
                    name: fileName,
                    mimeType: 'application/json',
                    parents: [this.folderId],
                    description: description || `Backup automático ${timestamp}`
                },
                media: {
                    mimeType: 'application/json',
                    body: fileContent
                },
                fields: 'id, name, createdTime'
            });

            console.log(`✅ Backup criado: ${response.result.name}`);

            // Atualizar lista
            await this.listBackups();

            return {
                success: true,
                id: response.result.id,
                name: response.result.name,
                createdTime: new Date(response.result.createdTime)
            };

        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            throw error;
        }
    }

    // Restaurar backup
    async restoreBackup(fileId) {
        try {
            console.log(`🔄 Restaurando backup ${fileId}...`);

            // Baixar arquivo
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const backupData = response.result;

            // Validar estrutura
            if (!backupData.products || !Array.isArray(backupData.products)) {
                throw new Error('Arquivo de backup inválido');
            }

            // Remover metadados
            delete backupData._backupMetadata;

            console.log(`✅ Backup restaurado: ${backupData.products.length} produtos`);

            return backupData;

        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
            throw error;
        }
    }

    // Excluir backup
    async deleteBackup(fileId) {
        try {
            await gapi.client.drive.files.delete({
                fileId: fileId
            });

            console.log('🗑️ Backup excluído');

            // Atualizar lista
            await this.listBackups();

            return true;

        } catch (error) {
            console.error('❌ Erro ao excluir backup:', error);
            throw error;
        }
    }

    // Obter informações de armazenamento
    async getStorageInfo() {
        try {
            const response = await gapi.client.drive.about.get({
                fields: 'storageQuota, user'
            });

            const quota = response.result.storageQuota;
            const total = parseInt(quota.limit) || 0;
            const used = parseInt(quota.usage) || 0;
            const inDrive = parseInt(quota.usageInDrive) || 0;

            return {
                total,
                used,
                inDrive,
                free: total - used,
                usedPercentage: total > 0 ? (used / total * 100).toFixed(1) : 0
            };

        } catch (error) {
            console.error('❌ Erro ao obter informações de armazenamento:', error);
            return null;
        }
    }

    // Utilitários
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoggedIn: this.accessToken !== null,
            userEmail: this.userEmail,
            folderId: this.folderId,
            backupsCount: this.backups.length,
            hasValidConfig: DRIVE_CONFIG.clientId !== 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'
        };
    }
}

// ============================================
// INTEGRAÇÃO COM O SISTEMA CAMARIM
// ============================================

// Instância global
const driveBackup = new DriveBackupSystem();
window.CamarimDriveBackup = driveBackup;

// Interface do usuário
class DriveBackupUI {
    constructor() {
        this.modal = null;
        this.initialized = false;
    }

    // Inicializar interface
    async initialize() {
        if (this.initialized) return;

        console.log('🎨 Inicializando interface do Drive Backup...');

        // Adicionar botão no header
        this.addHeaderButton();

        // Adicionar estilos
        this.addStyles();

        // Inicializar sistema
        try {
            await driveBackup.initialize();
            this.updateUI();
        } catch (error) {
            console.warn('⚠️ Drive Backup não disponível:', error.message);
        }

        this.initialized = true;
    }

    // Adicionar botão no header
    addHeaderButton() {
        // Aguardar header carregar
        const checkHeader = setInterval(() => {
            const headerButtons = document.querySelector('.header-buttons');
            if (headerButtons && !document.getElementById('drive-backup-header-btn')) {
                clearInterval(checkHeader);

                const button = document.createElement('button');
                button.id = 'drive-backup-header-btn';
                button.className = 'btn btn-primary';
                button.innerHTML = '<i class="fab fa-google-drive"></i> Drive';
                button.title = 'Google Drive Backup';
                button.style.marginLeft = '10px';

                button.addEventListener('click', () => this.showMainModal());

                headerButtons.appendChild(button);
                this.headerButton = button;
            }
        }, 500);
    }

    // Atualizar interface baseada no status
    updateUI() {
        if (!this.headerButton) return;

        const status = driveBackup.getStatus();

        if (status.isLoggedIn) {
            this.headerButton.className = 'btn btn-success';
            this.headerButton.innerHTML = `<i class="fab fa-google-drive"></i> ${status.userEmail?.split('@')[0] || 'Drive'}`;
        } else {
            this.headerButton.className = 'btn btn-primary';
            this.headerButton.innerHTML = '<i class="fab fa-google-drive"></i> Drive';
        }
    }

    // Mostrar modal principal
    async showMainModal() {
        // Criar modal
        if (!this.modal) {
            this.createModal();
        }

        // Atualizar conteúdo
        await this.updateModalContent();

        // Mostrar modal
        this.modal.classList.add('active');
    }

    // Criar modal
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'drive-backup-modal';
        this.modal.className = 'modal';
        
        this.modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                <div class="modal-header">
                    <h3><i class="fab fa-google-drive"></i> Google Drive Backup</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="drive-modal-body">
                    <div class="text-center" style="padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                        <p>Carregando...</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Event listeners
        this.modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.modal.classList.remove('active');
            });
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.classList.remove('active');
            }
        });
    }

    // Atualizar conteúdo do modal
    async updateModalContent() {
        const body = document.getElementById('drive-modal-body');
        if (!body) return;

        const status = driveBackup.getStatus();

        let content = '';

        if (!status.isInitialized) {
            content = this.renderLoading();
        } else if (!status.isLoggedIn) {
            content = this.renderLogin();
        } else {
            content = await this.renderMainContent();
        }

        body.innerHTML = content;
        this.attachModalEvents();
    }

    // Tela de login
    renderLogin() {
        return `
            <div class="login-section">
                <div class="text-center" style="margin-bottom: 30px;">
                    <i class="fab fa-google-drive" style="font-size: 60px; color: #4285f4; margin-bottom: 20px;"></i>
                    <h4>Conectar ao Google Drive</h4>
                    <p class="text-muted">Faça backup e restaure seus dados do Camarim Boutique</p>
                </div>

                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Benefícios:</strong>
                    <ul style="margin: 10px 0 10px 20px;">
                        <li>Backup seguro na nuvem</li>
                        <li>Acesse de qualquer dispositivo</li>
                        <li>Restauração de versões anteriores</li>
                        <li>15GB gratuitos com Google</li>
                    </ul>
                </div>

                <div class="text-center" style="margin-top: 30px;">
                    <button id="drive-login-btn" class="btn btn-lg btn-success">
                        <i class="fab fa-google"></i> Conectar com Google
                    </button>
                </div>

                <div class="text-center" style="margin-top: 20px; font-size: 12px; color: #666;">
                    <p>Será solicitado acesso apenas para arquivos criados por este aplicativo</p>
                </div>
            </div>
        `;
    }

    // Conteúdo principal
    async renderMainContent() {
        const status = driveBackup.getStatus();
        const storageInfo = await driveBackup.getStorageInfo();
        const backups = await driveBackup.listBackups();

        return `
            <div class="drive-main-content">
                <!-- Cabeçalho -->
                <div class="drive-header">
                    <div class="user-info">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <strong>${status.userEmail}</strong>
                            <div class="text-small">Conectado ao Google Drive</div>
                        </div>
                        <button id="drive-logout-btn" class="btn btn-small btn-danger">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>

                    <!-- Armazenamento -->
                    ${storageInfo ? `
                    <div class="storage-info">
                        <div class="storage-label">
                            <i class="fas fa-hdd"></i> Armazenamento
                        </div>
                        <div class="storage-bar">
                            <div class="storage-fill" style="width: ${storageInfo.usedPercentage}%"></div>
                        </div>
                        <div class="storage-stats">
                            ${(storageInfo.inDrive / 1024 / 1024 / 1024).toFixed(2)} GB de 
                            ${(storageInfo.total / 1024 / 1024 / 1024).toFixed(0)} GB
                            (${storageInfo.usedPercentage}%)
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Criar Backup -->
                <div class="section-card">
                    <h4><i class="fas fa-cloud-upload-alt"></i> Criar Novo Backup</h4>
                    <div class="form-group">
                        <label for="backup-description">Descrição (opcional):</label>
                        <input type="text" id="backup-description" class="form-control" 
                               placeholder="Ex: Backup semanal, antes de alterações...">
                    </div>
                    <button id="create-backup-btn" class="btn btn-success btn-block">
                        <i class="fas fa-cloud-upload-alt"></i> Criar Backup
                    </button>
                    <div class="text-small text-muted mt-10">
                        <i class="fas fa-info-circle"></i>
                        Será salvo todo o sistema: produtos, vendas e configurações
                    </div>
                </div>

                <!-- Lista de Backups -->
                <div class="section-card">
                    <div class="section-header">
                        <h4><i class="fas fa-history"></i> Backups Disponíveis</h4>
                        <button id="refresh-backups-btn" class="btn btn-small btn-info">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>

                    ${backups.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-database" style="font-size: 40px; color: #ccc; margin-bottom: 15px;"></i>
                        <p>Nenhum backup encontrado</p>
                        <p class="text-small">Crie seu primeiro backup!</p>
                    </div>
                    ` : `
                    <div class="backups-list">
                        ${backups.map((backup, index) => this.renderBackupItem(backup, index)).join('')}
                    </div>
                    `}
                </div>
            </div>
        `;
    }

    // Item de backup
    renderBackupItem(backup, index) {
        const date = backup.createdTime.toLocaleDateString('pt-BR');
        const time = backup.createdTime.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const isRecent = index === 0;

        return `
            <div class="backup-item ${isRecent ? 'recent' : ''}">
                <div class="backup-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="backup-info">
                    <div class="backup-name">${backup.name}</div>
                    <div class="backup-meta">
                        <span><i class="far fa-calendar"></i> ${date} ${time}</span>
                        <span><i class="fas fa-weight-hanging"></i> ${backup.readableSize}</span>
                        ${backup.description ? `<span><i class="far fa-comment"></i> ${backup.description}</span>` : ''}
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-success restore-btn" 
                            data-id="${backup.id}"
                            data-name="${backup.name}">
                        <i class="fas fa-download"></i> Restaurar
                    </button>
                    ${!isRecent ? `
                    <button class="btn btn-danger delete-btn" 
                            data-id="${backup.id}"
                            data-name="${backup.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Tela de carregamento
    renderLoading() {
        return `
            <div class="text-center" style="padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #4285f4;"></i>
                <p style="margin-top: 15px;">Inicializando Drive Backup...</p>
            </div>
        `;
    }

    // Anexar eventos do modal
    attachModalEvents() {
        // Login
        const loginBtn = document.getElementById('drive-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                try {
                    loginBtn.disabled = true;
                    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';

                    await driveBackup.login();
                    this.updateUI();
                    await this.updateModalContent();

                } catch (error) {
                    alert(`Erro: ${error.message}`);
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="fab fa-google"></i> Conectar com Google';
                }
            });
        }

        // Logout
        const logoutBtn = document.getElementById('drive-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Deseja desconectar do Google Drive?')) {
                    await driveBackup.logout();
                    this.updateUI();
                    await this.updateModalContent();
                }
            });
        }

        // Criar backup
        const createBackupBtn = document.getElementById('create-backup-btn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', async () => {
                try {
                    const description = document.getElementById('backup-description')?.value || '';
                    
                    if (!confirm('Criar backup dos dados atuais?')) return;

                    createBackupBtn.disabled = true;
                    createBackupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

                    const systemData = window.systemData;
                    if (!systemData) {
                        throw new Error('Dados do sistema não disponíveis');
                    }

                    const result = await driveBackup.createBackup(systemData, description);
                    
                    alert(`✅ Backup criado com sucesso!\n\nArquivo: ${result.name}`);
                    
                    // Limpar descrição
                    const descInput = document.getElementById('backup-description');
                    if (descInput) descInput.value = '';

                    await this.updateModalContent();

                } catch (error) {
                    alert(`❌ Erro: ${error.message}`);
                } finally {
                    createBackupBtn.disabled = false;
                    createBackupBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Criar Backup';
                }
            });
        }

        // Atualizar lista
        const refreshBtn = document.getElementById('refresh-backups-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spin');
                await this.updateModalContent();
                setTimeout(() => refreshBtn.classList.remove('spin'), 500);
            });
        }

        // Restaurar backup
        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fileId = e.target.closest('.restore-btn').dataset.id;
                const fileName = e.target.closest('.restore-btn').dataset.name;

                if (!confirm(`⚠️ ATENÇÃO\n\nRestaurar backup "${fileName}"?\n\nIsso substituirá TODOS os dados atuais do sistema.`)) {
                    return;
                }

                try {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restaurando...';

                    const backupData = await driveBackup.restoreBackup(fileId);

                    // Atualizar sistema principal
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
                    this.modal.classList.remove('active');

                } catch (error) {
                    alert(`❌ Erro: ${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-download"></i> Restaurar';
                }
            });
        });

        // Excluir backup
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fileId = e.target.closest('.delete-btn').dataset.id;
                const fileName = e.target.closest('.delete-btn').dataset.name;

                if (!confirm(`Excluir permanentemente o backup "${fileName}"?\n\nEsta ação não pode ser desfeita.`)) {
                    return;
                }

                try {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                    await driveBackup.deleteBackup(fileId);
                    await this.updateModalContent();

                } catch (error) {
                    alert(`❌ Erro: ${error.message}`);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-trash"></i>';
                }
            });
        });
    }

    // Adicionar estilos
    addStyles() {
        const styles = `
        <style>
            /* Drive Backup Styles */
            .drive-header {
                background: linear-gradient(135deg, #4285f4, #34a853);
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }

            .user-info i {
                font-size: 40px;
            }

            .storage-info {
                background: rgba(255, 255, 255, 0.2);
                padding: 15px;
                border-radius: 6px;
            }

            .storage-bar {
                height: 10px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 5px;
                overflow: hidden;
                margin: 10px 0;
            }

            .storage-fill {
                height: 100%;
                background: white;
                border-radius: 5px;
                transition: width 0.3s;
            }

            .section-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #dee2e6;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .backups-list {
                max-height: 400px;
                overflow-y: auto;
            }

            .backup-item {
                display: flex;
                align-items: center;
                padding: 15px;
                background: white;
                border-radius: 6px;
                margin-bottom: 10px;
                border: 1px solid #dee2e6;
                transition: all 0.2s;
            }

            .backup-item:hover {
                border-color: #4285f4;
                box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
            }

            .backup-item.recent {
                border-left: 4px solid #34a853;
            }

            .backup-icon {
                background: #4285f4;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                flex-shrink: 0;
            }

            .backup-info {
                flex: 1;
                min-width: 0;
            }

            .backup-name {
                font-weight: 500;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .backup-meta {
                display: flex;
                gap: 15px;
                font-size: 12px;
                color: #666;
                flex-wrap: wrap;
            }

            .backup-meta span {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .backup-actions {
                display: flex;
                gap: 10px;
                flex-shrink: 0;
            }

            .empty-state {
                text-align: center;
                padding: 40px;
                color: #6c757d;
            }

            .text-small {
                font-size: 12px;
            }

            .mt-10 { margin-top: 10px; }
            .mt-20 { margin-top: 20px; }

            /* Botão com animação de rotação */
            .spin {
                animation: spin 0.5s linear;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Responsivo */
            @media (max-width: 768px) {
                .backup-item {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .backup-icon {
                    margin-right: 0;
                    margin-bottom: 10px;
                    align-self: flex-start;
                }
                
                .backup-actions {
                    margin-top: 10px;
                    justify-content: flex-end;
                }
                
                .backup-meta {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Instância da UI
const driveBackupUI = new DriveBackupUI();

// Inicializar quando o sistema principal estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('📁 Drive Backup: Aguardando sistema principal...');
    
    // Esperar um pouco para o sistema principal carregar
    setTimeout(() => {
        driveBackupUI.initialize();
    }, 1500);
});

// Expor funções globais para debug
window.debugDriveBackup = {
    getStatus: () => driveBackup.getStatus(),
    listBackups: () => driveBackup.listBackups(),
    showModal: () => driveBackupUI.showMainModal()
};

console.log('✅ Drive Backup System carregado');
