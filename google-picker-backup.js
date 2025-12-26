// GOOGLE PICKER BACKUP - INTERFACE VISUAL DO GOOGLE DRIVE
// Sistema simples onde o usuário vê e seleciona arquivos visualmente

class GooglePickerBackup {
    constructor() {
        this.config = {
            clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
            apiKey: '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',
            scope: 'https://www.googleapis.com/auth/drive.file',
            pickerApiLoaded: false,
            authApiLoaded: false
        };
        
        this.state = {
            isAuthenticated: false,
            accessToken: null,
            isLoading: false
        };
        
        // Iniciar automaticamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 1000);
        }
    }
    
    async init() {
        console.log('🚀 Iniciando Google Picker Backup...');
        
        try {
            // Carregar APIs do Google
            await this.loadGoogleAPIs();
            
            // Adicionar interface
            setTimeout(() => this.addToInterface(), 1000);
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
        }
    }
    
    loadGoogleAPIs() {
        return new Promise((resolve, reject) => {
            // Verificar se APIs já estão carregadas
            if (window.gapi && window.google && window.google.picker) {
                console.log('✅ APIs Google já carregadas');
                this.config.pickerApiLoaded = true;
                this.config.authApiLoaded = true;
                resolve();
                return;
            }
            
            console.log('📦 Carregando APIs Google...');
            
            // Carregar Google API Client
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            
            gapiScript.onload = () => {
                console.log('✅ Google API carregada');
                
                // Inicializar gapi
                gapi.load('client:auth2:picker', () => {
                    gapi.client.init({
                        apiKey: this.config.apiKey,
                        clientId: this.config.clientId,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        scope: this.config.scope
                    }).then(() => {
                        console.log('✅ Google API inicializada');
                        this.config.authApiLoaded = true;
                        this.config.pickerApiLoaded = true;
                        
                        // Verificar se já está autenticado
                        this.checkExistingAuth();
                        
                        resolve();
                    }).catch(error => {
                        console.error('❌ Erro ao inicializar Google API:', error);
                        reject(error);
                    });
                });
            };
            
            gapiScript.onerror = () => {
                console.error('❌ Erro ao carregar Google API');
                reject(new Error('Falha ao carregar Google API'));
            };
            
            document.head.appendChild(gapiScript);
        });
    }
    
    checkExistingAuth() {
        const user = gapi.auth2.getAuthInstance().currentUser.get();
        
        if (user && user.isSignedIn()) {
            console.log('✅ Usuário já autenticado');
            this.state.isAuthenticated = true;
            this.state.accessToken = user.getAuthResponse().access_token;
            this.updateUI();
        }
    }
    
    addToInterface() {
        // Esperar pelo sistema principal
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryAdd = () => {
            const databaseView = document.getElementById('database-view');
            
            if (databaseView && !document.getElementById('google-picker-section')) {
                console.log('✅ Adicionando interface do Google Picker...');
                
                const pickerSection = document.createElement('div');
                pickerSection.id = 'google-picker-section';
                pickerSection.className = 'mt-4';
                pickerSection.innerHTML = `
                    <div class="card">
                        <div class="card-header" style="background: linear-gradient(135deg, #EA4335, #FBBC05);">
                            <h4 class="mb-0 text-white">
                                <i class="fab fa-google mr-2"></i> 
                                Backup com Google Drive (Visual)
                            </h4>
                        </div>
                        <div class="card-body">
                            <div id="picker-backup-content">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-warning" role="status">
                                        <span class="sr-only">Carregando...</span>
                                    </div>
                                    <p class="mt-2">Carregando interface do Google Drive...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Inserir após a seção de backup local
                const localBackupSection = databaseView.querySelector('.form-group:last-child');
                if (localBackupSection) {
                    localBackupSection.parentNode.insertBefore(pickerSection, localBackupSection.nextSibling);
                } else {
                    databaseView.appendChild(pickerSection);
                }
                
                this.updateUI();
                
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryAdd, 500);
            }
        };
        
        tryAdd();
    }
    
    updateUI() {
        const content = document.getElementById('picker-backup-content');
        if (!content) return;
        
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
        
        // Verificar se APIs estão carregadas
        if (!this.config.pickerApiLoaded || !this.config.authApiLoaded) {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="fab fa-google fa-3x mb-3" style="color: #4285F4;"></i>
                    <h5 class="mb-3">Carregando Google Drive...</h5>
                    <div class="spinner-border spinner-border-sm text-primary mb-3" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <p class="text-muted">Aguarde enquanto carregamos a interface do Google.</p>
                    <button class="btn btn-sm btn-outline-secondary mt-2" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Recarregar
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
                        <button class="btn btn-sm btn-warning ml-auto" onclick="window.pickerBackup.logout()">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
                
                <div class="text-center mb-4">
                    <button class="btn btn-primary btn-lg mr-2 mb-2" onclick="window.pickerBackup.openPickerForUpload()">
                        <i class="fas fa-cloud-upload-alt mr-2"></i> Salvar Backup
                    </button>
                    <button class="btn btn-success btn-lg mr-2 mb-2" onclick="window.pickerBackup.openPickerForDownload()">
                        <i class="fas fa-cloud-download-alt mr-2"></i> Restaurar Backup
                    </button>
                    <button class="btn btn-info btn-lg mb-2" onclick="window.pickerBackup.openPickerForView()">
                        <i class="fas fa-folder-open mr-2"></i> Ver Meus Backups
                    </button>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <div class="card h-100 text-center border-primary">
                            <div class="card-body">
                                <i class="fas fa-save fa-3x text-primary mb-3"></i>
                                <h5>Salvar Backup</h5>
                                <p class="small text-muted">Crie um novo backup dos seus dados atuais</p>
                                <button class="btn btn-outline-primary btn-block" onclick="window.pickerBackup.openPickerForUpload()">
                                    <i class="fas fa-upload"></i> Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-3">
                        <div class="card h-100 text-center border-success">
                            <div class="card-body">
                                <i class="fas fa-history fa-3x text-success mb-3"></i>
                                <h5>Restaurar</h5>
                                <p class="small text-muted">Recupere dados de um backup anterior</p>
                                <button class="btn btn-outline-success btn-block" onclick="window.pickerBackup.openPickerForDownload()">
                                    <i class="fas fa-download"></i> Restaurar
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-3">
                        <div class="card h-100 text-center border-info">
                            <div class="card-body">
                                <i class="fas fa-folder fa-3x text-info mb-3"></i>
                                <h5>Gerenciar</h5>
                                <p class="small text-muted">Veja e organize seus backups</p>
                                <button class="btn btn-outline-info btn-block" onclick="window.pickerBackup.openPickerForView()">
                                    <i class="fas fa-search"></i> Explorar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <h5 class="border-bottom pb-2">Como funciona:</h5>
                    <ol class="pl-3">
                        <li class="mb-2"><strong>Salvar:</strong> Clica em "Salvar Backup" e escolhe onde salvar</li>
                        <li class="mb-2"><strong>Restaurar:</strong> Clica em "Restaurar Backup" e seleciona o arquivo</li>
                        <li class="mb-2"><strong>Visual:</strong> Veja todos seus arquivos na interface do Google</li>
                    </ol>
                </div>
            `;
            
        } else {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="fab fa-google-drive fa-5x mb-4" style="color: #4285F4;"></i>
                    <h3 class="mb-3">Backup Visual no Google Drive</h3>
                    <p class="lead text-muted mb-4">
                        Veja e selecione seus backups na interface familiar do Google Drive
                    </p>
                    
                    <div class="row mb-4">
                        <div class="col-md-4 mb-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center">
                                    <i class="fas fa-eye fa-2x text-primary mb-3"></i>
                                    <h6>Interface Visual</h6>
                                    <p class="small text-muted">Veja seus arquivos como no Google Drive</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center">
                                    <i class="fas fa-folder-tree fa-2x text-success mb-3"></i>
                                    <h6>Organização</h6>
                                    <p class="small text-muted">Use pastas e organização do Drive</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center">
                                    <i class="fas fa-mouse-pointer fa-2x text-info mb-3"></i>
                                    <h6>Clique e Escolha</h6>
                                    <p class="small text-muted">Selecione arquivos visualmente</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-lg btn-primary mb-3" onclick="window.pickerBackup.login()" 
                            style="background: linear-gradient(135deg, #4285F4, #34A853); border: none; padding: 15px 40px;">
                        <i class="fab fa-google mr-2"></i> Conectar com Google Drive
                    </button>
                    
                    <div class="alert alert-light border mt-4">
                        <i class="fas fa-info-circle text-primary mr-2"></i>
                        <strong>Diferencial:</strong> Você verá a interface completa do Google Drive para escolher 
                        onde salvar e de onde restaurar seus backups.
                    </div>
                    
                    <div class="mt-3">
                        <img src="https://www.gstatic.com/images/branding/product/2x/drive_96dp.png" 
                             alt="Google Drive" class="img-fluid" style="max-height: 60px; opacity: 0.7;">
                        <p class="small text-muted mt-2">Integração oficial com Google Drive</p>
                    </div>
                </div>
            `;
        }
    }
    
    async login() {
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            console.log('🔑 Fazendo login...');
            
            const auth2 = gapi.auth2.getAuthInstance();
            const user = await auth2.signIn({
                prompt: 'select_account'
            });
            
            const authResponse = user.getAuthResponse();
            
            this.state.isAuthenticated = true;
            this.state.accessToken = authResponse.access_token;
            this.state.isLoading = false;
            
            console.log('✅ Login realizado com sucesso');
            
            this.updateUI();
            this.showAlert('✅ Conectado ao Google Drive com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.state.isLoading = false;
            this.updateUI();
            
            let errorMsg = error.message || 'Erro desconhecido';
            
            if (errorMsg.includes('popup')) {
                errorMsg = 'O popup de login foi bloqueado. Por favor, permita popups para este site.';
            } else if (errorMsg.includes('access_denied')) {
                errorMsg = 'Acesso negado. Permita as permissões para continuar.';
            }
            
            this.showAlert('❌ Erro ao conectar: ' + errorMsg, 'error');
        }
    }
    
    logout() {
        try {
            const auth2 = gapi.auth2.getAuthInstance();
            auth2.signOut().then(() => {
                this.state.isAuthenticated = false;
                this.state.accessToken = null;
                
                console.log('✅ Logout realizado');
                this.updateUI();
                this.showAlert('Desconectado do Google Drive', 'info');
            });
            
        } catch (error) {
            console.error('❌ Erro no logout:', error);
        }
    }
    
    openPickerForUpload() {
        if (!this.state.isAuthenticated) {
            this.showAlert('Por favor, conecte-se primeiro ao Google Drive', 'warning');
            this.login();
            return;
        }
        
        console.log('📤 Abrindo Picker para upload...');
        
        // Obter dados do sistema
        const systemData = window.systemData || {};
        
        if (Object.keys(systemData).length === 0) {
            this.showAlert('Nenhum dado encontrado para fazer backup', 'warning');
            return;
        }
        
        // Salvar dados temporariamente
        this.tempBackupData = JSON.stringify(systemData, null, 2);
        
        // Criar picker para salvar arquivo
        const picker = new google.picker.PickerBuilder()
            .addView(new google.picker.DocsUploadView()
                .setIncludeFolders(true)
                .setParent('root')
            )
            .addView(google.picker.ViewId.FOLDERS)
            .setOAuthToken(this.state.accessToken)
            .setDeveloperKey(this.config.apiKey)
            .setCallback(this.handleUploadPickerResponse.bind(this))
            .setOrigin(window.location.origin)
            .setTitle('Salvar Backup do Sistema')
            .build();
        
        picker.setVisible(true);
    }
    
    openPickerForDownload() {
        if (!this.state.isAuthenticated) {
            this.showAlert('Por favor, conecte-se primeiro ao Google Drive', 'warning');
            this.login();
            return;
        }
        
        console.log('📥 Abrindo Picker para download...');
        
        // Criar picker para selecionar arquivo
        const picker = new google.picker.PickerBuilder()
            .addView(google.picker.ViewId.DOCS)
            .addView(google.picker.ViewId.FOLDERS)
            .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
            .setOAuthToken(this.state.accessToken)
            .setDeveloperKey(this.config.apiKey)
            .setCallback(this.handleDownloadPickerResponse.bind(this))
            .setOrigin(window.location.origin)
            .setTitle('Selecione um Backup para Restaurar')
            .build();
        
        picker.setVisible(true);
    }
    
    openPickerForView() {
        if (!this.state.isAuthenticated) {
            this.showAlert('Por favor, conecte-se primeiro ao Google Drive', 'warning');
            this.login();
            return;
        }
        
        console.log('👀 Abrindo Picker para visualização...');
        
        // Criar picker para navegar nos arquivos
        const picker = new google.picker.PickerBuilder()
            .addView(google.picker.ViewId.DOCS)
            .addView(google.picker.ViewId.FOLDERS)
            .addView(google.picker.ViewId.RECENTLY_PICKED)
            .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(this.state.accessToken)
            .setDeveloperKey(this.config.apiKey)
            .setCallback(this.handleViewPickerResponse.bind(this))
            .setOrigin(window.location.origin)
            .setTitle('Seus Backups no Google Drive')
            .build();
        
        picker.setVisible(true);
    }
    
    handleUploadPickerResponse(data) {
        console.log('📤 Resposta do Picker (upload):', data);
        
        if (data.action === google.picker.Action.PICKED) {
            const folderId = data.docs[0].id;
            
            // Confirmar com o usuário
            if (confirm(`Deseja salvar o backup na pasta "${data.docs[0].name}"?`)) {
                this.createBackupInFolder(folderId);
            }
            
        } else if (data.action === google.picker.Action.CANCEL) {
            console.log('❌ Usuário cancelou a seleção');
        }
    }
    
    handleDownloadPickerResponse(data) {
        console.log('📥 Resposta do Picker (download):', data);
        
        if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            
            if (!file.name.includes('.json')) {
                this.showAlert('Por favor, selecione um arquivo JSON de backup', 'warning');
                return;
            }
            
            if (confirm(`Deseja restaurar o backup "${file.name}"?\n\nEsta ação substituirá todos os dados atuais.`)) {
                this.restoreBackup(file.id, file.name);
            }
            
        } else if (data.action === google.picker.Action.CANCEL) {
            console.log('❌ Usuário cancelou a seleção');
        }
    }
    
    handleViewPickerResponse(data) {
        console.log('👀 Resposta do Picker (view):', data);
        
        if (data.action === google.picker.Action.PICKED) {
            const files = data.docs;
            
            let message = `Arquivos selecionados (${files.length}):\n\n`;
            
            files.forEach((file, index) => {
                message += `${index + 1}. ${file.name}\n`;
                message += `   📂 ${file.type === 'folder' ? 'Pasta' : 'Arquivo'}\n`;
                if (file.type !== 'folder') {
                    message += `   📏 ${this.formatBytes(file.sizeBytes || 0)}\n`;
                }
                message += '\n';
            });
            
            this.showAlert(message, 'info');
            
            // Se selecionou apenas um arquivo, oferecer opções
            if (files.length === 1 && files[0].type !== 'folder') {
                setTimeout(() => {
                    this.showFileOptions(files[0]);
                }, 1500);
            }
            
        } else if (data.action === google.picker.Action.CANCEL) {
            console.log('❌ Usuário cancelou a visualização');
        }
    }
    
    showFileOptions(file) {
        const options = [
            { text: '📥 Restaurar este backup', action: () => this.restoreBackup(file.id, file.name) },
            { text: '💾 Baixar arquivo', action: () => this.downloadFile(file.id, file.name) },
            { text: '❌ Excluir arquivo', action: () => this.deleteFile(file.id, file.name) },
            { text: '✏️ Renomear', action: () => this.renameFile(file.id, file.name) },
            { text: '📋 Informações', action: () => this.showFileInfo(file) }
        ];
        
        let message = `O que deseja fazer com "${file.name}"?\n\n`;
        
        options.forEach((option, index) => {
            message += `${index + 1}. ${option.text}\n`;
        });
        
        const choice = prompt(message + '\nDigite o número da opção (1-5):');
        const choiceNum = parseInt(choice);
        
        if (choiceNum >= 1 && choiceNum <= 5) {
            options[choiceNum - 1].action();
        }
    }
    
    async createBackupInFolder(folderId) {
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            // Criar nome do arquivo
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const fileName = `camarim-backup-${timestamp}.json`;
            
            console.log(`💾 Criando backup: ${fileName} na pasta ${folderId}`);
            
            // Criar metadados do arquivo
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId],
                description: `Backup do sistema Camarim - ${new Date().toLocaleString('pt-BR')}`
            };
            
            // Upload do arquivo
            const boundary = '-------' + Date.now().toString(16);
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelimiter = "\r\n--" + boundary + "--";
            
            const multipartRequestBody = 
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                this.tempBackupData +
                closeDelimiter;
            
            const response = await gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: {
                    uploadType: 'multipart',
                    fields: 'id,name,createdTime,webViewLink'
                },
                headers: {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    'Authorization': 'Bearer ' + this.state.accessToken
                },
                body: multipartRequestBody
            });
            
            const file = response.result;
            
            this.state.isLoading = false;
            this.updateUI();
            
            console.log('✅ Backup criado com sucesso:', file.id);
            
            this.showAlert(
                `✅ Backup criado com sucesso!\n\n` +
                `📁 Arquivo: ${file.name}\n` +
                `📅 Data: ${new Date(file.createdTime).toLocaleString('pt-BR')}\n` +
                `🔗 Pode ser acessado em: ${file.webViewLink || 'Seu Google Drive'}`,
                'success'
            );
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            this.state.isLoading = false;
            this.updateUI();
            
            let errorMsg = error.message || 'Erro desconhecido';
            
            if (errorMsg.includes('auth') || errorMsg.includes('token')) {
                errorMsg = 'Sessão expirada. Por favor, faça login novamente.';
                this.logout();
            }
            
            this.showAlert(`❌ Erro ao criar backup:\n${errorMsg}`, 'error');
        }
    }
    
    async restoreBackup(fileId, fileName) {
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            console.log(`🔄 Restaurando backup: ${fileName}`);
            
            // Baixar arquivo
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const backupData = JSON.parse(response.body);
            
            // Validar dados
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('Arquivo de backup inválido');
            }
            
            // Restaurar dados
            window.systemData = backupData;
            localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
            
            this.state.isLoading = false;
            this.updateUI();
            
            this.showAlert(
                `✅ Backup restaurado com sucesso!\n\n` +
                `📁 Arquivo: ${fileName}\n` +
                `📊 Produtos: ${backupData.products?.length || 0}\n` +
                `💰 Vendas: ${backupData.sales?.length || 0}\n\n` +
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
            this.state.isLoading = false;
            this.updateUI();
            this.showAlert(`❌ Erro ao restaurar backup:\n${error.message}`, 'error');
        }
    }
    
    async downloadFile(fileId, fileName) {
        try {
            this.state.isLoading = true;
            this.updateUI();
            
            // Baixar arquivo
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            // Criar link de download
            const blob = new Blob([response.body], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.state.isLoading = false;
            this.updateUI();
            
            this.showAlert(`✅ Arquivo "${fileName}" baixado com sucesso!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao baixar:', error);
            this.state.isLoading = false;
            this.updateUI();
            this.showAlert(`❌ Erro ao baixar arquivo:\n${error.message}`, 'error');
        }
    }
    
    async deleteFile(fileId, fileName) {
        if (!confirm(`Tem certeza que deseja excluir "${fileName}" permanentemente?`)) {
            return;
        }
        
        try {
            await gapi.client.drive.files.delete({
                fileId: fileId
            });
            
            this.showAlert(`✅ Arquivo "${fileName}" excluído com sucesso`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao excluir:', error);
            this.showAlert(`❌ Erro ao excluir arquivo:\n${error.message}`, 'error');
        }
    }
    
    async renameFile(fileId, currentName) {
        const newName = prompt(`Digite o novo nome para "${currentName}":`, currentName);
        
        if (!newName || newName === currentName) {
            return;
        }
        
        try {
            await gapi.client.drive.files.update({
                fileId: fileId,
                resource: {
                    name: newName
                }
            });
            
            this.showAlert(`✅ Arquivo renomeado para "${newName}"`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao renomear:', error);
            this.showAlert(`❌ Erro ao renomear arquivo:\n${error.message}`, 'error');
        }
    }
    
    async showFileInfo(file) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: file.id,
                fields: 'name,size,createdTime,modifiedTime,description,webViewLink'
            });
            
            const fileInfo = response.result;
            
            const infoMessage = `
📁 Arquivo: ${fileInfo.name}
📏 Tamanho: ${this.formatBytes(fileInfo.size || 0)}
📅 Criado: ${new Date(fileInfo.createdTime).toLocaleString('pt-BR')}
✏️ Modificado: ${new Date(fileInfo.modifiedTime).toLocaleString('pt-BR')}
${fileInfo.description ? `📝 Descrição: ${fileInfo.description}\n` : ''}
🔗 Link: ${fileInfo.webViewLink || 'Não disponível'}
`;
            
            this.showAlert(infoMessage, 'info');
            
        } catch (error) {
            console.error('❌ Erro ao obter informações:', error);
            this.showAlert(`❌ Erro ao obter informações do arquivo:\n${error.message}`, 'error');
        }
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
            // Criar alerta bonito
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
            alertDiv.style.cssText = `
                top: 20px; 
                right: 20px; 
                z-index: 9999; 
                min-width: 300px; 
                max-width: 400px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 4px solid ${type === 'success' ? '#28a745' : 
                                  type === 'error' ? '#dc3545' : 
                                  type === 'warning' ? '#ffc107' : '#17a2b8'};
            `;
            
            const icon = type === 'success' ? '✅' : 
                        type === 'error' ? '❌' : 
                        type === 'warning' ? '⚠️' : 'ℹ️';
            
            alertDiv.innerHTML = `
                <div class="d-flex align-items-start">
                    <div class="mr-2" style="font-size: 1.2rem;">${icon}</div>
                    <div class="flex-grow-1" style="white-space: pre-line;">${message}</div>
                    <button type="button" class="close ml-2" onclick="this.parentElement.parentElement.remove()">
                        <span>&times;</span>
                    </button>
                </div>
            `;
            
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.remove();
                }
            }, 6000);
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
        if (!window.pickerBackup) {
            console.log('🚀 Criando instância do Google Picker Backup...');
            window.pickerBackup = new GooglePickerBackup();
        }
    }, 2000);
});

console.log('✅ Google Picker Backup carregado');