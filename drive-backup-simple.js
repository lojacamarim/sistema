// GOOGLE DRIVE BACKUP - VERSÃO SUPER SIMPLIFICADA COM DriveFS
// ADICIONE NO HTML: <script src="https://cdn.jsdelivr.net/npm/drivefs@1.0.0/dist/drivefs.min.js"></script>

class DriveBackupSimple {
    constructor() {
        this.config = {
            clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
            apiKey: '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'
        };
        
        this.driveFS = null;
        this.isAuthenticated = false;
        this.isLoading = false;
        
        // Iniciar automaticamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 1000);
        }
    }
    
    async init() {
        console.log('🚀 Iniciando DriveFS Backup...');
        
        try {
            // Adicionar interface primeiro
            this.addToInterface();
            
            // Tentar carregar DriveFS de várias fontes
            await this.loadDriveFSScript();
            
            // Inicializar DriveFS
            this.initializeDriveFS();
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showFallbackUI();
        }
    }
    
    async loadDriveFSScript() {
        return new Promise((resolve, reject) => {
            // Verificar se já está carregado
            if (typeof DriveFS !== 'undefined') {
                console.log('✅ DriveFS já está carregado');
                resolve();
                return;
            }
            
            console.log('📦 Tentando carregar DriveFS...');
            
            // Tentar múltiplas fontes
            const sources = [
                'https://cdn.jsdelivr.net/npm/drivefs@1.0.0/dist/drivefs.min.js',
                'https://unpkg.com/drivefs@1.0.0/dist/drivefs.min.js',
                'https://rawcdn.githack.com/simenkid/drivefs/v1.0.0/dist/drivefs.min.js'
            ];
            
            let currentSource = 0;
            
            const tryNextSource = () => {
                if (currentSource >= sources.length) {
                    console.error('❌ Todas as fontes do DriveFS falharam');
                    reject(new Error('Não foi possível carregar o DriveFS'));
                    return;
                }
                
                const source = sources[currentSource];
                console.log(`📦 Tentando fonte ${currentSource + 1}/${sources.length}: ${source}`);
                
                const script = document.createElement('script');
                script.src = source;
                script.async = true;
                script.defer = true;
                
                script.onload = () => {
                    console.log(`✅ DriveFS carregado da fonte ${currentSource + 1}`);
                    setTimeout(() => resolve(), 500); // Dar tempo para inicializar
                };
                
                script.onerror = () => {
                    console.warn(`⚠️ Falha ao carregar da fonte ${currentSource + 1}`);
                    currentSource++;
                    setTimeout(tryNextSource, 500);
                };
                
                document.head.appendChild(script);
            };
            
            tryNextSource();
            
            // Timeout geral
            setTimeout(() => {
                if (typeof DriveFS === 'undefined') {
                    console.warn('⚠️ Timeout ao carregar DriveFS, continuando sem ele');
                    reject(new Error('Timeout ao carregar DriveFS'));
                }
            }, 10000);
        });
    }
    
    initializeDriveFS() {
        try {
            if (typeof DriveFS === 'undefined') {
                throw new Error('DriveFS não está disponível');
            }
            
            this.driveFS = new DriveFS({
                clientId: this.config.clientId,
                apiKey: this.config.apiKey,
                appId: 'camarim-backup-system-v1'
            });
            
            console.log('✅ DriveFS inicializado com sucesso');
            
            // Verificar se já está autenticado
            const token = localStorage.getItem('drivefs_token');
            if (token) {
                this.isAuthenticated = true;
                this.driveFS.setToken(token);
                console.log('✅ Token existente encontrado');
            }
            
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar DriveFS:', error);
            this.showFallbackUI();
        }
    }
    
    showFallbackUI() {
        const content = document.getElementById('drivefs-backup-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4 class="mb-3">Backup Alternativo</h4>
                <p class="text-muted mb-4">
                    O sistema de backup automático não está disponível no momento.<br>
                    Use o backup manual abaixo:
                </p>
                
                <div class="card mb-3">
                    <div class="card-body">
                        <h5><i class="fas fa-download mr-2"></i>Exportar Dados</h5>
                        <p class="small text-muted">Salve um arquivo localmente no seu computador</p>
                        <button class="btn btn-primary btn-block" onclick="window.driveBackup.exportLocal()">
                            <i class="fas fa-file-export"></i> Exportar Backup (.json)
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-body">
                        <h5><i class="fas fa-upload mr-2"></i>Importar Dados</h5>
                        <p class="small text-muted">Restaurar dados de um arquivo salvo anteriormente</p>
                        <div class="custom-file mb-3">
                            <input type="file" class="custom-file-input" id="backup-file-input" accept=".json">
                            <label class="custom-file-label" for="backup-file-input">Escolher arquivo .json</label>
                        </div>
                        <button class="btn btn-success btn-block" onclick="window.driveBackup.importLocal()">
                            <i class="fas fa-file-import"></i> Importar Backup
                        </button>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
        
        // Configurar input de arquivo
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const fileName = e.target.files[0] ? e.target.files[0].name : 'Escolher arquivo .json';
                const label = this.nextElementSibling;
                label.textContent = fileName;
            });
        }
    }
    
    addToInterface() {
        // Esperar pelo sistema principal
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryAdd = () => {
            const databaseView = document.getElementById('database-view');
            
            if (databaseView && !document.getElementById('drivefs-backup-section')) {
                console.log('✅ Adicionando interface do DriveFS...');
                
                const driveSection = document.createElement('div');
                driveSection.id = 'drivefs-backup-section';
                driveSection.className = 'mt-4';
                driveSection.innerHTML = `
                    <div class="card">
                        <div class="card-header" style="background: linear-gradient(135deg, #4285F4, #34A853);">
                            <h4 class="mb-0 text-white">
                                <i class="fab fa-google-drive mr-2"></i> 
                                Backup no Google Drive
                                <span id="drive-status" class="badge badge-light ml-2">Carregando...</span>
                            </h4>
                        </div>
                        <div class="card-body">
                            <div id="drivefs-backup-content">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="sr-only">Carregando...</span>
                                    </div>
                                    <p class="mt-2">Inicializando backup na nuvem...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Inserir após a seção de backup local
                const localBackupSection = databaseView.querySelector('.form-group:last-child');
                if (localBackupSection) {
                    localBackupSection.parentNode.insertBefore(driveSection, localBackupSection.nextSibling);
                } else {
                    databaseView.appendChild(driveSection);
                }
                
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryAdd, 500);
            }
        };
        
        tryAdd();
    }
    
    updateUI() {
        const content = document.getElementById('drivefs-backup-content');
        const status = document.getElementById('drive-status');
        
        if (!content) return;
        
        if (status) {
            if (this.driveFS && this.isAuthenticated) {
                status.className = 'badge badge-success ml-2';
                status.textContent = 'Conectado';
            } else if (this.driveFS) {
                status.className = 'badge badge-warning ml-2';
                status.textContent = 'Pronto';
            } else {
                status.className = 'badge badge-secondary ml-2';
                status.textContent = 'Carregando...';
            }
        }
        
        content.innerHTML = '';
        
        if (this.isLoading) {
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
        
        if (this.isAuthenticated) {
            content.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-check-circle fa-lg mr-2"></i>
                        <span>Conectado ao Google Drive</span>
                        <button class="btn btn-sm btn-warning ml-auto" onclick="window.driveBackup.logout()">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
                
                <div class="text-center mb-4">
                    <button class="btn btn-primary btn-lg mr-2" onclick="window.driveBackup.createBackup()">
                        <i class="fas fa-cloud-upload-alt"></i> Criar Backup
                    </button>
                    <button class="btn btn-info btn-lg mr-2" onclick="window.driveBackup.listBackups()">
                        <i class="fas fa-list"></i> Ver Backups
                    </button>
                </div>
                
                <div id="drivefs-backup-list" class="mt-3">
                    <div class="text-center py-3">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="sr-only">Carregando...</span>
                        </div>
                        <span class="ml-2">Preparando lista...</span>
                    </div>
                </div>
            `;
            
            // Carregar lista inicial
            setTimeout(() => this.listBackups(), 500);
            
        } else {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="fab fa-google-drive fa-4x mb-4" style="color: #4285F4;"></i>
                    <h4 class="mb-3">Backup Automático no Google Drive</h4>
                    <p class="text-muted mb-4">
                        Salve seus dados com segurança na nuvem.<br>
                        Acesso rápido e fácil com apenas 1 clique!
                    </p>
                    
                    <button class="btn btn-lg btn-success mb-3" onclick="window.driveBackup.login()" 
                            style="background: linear-gradient(135deg, #4285F4, #34A853); border: none; padding: 12px 30px;">
                        <i class="fab fa-google mr-2"></i> Conectar com Google
                    </button>
                    
                    <div class="alert alert-light border mt-3">
                        <i class="fas fa-info-circle text-info mr-2"></i>
                        <small>Você será redirecionado para o login do Google. Seus dados ficam armazenados apenas na sua conta.</small>
                    </div>
                    
                    <hr class="my-4">
                    
                    <h5 class="mb-3">Ou use backup local:</h5>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <button class="btn btn-outline-primary btn-block" onclick="window.driveBackup.exportLocal()">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                        </div>
                        <div class="col-md-6 mb-3">
                            <button class="btn btn-outline-success btn-block" onclick="window.driveBackup.showImport()">
                                <i class="fas fa-upload"></i> Importar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    async login() {
        try {
            if (!this.driveFS) {
                this.showAlert('DriveFS não está carregado. Tente recarregar a página.', 'error');
                return;
            }
            
            this.isLoading = true;
            this.updateUI();
            
            console.log('🔑 Fazendo login com DriveFS...');
            
            // Login com DriveFS (popup do Google)
            await this.driveFS.signIn();
            
            // Salvar token
            const token = this.driveFS.getToken();
            localStorage.setItem('drivefs_token', token);
            
            this.isAuthenticated = true;
            this.isLoading = false;
            
            console.log('✅ Login realizado com sucesso');
            
            this.updateUI();
            this.showAlert('✅ Conectado ao Google Drive com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.isLoading = false;
            this.updateUI();
            
            let errorMsg = error.message || 'Erro desconhecido';
            
            // Mensagens amigáveis
            if (errorMsg.includes('popup')) {
                errorMsg = 'O popup de login foi bloqueado. Por favor, permita popups para este site.';
            } else if (errorMsg.includes('auth') || errorMsg.includes('access_denied')) {
                errorMsg = 'Acesso negado. Por favor, permita as permissões solicitadas.';
            }
            
            this.showAlert('❌ Erro ao conectar: ' + errorMsg, 'error');
        }
    }
    
    logout() {
        try {
            if (this.driveFS) {
                this.driveFS.signOut();
            }
            
            localStorage.removeItem('drivefs_token');
            this.isAuthenticated = false;
            
            console.log('✅ Logout realizado');
            this.updateUI();
            this.showAlert('Desconectado do Google Drive', 'info');
            
        } catch (error) {
            console.error('❌ Erro no logout:', error);
        }
    }
    
    async createBackup() {
        try {
            if (!this.isAuthenticated) {
                this.showAlert('Por favor, conecte-se primeiro ao Google Drive', 'warning');
                this.login();
                return;
            }
            
            this.isLoading = true;
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
            
            console.log(`💾 Criando backup: ${fileName}`);
            
            // Upload com DriveFS (SIMPLES!)
            await this.driveFS.uploadFile(fileName, fileContent, {
                folder: 'Camarim-Backups',
                description: `Backup do sistema Camarim - ${new Date().toLocaleString('pt-BR')}`
            });
            
            this.isLoading = false;
            this.updateUI();
            
            console.log('✅ Backup criado com sucesso');
            
            this.showAlert(
                `✅ Backup criado com sucesso!\n\n` +
                `Arquivo: ${fileName}\n` +
                `Data: ${new Date().toLocaleString('pt-BR')}\n\n` +
                `Seus dados estão seguros no Google Drive!`,
                'success'
            );
            
            // Atualizar lista
            setTimeout(() => this.listBackups(), 1000);
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            this.isLoading = false;
            this.updateUI();
            
            let errorMsg = error.message || 'Erro desconhecido';
            
            if (errorMsg.includes('auth') || errorMsg.includes('token')) {
                errorMsg = 'Sessão expirada. Por favor, faça login novamente.';
                this.logout();
            }
            
            this.showAlert(`❌ Erro ao criar backup:\n${errorMsg}`, 'error');
        }
    }
    
    async listBackups() {
        const container = document.getElementById('drivefs-backup-list');
        if (!container) return;
        
        try {
            if (!this.isAuthenticated) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> Conecte-se para ver backups
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <span class="ml-2">Buscando backups...</span>
                </div>
            `;
            
            // Listar arquivos com DriveFS
            const files = await this.driveFS.listFiles({
                query: "name contains 'camarim-backup-' and trashed=false",
                orderBy: 'createdTime desc',
                maxResults: 10
            });
            
            if (!files || files.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-cloud-upload-alt"></i> 
                        Nenhum backup encontrado. Crie seu primeiro backup!
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <h6 class="border-bottom pb-2 mb-3">Backups Disponíveis (${files.length})</h6>
                <div class="list-group">
                    ${files.map((file, index) => `
                    <div class="list-group-item ${index === 0 ? 'border-success' : ''}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-1">
                                    <i class="fas fa-file-archive mr-2 ${index === 0 ? 'text-success' : 'text-primary'}"></i>
                                    <strong>${this.formatFileName(file.name)}</strong>
                                    ${index === 0 ? '<span class="badge badge-success ml-2">Mais recente</span>' : ''}
                                </div>
                                <div class="small text-muted">
                                    <i class="far fa-calendar-alt mr-1"></i>
                                    ${new Date(file.createdTime).toLocaleString('pt-BR')}
                                    ${file.size ? ` • <i class="fas fa-hdd mr-1"></i>${this.formatBytes(file.size)}` : ''}
                                </div>
                                ${file.description ? `<div class="small text-muted mt-1"><em>${file.description}</em></div>` : ''}
                            </div>
                            <div class="btn-group ml-3">
                                <button class="btn btn-sm btn-success" onclick="window.driveBackup.restoreBackup('${file.id}')" 
                                        title="Restaurar este backup">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="window.driveBackup.downloadBackup('${file.id}', '${file.name}')" 
                                        title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                                ${index !== 0 ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="window.driveBackup.deleteBackup('${file.id}')" 
                                        title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
                
                <div class="text-center mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.driveBackup.listBackups()">
                        <i class="fas fa-sync"></i> Atualizar Lista
                    </button>
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar backups: ${error.message || 'Erro desconhecido'}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-warning" onclick="window.driveBackup.listBackups()">
                            <i class="fas fa-sync"></i> Tentar novamente
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    async restoreBackup(fileId) {
        if (!confirm('⚠️ ATENÇÃO!\n\nEsta ação substituirá TODOS os dados atuais pelo conteúdo do backup.\n\nDeseja continuar?')) {
            return;
        }
        
        try {
            this.isLoading = true;
            this.updateUI();
            
            console.log(`🔄 Restaurando backup: ${fileId}`);
            
            // Download com DriveFS
            const fileData = await this.driveFS.downloadFile(fileId);
            const backupData = JSON.parse(fileData);
            
            // Validar dados
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('Arquivo de backup inválido');
            }
            
            // Restaurar dados no sistema
            window.systemData = backupData;
            
            // Salvar no localStorage
            localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
            
            this.isLoading = false;
            this.updateUI();
            
            this.showAlert(
                `✅ Backup restaurado com sucesso!\n\n` +
                `• Produtos: ${backupData.products?.length || 0}\n` +
                `• Vendas: ${backupData.sales?.length || 0}\n\n` +
                `A página será recarregada para aplicar as mudanças.`,
                'success'
            );
            
            // Recarregar página
            setTimeout(() => {
                if (confirm('Deseja recarregar a página agora para aplicar as mudanças?')) {
                    location.reload();
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Erro ao restaurar:', error);
            this.isLoading = false;
            this.updateUI();
            this.showAlert(`❌ Erro ao restaurar backup:\n${error.message}`, 'error');
        }
    }
    
    async downloadBackup(fileId, fileName) {
        try {
            this.isLoading = true;
            this.updateUI();
            
            const fileData = await this.driveFS.downloadFile(fileId);
            
            // Criar link de download
            const blob = new Blob([fileData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.isLoading = false;
            this.updateUI();
            
            this.showAlert(`✅ Backup "${fileName}" baixado com sucesso!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao baixar:', error);
            this.isLoading = false;
            this.updateUI();
            this.showAlert(`❌ Erro ao baixar backup:\n${error.message}`, 'error');
        }
    }
    
    async deleteBackup(fileId) {
        if (!confirm('Tem certeza que deseja excluir este backup?')) {
            return;
        }
        
        try {
            await this.driveFS.deleteFile(fileId);
            
            this.showAlert('✅ Backup excluído com sucesso', 'success');
            this.listBackups();
            
        } catch (error) {
            console.error('❌ Erro ao excluir:', error);
            this.showAlert(`❌ Erro ao excluir backup:\n${error.message}`, 'error');
        }
    }
    
    // Métodos de backup local (fallback)
    exportLocal() {
        try {
            const systemData = window.systemData || {};
            
            if (Object.keys(systemData).length === 0) {
                this.showAlert('Nenhum dado para exportar', 'warning');
                return;
            }
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const fileName = `camarim-backup-${timestamp}.json`;
            const fileContent = JSON.stringify(systemData, null, 2);
            
            // Criar link de download
            const blob = new Blob([fileContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert(`✅ Backup "${fileName}" exportado com sucesso!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar:', error);
            this.showAlert(`❌ Erro ao exportar backup: ${error.message}`, 'error');
        }
    }
    
    showImport() {
        const content = document.getElementById('drivefs-backup-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="text-center py-4">
                <h4 class="mb-3"><i class="fas fa-file-import text-success mr-2"></i>Importar Backup</h4>
                
                <div class="card">
                    <div class="card-body">
                        <p class="text-muted mb-4">
                            Selecione um arquivo de backup (.json) para restaurar seus dados.
                        </p>
                        
                        <div class="custom-file mb-4">
                            <input type="file" class="custom-file-input" id="local-backup-file" accept=".json">
                            <label class="custom-file-label" for="local-backup-file">Escolher arquivo .json</label>
                        </div>
                        
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-secondary" onclick="window.driveBackup.updateUI()">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                            <button class="btn btn-success" onclick="window.driveBackup.importLocal()">
                                <i class="fas fa-upload"></i> Importar Backup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Configurar input de arquivo
        const fileInput = document.getElementById('local-backup-file');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const fileName = e.target.files[0] ? e.target.files[0].name : 'Escolher arquivo .json';
                const label = this.nextElementSibling;
                label.textContent = fileName;
            });
        }
    }
    
    importLocal() {
        const fileInput = document.getElementById('local-backup-file');
        
        if (!fileInput || !fileInput.files[0]) {
            this.showAlert('Por favor, selecione um arquivo .json', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (!backupData || typeof backupData !== 'object') {
                    throw new Error('Arquivo de backup inválido');
                }
                
                if (!confirm('⚠️ ATENÇÃO!\n\nEsta ação substituirá TODOS os dados atuais.\n\nDeseja continuar?')) {
                    return;
                }
                
                // Restaurar dados
                window.systemData = backupData;
                localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
                
                this.showAlert(
                    `✅ Backup importado com sucesso!\n\n` +
                    `• Produtos: ${backupData.products?.length || 0}\n` +
                    `• Vendas: ${backupData.sales?.length || 0}\n\n` +
                    `Recarregue a página para aplicar as mudanças.`,
                    'success'
                );
                
            } catch (error) {
                console.error('❌ Erro ao importar:', error);
                this.showAlert(`❌ Erro ao importar backup: ${error.message}`, 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    formatFileName(name) {
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
            // Criar alerta simples
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
            alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertDiv.innerHTML = `
                <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> 
                ${message.replace(/\n/g, '<br>')}
                <button type="button" class="close" onclick="this.parentElement.remove()">
                    <span>&times;</span>
                </button>
            `;
            
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.remove();
                }
            }, 5000);
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
        if (!window.driveBackup) {
            console.log('🚀 Criando instância do DriveFS Backup...');
            window.driveBackup = new DriveBackupSimple();
        }
    }, 2000);
});

console.log('✅ DriveFS Backup carregado');
