// ============================================
// GOOGLE DRIVE BACKUP - VERSÃO SUPER SIMPLIFICADA
// PRONTA PARA USAR - COPIE E COLE
// ============================================

class GoogleDriveBackup {
    constructor() {
        this.config = {
            clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
            apiKey: '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',
            scope: 'https://www.googleapis.com/auth/drive.file'
        };
        
        this.state = {
            isAuthenticated: false,
            accessToken: null,
            isLoading: false
        };
        
        this.init();
    }
    
    async init() {
        // Carregar APIs do Google automaticamente
        await this.loadGoogleScripts();
        
        // Adicionar botão na interface
        this.addToInterface();
    }
    
    loadGoogleScripts() {
        return new Promise((resolve) => {
            // Carregar GAPI (Google API)
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                gapi.load('client', () => {
                    gapi.client.init({
                        apiKey: this.config.apiKey,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    }).then(() => {
                        console.log('✅ Google API carregada');
                        this.checkExistingSession();
                        resolve();
                    });
                });
            };
            document.head.appendChild(gapiScript);
            
            // Carregar Google Identity Services
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = () => {
                console.log('✅ Google Identity Services carregado');
                resolve();
            };
            document.head.appendChild(gisScript);
        });
    }
    
    checkExistingSession() {
        // Verificar se já está logado
        const token = localStorage.getItem('google_drive_token');
        if (token) {
            this.state.accessToken = token;
            this.state.isAuthenticated = true;
            this.updateUI();
        }
    }
    
    addToInterface() {
        // Adicionar seção de backup na interface do banco de dados
        setTimeout(() => {
            const databaseView = document.getElementById('database-view');
            if (databaseView && !document.getElementById('simple-drive-backup')) {
                const driveSection = document.createElement('div');
                driveSection.id = 'simple-drive-backup';
                driveSection.className = 'card mt-4';
                driveSection.innerHTML = `
                    <div class="card-header">
                        <h4><i class="fab fa-google-drive"></i> Backup no Google Drive</h4>
                    </div>
                    <div class="card-body" id="drive-backup-content">
                        <div class="text-center">
                            <i class="fas fa-spinner fa-spin"></i> Carregando...
                        </div>
                    </div>
                `;
                databaseView.appendChild(driveSection);
                
                this.updateUI();
            }
        }, 2000);
    }
    
    updateUI() {
        const content = document.getElementById('drive-backup-content');
        if (!content) return;
        
        if (this.state.isLoading) {
            content.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin"></i> Processando...
                </div>
            `;
            return;
        }
        
        if (this.state.isAuthenticated) {
            content.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> Conectado ao Google Drive
                </div>
                
                <div class="text-center mb-3">
                    <button class="btn btn-primary mr-2" onclick="window.driveBackup.createBackup()">
                        <i class="fas fa-save"></i> Criar Backup Agora
                    </button>
                    <button class="btn btn-warning" onclick="window.driveBackup.logout()">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </button>
                </div>
                
                <div id="backup-list" class="mt-3">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin"></i> Buscando backups...
                    </div>
                </div>
            `;
            
            // Carregar lista de backups
            this.loadBackupList();
        } else {
            content.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Salve seus backups na nuvem do Google Drive
                </div>
                
                <div class="text-center">
                    <button class="btn btn-success btn-lg" onclick="window.driveBackup.login()">
                        <i class="fab fa-google"></i> Conectar ao Google Drive
                    </button>
                    
                    <div class="mt-3 small text-muted">
                        <i class="fas fa-shield-alt"></i> Seus dados são privados e seguros
                    </div>
                </div>
            `;
        }
    }
    
    login() {
        this.state.isLoading = true;
        this.updateUI();
        
        // Usar o novo Google Identity Services para login simples
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.config.clientId,
            scope: this.config.scope,
            callback: (response) => {
                if (response.error) {
                    console.error('Erro no login:', response);
                    alert('Erro ao conectar: ' + response.error);
                    this.state.isLoading = false;
                    this.updateUI();
                    return;
                }
                
                this.state.accessToken = response.access_token;
                this.state.isAuthenticated = true;
                this.state.isLoading = false;
                
                // Salvar token
                localStorage.setItem('google_drive_token', response.access_token);
                
                this.updateUI();
                alert('✅ Conectado ao Google Drive com sucesso!');
            },
        });
        
        tokenClient.requestAccessToken();
    }
    
    logout() {
        if (this.state.accessToken) {
            google.accounts.oauth2.revoke(this.state.accessToken);
        }
        
        localStorage.removeItem('google_drive_token');
        this.state.isAuthenticated = false;
        this.state.accessToken = null;
        
        this.updateUI();
        alert('Desconectado do Google Drive');
    }
    
    async createBackup() {
        if (!this.state.isAuthenticated) {
            alert('Primeiro conecte-se ao Google Drive');
            this.login();
            return;
        }
        
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            // Obter dados do sistema
            const systemData = window.systemData || {};
            
            // Criar nome do arquivo
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const fileName = `camarim-backup-${timestamp}.json`;
            const fileContent = JSON.stringify(systemData, null, 2);
            
            // 1. Encontrar ou criar pasta
            const folderId = await this.getOrCreateFolder();
            
            // 2. Criar arquivo
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId],
                description: 'Backup do sistema Camarim'
            };
            
            // Usar Fetch API (mais simples que GAPI)
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', new Blob([fileContent], {type: 'application/json'}));
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.state.accessToken}`
                },
                body: form
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            this.state.isLoading = false;
            this.updateUI();
            
            alert(`✅ Backup criado com sucesso!\n\nArquivo: ${fileName}\nData: ${new Date().toLocaleString('pt-BR')}`);
            
            // Recarregar lista
            this.loadBackupList();
            
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            this.state.isLoading = false;
            this.updateUI();
            alert(`❌ Erro ao criar backup:\n${error.message}`);
        }
    }
    
    async getOrCreateFolder() {
        try {
            // Buscar pasta existente
            const response = await gapi.client.drive.files.list({
                q: "mimeType='application/vnd.google-apps.folder' and name='Camarim-Backups' and trashed=false",
                fields: 'files(id)',
                spaces: 'drive'
            });
            
            if (response.result.files && response.result.files.length > 0) {
                return response.result.files[0].id;
            }
            
            // Criar nova pasta
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: 'Camarim-Backups',
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            
            return createResponse.result.id;
            
        } catch (error) {
            console.error('Erro na pasta:', error);
            throw error;
        }
    }
    
    async loadBackupList() {
        const listContainer = document.getElementById('backup-list');
        if (!listContainer) return;
        
        try {
            const folderId = await this.getOrCreateFolder();
            
            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and name contains 'camarim-backup-' and trashed=false`,
                fields: 'files(id, name, createdTime, size)',
                orderBy: 'createdTime desc',
                pageSize: 10
            });
            
            const backups = response.result.files || [];
            
            if (backups.length === 0) {
                listContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-cloud"></i> Nenhum backup encontrado. Crie o primeiro!
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = `
                <h5>Seus Backups (${backups.length})</h5>
                <div class="list-group">
                    ${backups.map(backup => `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${this.formatFileName(backup.name)}</strong>
                                <div class="small text-muted">
                                    ${new Date(backup.createdTime).toLocaleString('pt-BR')}
                                    ${backup.size ? ` • ${this.formatBytes(backup.size)}` : ''}
                                </div>
                            </div>
                            <button class="btn btn-sm btn-success" onclick="window.driveBackup.restoreBackup('${backup.id}')" title="Restaurar">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </div>
                    `).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error('Erro ao carregar backups:', error);
            listContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Erro ao carregar backups
                </div>
            `;
        }
    }
    
    async restoreBackup(fileId) {
        if (!confirm('ATENÇÃO: Isso substituirá TODOS os dados atuais. Deseja continuar?')) {
            return;
        }
        
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const backupData = JSON.parse(response.body);
            
            // Restaurar dados
            window.systemData = backupData;
            
            // Salvar no localStorage
            localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
            
            this.state.isLoading = false;
            this.updateUI();
            
            alert('✅ Backup restaurado com sucesso! Recarregando página...');
            
            // Recarregar página para aplicar mudanças
            setTimeout(() => location.reload(), 1500);
            
        } catch (error) {
            console.error('Erro ao restaurar:', error);
            this.state.isLoading = false;
            this.updateUI();
            alert(`❌ Erro ao restaurar backup:\n${error.message}`);
        }
    }
    
    formatFileName(name) {
        return name.replace('camarim-backup-', '').replace('.json', '');
    }
    
    formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// ============================================
// 2. COMO USAR - APENAS 1 LINHA DE CÓDIGO
// ============================================

// Adicione esta linha única no final do seu arquivo JavaScript principal:

const driveBackup = new GoogleDriveBackup();

// ============================================
// 3. O SISTEMA FAZ TUDO AUTOMATICAMENTE:
// ============================================
// ✅ Carrega as APIs do Google automaticamente
// ✅ Adiciona a interface no "Gerenciar Banco de Dados"
// ✅ Faz login/logout com 1 clique
// ✅ Cria backups com 1 clique
// ✅ Lista todos os backups automaticamente
// ✅ Restaura backups com confirmação
// ============================================

// NÃO PRECISA FAZER MAIS NADA!
// O sistema já estará funcionando quando a página carregar.
