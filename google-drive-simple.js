// GOOGLE DRIVE BACKUP - VERSÃO TESTADA E FUNCIONAL

class GoogleDriveBackupSimple {
    constructor() {
        this.config = {
            clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
            apiKey: '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',
            scope: 'https://www.googleapis.com/auth/drive.file'
        };
        
        this.state = {
            isAuthenticated: false,
            accessToken: null,
            isLoading: false,
            tokenClient: null
        };
        
        // Iniciar quando a página carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 1000);
        }
    }
    
    async init() {
        console.log('🚀 Iniciando Google Drive Backup...');
        
        try {
            // Carregar APIs
            await this.loadGoogleScripts();
            
            // Adicionar interface
            setTimeout(() => this.addToInterface(), 1500);
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
        }
    }
    
    loadGoogleScripts() {
        return new Promise((resolve, reject) => {
            // Verificar se já carregou
            if (window.gapi && window.google) {
                console.log('✅ APIs já carregadas');
                this.initializeApis();
                resolve();
                return;
            }
            
            let scriptsLoaded = 0;
            const totalScripts = 2;
            
            // Função para verificar quando ambos scripts carregarem
            const checkAllLoaded = () => {
                scriptsLoaded++;
                if (scriptsLoaded === totalScripts) {
                    console.log('✅ Ambos scripts carregados');
                    setTimeout(() => {
                        this.initializeApis();
                        resolve();
                    }, 500);
                }
            };
            
            // 1. Carregar Google API (gapi)
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            gapiScript.onload = () => {
                console.log('✅ GAPI carregado');
                checkAllLoaded();
            };
            gapiScript.onerror = () => {
                console.error('❌ Erro ao carregar GAPI');
                reject(new Error('Falha ao carregar GAPI'));
            };
            document.head.appendChild(gapiScript);
            
            // 2. Carregar Google Identity Services
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            gisScript.onload = () => {
                console.log('✅ Google Identity Services carregado');
                checkAllLoaded();
            };
            gisScript.onerror = () => {
                console.error('❌ Erro ao carregar GIS');
                reject(new Error('Falha ao carregar GIS'));
            };
            document.head.appendChild(gisScript);
        });
    }
    
   initializeApis() {
    // Inicializar GAPI
    if (window.gapi && window.gapi.load) {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: this.config.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                
                console.log('✅ GAPI inicializada');
                
                // Verificar token existente
                this.checkExistingToken();
                
            } catch (error) {
                console.error('Erro ao inicializar GAPI:', error);
                this.showAlert('Erro ao inicializar API do Google. Recarregue a página.', 'error');
            }
        });
    }
    
    // Inicializar Google Identity Services (CRÍTICO - deve ser feito DEPOIS do script carregar)
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        this.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.clientId,
            scope: this.config.scope,
            callback: (response) => {
                console.log('🔑 Callback do token chamado:', response);
                
                if (response.error) {
                    console.error('Erro no token:', response);
                    this.state.isLoading = false;
                    this.updateUI();
                    return;
                }
                
                // Token recebido com sucesso
                this.state.accessToken = response.access_token;
                this.state.isAuthenticated = true;
                this.state.isLoading = false;
                
                // Salvar token
                localStorage.setItem('google_drive_token', response.access_token);
                localStorage.setItem('google_drive_token_expiry', (Date.now() + 3600000).toString());
                
                console.log('✅ Token salvo:', response.access_token.substring(0, 20) + '...');
                
                this.updateUI();
                this.showAlert('Conectado ao Google Drive com sucesso!', 'success');
                
                // Carregar lista de backups
                this.loadBackupList();
            }
        });
        
        console.log('✅ Token Client inicializado');
    } else {
        console.error('❌ Google Identity Services não disponível');
    }
}
    
    checkExistingToken() {
        const token = localStorage.getItem('google_drive_token');
        const expiry = localStorage.getItem('google_drive_token_expiry');
        
        if (token && expiry && Date.now() < parseInt(expiry)) {
            console.log('✅ Token existente encontrado');
            this.state.accessToken = token;
            this.state.isAuthenticated = true;
            this.updateUI();
        } else {
            // Token expirado ou não existe
            if (token) {
                localStorage.removeItem('google_drive_token');
                localStorage.removeItem('google_drive_token_expiry');
            }
            console.log('⚠️ Nenhum token válido encontrado');
        }
    }
    
    addToInterface() {
        // Esperar pelo sistema principal
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryAdd = () => {
            const databaseView = document.getElementById('database-view');
            
            if (databaseView && !document.getElementById('simple-drive-backup-section')) {
                console.log('✅ Adicionando interface do Drive...');
                
                const driveSection = document.createElement('div');
                driveSection.id = 'simple-drive-backup-section';
                driveSection.className = 'mt-4';
                driveSection.innerHTML = `
                    <div class="card">
                        <div class="card-header" style="background-color: #f8f9fa;">
                            <h4 class="mb-0">
                                <i class="fab fa-google-drive text-primary"></i> 
                                <span style="color: #4285F4;">Google Drive</span> Backup
                            </h4>
                        </div>
                        <div class="card-body">
                            <div id="drive-backup-content">
                                <div class="text-center py-3">
                                    <i class="fas fa-spinner fa-spin"></i> Inicializando...
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Inserir após a seção de backup local, se existir
                const localBackupSection = databaseView.querySelector('.form-group:last-child');
                if (localBackupSection) {
                    localBackupSection.parentNode.insertBefore(driveSection, localBackupSection.nextSibling);
                } else {
                    databaseView.appendChild(driveSection);
                }
                
                this.updateUI();
                
            } else if (attempts < maxAttempts) {
                attempts++;
                console.log(`⏳ Aguardando sistema principal (tentativa ${attempts}/${maxAttempts})...`);
                setTimeout(tryAdd, 500);
            } else {
                console.warn('⚠️ Não foi possível adicionar a interface');
            }
        };
        
        tryAdd();
    }
    
    updateUI() {
        const content = document.getElementById('drive-backup-content');
        if (!content) return;
        
        // Limpar conteúdo anterior
        content.innerHTML = '';
        
        if (this.state.isLoading) {
            content.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <p class="mt-2">Processando...</p>
                </div>
            `;
            return;
        }
        
        if (this.state.isAuthenticated) {
            content.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-check-circle fa-lg mr-2"></i>
                        <span>Conectado ao Google Drive</span>
                        <button class="btn btn-sm btn-warning ml-auto" onclick="window.driveBackupSimple.logout()">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
                
                <div class="text-center mb-4">
                    <button class="btn btn-primary btn-lg mr-2" onclick="window.driveBackupSimple.createBackup()">
                        <i class="fas fa-cloud-upload-alt"></i> Criar Backup
                    </button>
                    <button class="btn btn-info btn-lg" onclick="window.driveBackupSimple.refreshBackupList()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
                
                <div id="backup-list-container">
                    <div class="text-center py-3">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="sr-only">Carregando...</span>
                        </div>
                        <span class="ml-2">Carregando backups...</span>
                    </div>
                </div>
            `;
            
            // Carregar lista de backups
            setTimeout(() => this.loadBackupList(), 500);
            
        } else {
            content.innerHTML = `
                <div class="text-center py-3">
                    <i class="fab fa-google-drive fa-4x mb-3" style="color: #4285F4;"></i>
                    <h5 class="mb-3">Backup em Nuvem</h5>
                    <p class="text-muted mb-4">
                        Salve seus dados com segurança no Google Drive.<br>
                        Acesso de qualquer lugar, a qualquer hora.
                    </p>
                    
                    <button class="btn btn-success btn-lg mb-3" onclick="window.driveBackupSimple.login()" 
                            style="background-color: #4285F4; border-color: #4285F4;">
                        <i class="fab fa-google mr-2"></i> Conectar ao Google Drive
                    </button>
                    
                    <div class="mt-3 small text-muted">
                        <i class="fas fa-shield-alt mr-1"></i>
                        Seus dados são privados e só você tem acesso
                    </div>
                    
                    <div class="alert alert-light border mt-4" style="font-size: 0.85rem;">
                        <i class="fas fa-info-circle text-info mr-1"></i>
                        <strong>Como funciona:</strong> Conecte sua conta Google para criar backups automáticos.
                        Seus dados são armazenados em uma pasta privada no seu Drive.
                    </div>
                </div>
            `;
        }
    }
    
    login() {
        console.log('🔄 Iniciando login...');
        
        if (!this.state.tokenClient) {
            console.error('❌ Token Client não inicializado');
            this.showAlert('API do Google não está pronta. Tente recarregar a página.', 'error');
            return;
        }
        
        this.state.isLoading = true;
        this.updateUI();
        
        console.log('🔑 Solicitando token...');
        
        // IMPORTANTE: Chamar requestAccessToken corretamente
        try {
            this.state.tokenClient.requestAccessToken();
        } catch (error) {
            console.error('❌ Erro ao solicitar token:', error);
            this.state.isLoading = false;
            this.updateUI();
            this.showAlert('Erro ao conectar: ' + error.message, 'error');
        }
    }
    
    logout() {
        console.log('🔄 Fazendo logout...');
        
        if (this.state.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
            try {
                google.accounts.oauth2.revoke(this.state.accessToken, () => {
                    console.log('✅ Token revogado');
                });
            } catch (error) {
                console.warn('⚠️ Erro ao revogar token:', error);
            }
        }
        
        // Limpar estado
        this.state.isAuthenticated = false;
        this.state.accessToken = null;
        this.state.isLoading = false;
        
        // Limpar localStorage
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_drive_token_expiry');
        
        console.log('✅ Logout completo');
        this.updateUI();
        this.showAlert('Desconectado do Google Drive', 'info');
    }
    
    async createBackup() {
        console.log('💾 Criando backup...');
        
        if (!this.state.isAuthenticated) {
            this.showAlert('Conecte-se primeiro ao Google Drive', 'warning');
            this.login();
            return;
        }
        
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            // Obter dados do sistema
            const systemData = window.systemData || {};
            
            if (Object.keys(systemData).length === 0) {
                throw new Error('Nenhum dado encontrado para fazer backup');
            }
            
            // Criar nome do arquivo
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const fileName = `camarim-backup-${timestamp}.json`;
            const fileContent = JSON.stringify(systemData, null, 2);
            
            console.log(`📁 Criando arquivo: ${fileName}`);
            
            // 1. Encontrar ou criar pasta
            const folderId = await this.getOrCreateFolder();
            
            // 2. Criar metadados
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId],
                description: `Backup do sistema Camarim - ${new Date().toLocaleString('pt-BR')}`
            };
            
            // 3. Fazer upload usando GAPI (mais confiável)
            const boundary = '-------' + Date.now().toString(16);
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelimiter = "\r\n--" + boundary + "--";
            
            const multipartRequestBody = 
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                fileContent +
                closeDelimiter;
            
            const request = gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: {
                    uploadType: 'multipart',
                    fields: 'id,name,createdTime'
                },
                headers: {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    'Authorization': 'Bearer ' + this.state.accessToken
                },
                body: multipartRequestBody
            });
            
            const response = await request;
            const file = response.result;
            
            console.log('✅ Backup criado:', file.id);
            
            this.state.isLoading = false;
            this.updateUI();
            
            this.showAlert(`✅ Backup criado com sucesso!\nArquivo: ${fileName}\nData: ${new Date(file.createdTime).toLocaleString('pt-BR')}`, 'success');
            
            // Recarregar lista
            setTimeout(() => this.loadBackupList(), 1000);
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            this.state.isLoading = false;
            this.updateUI();
            
            let errorMsg = error.message || 'Erro desconhecido';
            
            // Tratar erros comuns
            if (errorMsg.includes('Invalid Credentials') || errorMsg.includes('token')) {
                errorMsg = 'Token expirado. Por favor, faça login novamente.';
                this.logout();
            }
            
            this.showAlert(`❌ Erro ao criar backup:\n${errorMsg}`, 'error');
        }
    }
    
async getOrCreateFolder() {
    try {
        // Verificar se GAPI está inicializado
        if (!gapi.client || !gapi.client.drive) {
            throw new Error('API do Drive não inicializada');
        }
        
        // Buscar pasta existente
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='Camarim-Backups' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        });
        
        // Verificar resposta
        if (!response || !response.result) {
            throw new Error('Resposta inválida da API');
        }
        
        if (response.result.files && response.result.files.length > 0) {
            console.log('✅ Pasta encontrada:', response.result.files[0].id);
            return response.result.files[0].id;
        }
        
        // Criar nova pasta
        console.log('📁 Criando pasta...');
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: 'Camarim-Backups',
                mimeType: 'application/vnd.google-apps.folder',
                description: 'Backups automáticos do sistema Camarim'
            },
            fields: 'id'
        });
        
        if (!createResponse || !createResponse.result) {
            throw new Error('Erro ao criar pasta');
        }
        
        console.log('✅ Pasta criada:', createResponse.result.id);
        return createResponse.result.id;
        
    } catch (error) {
        console.error('❌ Erro na pasta:', error);
        
        // Tentar novamente se for erro de autenticação
        if (error.status === 401 || error.message?.includes('auth')) {
            console.log('🔑 Token expirado, fazendo logout...');
            this.logout();
        }
        
        throw error;
    }
}
    
async loadBackupList() {
    const container = document.getElementById('backup-list-container');
    if (!container) return;
    
    try {
        if (!this.state.isAuthenticated) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Conecte-se para ver backups
                </div>
            `;
            return;
        }
        
        // Verificar se o token ainda é válido
        if (!this.state.accessToken) {
            this.logout();
            return;
        }
        
        // Primeiro obter a pasta
        const folderId = await this.getOrCreateFolder();
        
        // Fazer a requisição com tratamento de erro melhorado
        let response;
        try {
            response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and name contains 'camarim-backup-' and mimeType='application/json' and trashed=false`,
                fields: 'files(id, name, createdTime, size, description)',
                orderBy: 'createdTime desc',
                pageSize: 10
            });
        } catch (apiError) {
            console.error('❌ Erro na API do Drive:', apiError);
            
            // Verificar se o token expirou
            if (apiError.status === 401 || apiError.message?.includes('token') || apiError.message?.includes('auth')) {
                console.log('🔑 Token expirado, fazendo logout...');
                this.logout();
                return;
            }
            
            throw apiError;
        }
        
        // Verificar se a resposta é válida
        if (!response || !response.result) {
            throw new Error('Resposta inválida da API do Drive');
        }
        
        const backups = response.result.files || [];
        
        if (backups.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-cloud-upload-alt"></i> 
                    Nenhum backup encontrado. Crie seu primeiro backup!
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <h6 class="border-bottom pb-2 mb-3">Backups Disponíveis (${backups.length})</h6>
            <div class="list-group">
                ${backups.map((backup, index) => `
                <div class="list-group-item ${index === 0 ? 'border-primary' : ''}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                <i class="fas fa-file-alt mr-2 text-primary"></i>
                                <strong>${this.formatFileName(backup.name)}</strong>
                                ${index === 0 ? '<span class="badge badge-success ml-2">Mais recente</span>' : ''}
                            </div>
                            <div class="small text-muted mb-1">
                                <i class="far fa-calendar-alt mr-1"></i>
                                ${new Date(backup.createdTime).toLocaleString('pt-BR')}
                                ${backup.size ? ` • <i class="fas fa-hdd mr-1"></i>${this.formatBytes(backup.size)}` : ''}
                            </div>
                            ${backup.description ? `<div class="small text-muted"><em>${backup.description}</em></div>` : ''}
                        </div>
                        <div class="ml-3">
                            <button class="btn btn-sm btn-success" onclick="window.driveBackupSimple.restoreBackup('${backup.id}')" 
                                    title="Restaurar este backup">
                                <i class="fas fa-undo"></i>
                            </button>
                            ${index !== 0 ? `
                            <button class="btn btn-sm btn-danger ml-1" onclick="window.driveBackupSimple.deleteBackup('${backup.id}')" 
                                    title="Excluir backup antigo">
                                <i class="fas fa-trash"></i>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Erro ao carregar backups:', error);
        
        let errorMessage = error.message || 'Erro desconhecido';
        
        // Mensagens mais amigáveis
        if (errorMessage.includes('Network Error')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (errorMessage.includes('auth') || errorMessage.includes('token')) {
            errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
            this.logout();
        } else if (errorMessage.includes('quota')) {
            errorMessage = 'Cota do Google Drive excedida.';
        }
        
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> 
                Erro ao carregar backups: ${errorMessage}
                <div class="mt-2">
                    <button class="btn btn-sm btn-warning" onclick="window.driveBackupSimple.refreshBackupList()">
                        <i class="fas fa-sync"></i> Tentar novamente
                    </button>
                </div>
            </div>
        `;
    }
}
    
    refreshBackupList() {
        console.log('🔄 Atualizando lista...');
        this.loadBackupList();
        this.showAlert('Lista de backups atualizada', 'info');
    }
    
    async restoreBackup(fileId) {
        if (!confirm('⚠️ ATENÇÃO!\n\nEsta ação substituirá TODOS os dados atuais pelo conteúdo do backup.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            console.log(`🔄 Restaurando backup: ${fileId}`);
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const backupData = JSON.parse(response.body);
            
            // Validar dados
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('Arquivo de backup inválido');
            }
            
            // Restaurar dados no sistema
            window.systemData = backupData;
            
            // Salvar no localStorage
            localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
            
            this.state.isLoading = false;
            this.updateUI();
            
            this.showAlert(
                `✅ Backup restaurado com sucesso!\n\n` +
                `• Produtos: ${backupData.products?.length || 0}\n` +
                `• Vendas: ${backupData.sales?.length || 0}\n\n` +
                `A página será recarregada em 3 segundos...`, 
                'success'
            );
            
            // Recarregar página para aplicar mudanças
            setTimeout(() => {
                if (confirm('Deseja recarregar a página agora para aplicar as mudanças?')) {
                    location.reload();
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ Erro ao restaurar:', error);
            this.state.isLoading = false;
            this.updateUI();
            this.showAlert(`❌ Erro ao restaurar backup:\n${error.message}`, 'error');
        }
    }
    
    async deleteBackup(fileId) {
        if (!confirm('Tem certeza que deseja excluir este backup?')) {
            return;
        }
        
        try {
            await gapi.client.drive.files.delete({
                fileId: fileId
            });
            
            this.showAlert('✅ Backup excluído com sucesso', 'success');
            this.loadBackupList();
            
        } catch (error) {
            console.error('❌ Erro ao excluir:', error);
            this.showAlert(`❌ Erro ao excluir: ${error.message}`, 'error');
        }
    }
    
    formatFileName(name) {
        // Formatar nome para exibição amigável
        return name
            .replace('camarim-backup-', '')
            .replace('.json', '')
            .replace('T', ' ')
            .replace(/-/g, ':')
            .slice(0, 16);
    }
    
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    showAlert(message, type = 'info') {
        // Usar sistema de alerta existente ou criar um simples
        if (typeof showAlert === 'function') {
            showAlert(message, type);
        } else if (typeof alert === 'function') {
            alert(message);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Aguardar sistema principal carregar
window.addEventListener('load', () => {
    setTimeout(() => {
        // Criar instância global
        if (!window.driveBackupSimple) {
            console.log('🚀 Criando instância do Google Drive Backup...');
            window.driveBackupSimple = new GoogleDriveBackupSimple();
        }
    }, 2000);
});

// Para debugging: verificar se a classe está carregando
console.log('✅ GoogleDriveBackupSimple.js carregado');
