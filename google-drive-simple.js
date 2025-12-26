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
            tokenClient: null,
            gapiReady: false,
            gisReady: false
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
    
    // MÉTODO MELHORADO: Esperar API do Drive carregar
    async waitForGapi() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 50 tentativas de 200ms = 10 segundos
            
            const checkGapi = () => {
                attempts++;
                
                // Verificação mais abrangente da API
                if (window.gapi && 
                    window.gapi.client && 
                    typeof window.gapi.client.init === 'function' &&
                    window.gapi.client.drive &&
                    window.gapi.client.drive.files &&
                    typeof window.gapi.client.drive.files.list === 'function') {
                    
                    console.log('✅ GAPI Drive API totalmente carregada após', attempts, 'tentativas');
                    this.state.gapiReady = true;
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.error('❌ GAPI não carregou completamente. Estado atual:', {
                        gapi: !!window.gapi,
                        gapiClient: !!window.gapi?.client,
                        gapiClientInit: typeof window.gapi?.client?.init,
                        gapiDrive: !!window.gapi?.client?.drive,
                        gapiDriveFiles: !!window.gapi?.client?.drive?.files,
                        gapiDriveFilesList: typeof window.gapi?.client?.drive?.files?.list
                    });
                    
                    // Tentar inicializar manualmente
                    if (window.gapi && window.gapi.load) {
                        console.log('🔄 Tentando carregar GAPI manualmente...');
                        gapi.load('client', () => {
                            gapi.client.init({
                                apiKey: this.config.apiKey,
                                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                            }).then(() => {
                                console.log('✅ GAPI inicializada manualmente');
                                this.state.gapiReady = true;
                                resolve();
                            }).catch(initError => {
                                console.error('❌ Erro na inicialização manual:', initError);
                                reject(new Error('GAPI não conseguiu inicializar: ' + initError.message));
                            });
                        });
                        return;
                    }
                    
                    reject(new Error('Timeout: GAPI Drive API não carregou após 10 segundos'));
                    return;
                }
                
                setTimeout(checkGapi, 200);
            };
            
            checkGapi();
        });
    }
    
    loadGoogleScripts() {
        return new Promise((resolve, reject) => {
            // Verificar se já carregou
            if (window.gapi && window.google && window.google.accounts) {
                console.log('✅ APIs já carregadas');
                this.state.gapiReady = true;
                this.state.gisReady = true;
                this.initializeApis();
                resolve();
                return;
            }
            
            let gapiLoaded = false;
            let gisLoaded = false;
            
            // Função para verificar quando ambos scripts carregarem
            const checkAllLoaded = () => {
                if (gapiLoaded && gisLoaded) {
                    console.log('✅ Ambos scripts carregados');
                    setTimeout(() => {
                        this.initializeApis();
                        resolve();
                    }, 1000); // Dar mais tempo para scripts inicializarem
                }
            };
            
            // 1. Carregar Google API (gapi)
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            gapiScript.onload = () => {
                console.log('✅ GAPI script carregado');
                gapiLoaded = true;
                checkAllLoaded();
            };
            gapiScript.onerror = (error) => {
                console.error('❌ Erro ao carregar GAPI:', error);
                reject(new Error('Falha ao carregar GAPI'));
            };
            document.head.appendChild(gapiScript);
            
            // 2. Carregar Google Identity Services
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            gisScript.onload = () => {
                console.log('✅ Google Identity Services script carregado');
                gisLoaded = true;
                checkAllLoaded();
            };
            gisScript.onerror = (error) => {
                console.error('❌ Erro ao carregar GIS:', error);
                reject(new Error('Falha ao carregar GIS'));
            };
            document.head.appendChild(gisScript);
            
            // Timeout para scripts
            setTimeout(() => {
                if (!gapiLoaded || !gisLoaded) {
                    console.warn('⚠️ Scripts demorando para carregar, continuando...');
                    if (gapiLoaded || gisLoaded) {
                        checkAllLoaded();
                    }
                }
            }, 5000);
        });
    }
    
    initializeApis() {
        console.log('🔄 Inicializando APIs do Google...');
        
        // Inicializar GAPI
        if (window.gapi && window.gapi.load) {
            console.log('🔧 Inicializando GAPI client...');
            
            // Carregar o cliente primeiro
            gapi.load('client', () => {
                console.log('🔧 GAPI client carregado, inicializando...');
                
                gapi.client.init({
                    apiKey: this.config.apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                }).then(() => {
                    console.log('✅ GAPI client inicializada com sucesso');
                    console.log('🔍 APIs disponíveis:', Object.keys(gapi.client));
                    
                    // Verificar se drive API está disponível
                    if (gapi.client.drive) {
                        console.log('✅ Drive API disponível');
                        this.state.gapiReady = true;
                    } else {
                        console.warn('⚠️ Drive API não disponível, tentando carregar...');
                        // Tentar carregar especificamente a API do Drive
                        gapi.client.load('drive', 'v3').then(() => {
                            console.log('✅ Drive API carregada manualmente');
                            this.state.gapiReady = true;
                        }).catch(loadError => {
                            console.error('❌ Erro ao carregar Drive API:', loadError);
                        });
                    }
                    
                    // Verificar token existente
                    this.checkExistingToken();
                    
                }).catch(initError => {
                    console.error('❌ Erro ao inicializar GAPI client:', initError);
                    this.showAlert('Erro ao inicializar API do Google. Recarregue a página.', 'error');
                });
            });
        } else {
            console.error('❌ GAPI não disponível para inicialização');
        }
        
        // Inicializar Google Identity Services
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            console.log('🔧 Inicializando Google Identity Services...');
            
            this.state.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.config.clientId,
                scope: this.config.scope,
                callback: (response) => {
                    console.log('🔑 Callback do token chamado');
                    
                    if (response.error) {
                        console.error('Erro no token:', response.error);
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
                    
                    console.log('✅ Token salvo com sucesso');
                    
                    this.state.gisReady = true;
                    this.updateUI();
                    this.showAlert('Conectado ao Google Drive com sucesso!', 'success');
                    
                    // Aguardar API do Drive carregar ANTES de tentar usar
                    setTimeout(async () => {
                        try {
                            console.log('⏳ Aguardando API do Drive carregar após login...');
                            await this.waitForGapi();
                            console.log('✅ API do Drive carregada após login');
                            // Carregar lista de backups
                            this.loadBackupList();
                        } catch (error) {
                            console.error('❌ Não foi possível carregar API do Drive:', error);
                            this.showAlert('API do Drive carregou parcialmente. Você ainda pode criar backups.', 'warning');
                        }
                    }, 1500);
                }
            });
            
            console.log('✅ Token Client inicializado');
            this.state.gisReady = true;
            
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
            
            // Tentar inicializar a API do Drive quando temos token
            setTimeout(async () => {
                try {
                    console.log('⏳ Inicializando API do Drive com token existente...');
                    await this.waitForGapi();
                    console.log('✅ API do Drive inicializada após token existente');
                    this.updateUI();
                    
                    // Tentar carregar lista se interface já estiver pronta
                    setTimeout(() => {
                        if (document.getElementById('backup-list-container')) {
                            this.loadBackupList();
                        }
                    }, 1000);
                    
                } catch (error) {
                    console.warn('⚠️ Não foi possível inicializar API do Drive completamente:', error.message);
                    // Ainda atualizamos a UI mesmo com API parcial
                    this.updateUI();
                }
            }, 1000);
            
        } else {
            // Token expirado ou não existe
            if (token) {
                localStorage.removeItem('google_drive_token');
                localStorage.removeItem('google_drive_token_expiry');
                console.log('🗑️ Token expirado removido');
            }
            console.log('⚠️ Nenhum token válido encontrado');
        }
    }
    
    addToInterface() {
        // Esperar pelo sistema principal
        let attempts = 0;
        const maxAttempts = 15;
        
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
                                <span id="drive-api-status" class="badge badge-secondary ml-2">Carregando...</span>
                            </h4>
                        </div>
                        <div class="card-body">
                            <div id="drive-backup-content">
                                <div class="text-center py-3">
                                    <i class="fas fa-spinner fa-spin"></i> Inicializando APIs do Google...
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
                console.warn('⚠️ Não foi possível adicionar a interface - sistema principal não encontrado');
            }
        };
        
        tryAdd();
    }
    
    updateUI() {
        const content = document.getElementById('drive-backup-content');
        const apiStatus = document.getElementById('drive-api-status');
        
        if (!content) return;
        
        // Atualizar status da API
        if (apiStatus) {
            if (this.state.gapiReady && this.state.gisReady) {
                apiStatus.className = 'badge badge-success ml-2';
                apiStatus.textContent = 'API Pronta';
            } else if (this.state.gapiReady || this.state.gisReady) {
                apiStatus.className = 'badge badge-warning ml-2';
                apiStatus.textContent = 'Parcial';
            } else {
                apiStatus.className = 'badge badge-secondary ml-2';
                apiStatus.textContent = 'Carregando...';
            }
        }
        
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
        
        // Verificar se APIs estão prontas
        if (!this.state.gapiReady || !this.state.gisReady) {
            content.innerHTML = `
                <div class="text-center py-3">
                    <i class="fab fa-google-drive fa-3x mb-3" style="color: #4285F4;"></i>
                    <h5 class="mb-3">Inicializando Google Drive</h5>
                    <div class="spinner-border spinner-border-sm text-primary mb-2" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <p class="text-muted mb-2">Carregando APIs do Google...</p>
                    <div class="small text-muted">
                        <div>GAPI: ${this.state.gapiReady ? '✅' : '⏳'}</div>
                        <div>Google Identity: ${this.state.gisReady ? '✅' : '⏳'}</div>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary mt-3" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Recarregar se demorar muito
                    </button>
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
            setTimeout(() => {
                if (this.state.gapiReady) {
                    this.loadBackupList();
                } else {
                    content.querySelector('#backup-list-container').innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i> 
                            API do Drive não está pronta. Tente recarregar a página.
                        </div>
                    `;
                }
            }, 500);
            
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
                            style="background-color: #4285F4; border-color: #4285F4;"
                            ${!this.state.gisReady ? 'disabled' : ''}>
                        <i class="fab fa-google mr-2"></i> 
                        ${this.state.gisReady ? 'Conectar ao Google Drive' : 'Aguarde...'}
                    </button>
                    
                    ${!this.state.gisReady ? `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> Aguardando APIs do Google carregarem...
                    </div>
                    ` : ''}
                    
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
        
        // Verificar se API está pronta
        if (!this.state.gapiReady) {
            this.showAlert('API do Google Drive não está pronta. Aguarde alguns segundos e tente novamente.', 'warning');
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
            
            // Garantir que API está pronta
            await this.ensureGapiReady();
            
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
            } else if (errorMsg.includes('API not loaded') || errorMsg.includes('gapi')) {
                errorMsg = 'API do Google Drive não está carregada. Recarregue a página.';
                this.state.gapiReady = false;
            }
            
            this.showAlert(`❌ Erro ao criar backup:\n${errorMsg}`, 'error');
        }
    }
    
    // NOVO MÉTODO: Garantir que GAPI está pronta
    async ensureGapiReady() {
        if (!this.state.gapiReady) {
            console.log('⏳ GAPI não está pronta, aguardando...');
            await this.waitForGapi();
        }
        return true;
    }
    
    async getOrCreateFolder() {
        try {
            // Garantir que API está pronta
            await this.ensureGapiReady();
            
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
            } else if (error.message?.includes('API') || error.message?.includes('gapi')) {
                console.log('🔄 API não pronta, marcando como não pronta');
                this.state.gapiReady = false;
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
            
            // Verificar se API está pronta
            if (!this.state.gapiReady) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i> 
                        API do Google Drive não está pronta. 
                        <button class="btn btn-sm btn-outline-secondary ml-2" onclick="window.driveBackupSimple.retryLoadBackupList()">
                            Tentar novamente
                        </button>
                    </div>
                `;
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
            } else if (errorMessage.includes('API') || errorMessage.includes('gapi')) {
                errorMessage = 'API do Google Drive não está carregada.';
                this.state.gapiReady = false;
            }
            
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Erro ao carregar backups: ${errorMessage}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-warning" onclick="window.driveBackupSimple.refreshBackupList()">
                            <i class="fas fa-sync"></i> Tentar novamente
                        </button>
                        <button class="btn btn-sm btn-secondary ml-1" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Recarregar Página
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // NOVO MÉTODO: Para tentar novamente carregar a lista
    retryLoadBackupList() {
        console.log('🔄 Tentando carregar lista novamente...');
        this.state.gapiReady = false;
        this.updateUI();
        
        setTimeout(async () => {
            try {
                await this.waitForGapi();
                this.loadBackupList();
            } catch (error) {
                console.error('❌ Falha ao tentar novamente:', error);
            }
        }, 1000);
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
            
            // Garantir que API está pronta
            await this.ensureGapiReady();
            
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
            // Garantir que API está pronta
            await this.ensureGapiReady();
            
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
