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
        setTimeout(() => this.init(), 1000);
    }
    
    async init() {
        console.log('🚀 Iniciando Google Picker Backup...');
        
        try {
            // Adicionar interface primeiro (independente das APIs)
            this.addToInterface();
            
            // Carregar APIs do Google
            await this.loadGoogleAPIs();
            
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
                this.updateUI();
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
                        
                        this.updateUI();
                        resolve();
                    }).catch(error => {
                        console.error('❌ Erro ao inicializar Google API:', error);
                        this.updateUI();
                        reject(error);
                    });
                });
            };
            
            gapiScript.onerror = () => {
                console.error('❌ Erro ao carregar Google API');
                this.updateUI();
                reject(new Error('Falha ao carregar Google API'));
            };
            
            document.head.appendChild(gapiScript);
        });
    }
    
    checkExistingAuth() {
        try {
            const auth2 = gapi.auth2.getAuthInstance();
            if (!auth2) return;
            
            const user = auth2.currentUser.get();
            
            if (user && user.isSignedIn()) {
                console.log('✅ Usuário já autenticado');
                this.state.isAuthenticated = true;
                this.state.accessToken = user.getAuthResponse().access_token;
            }
        } catch (error) {
            console.log('ℹ️ Nenhuma autenticação existente');
        }
    }
    
    addToInterface() {
        console.log('🎨 Adicionando interface do Google Picker...');
        
        // Primeiro, procurar por locais comuns
        const possibleLocations = [
            document.getElementById('database'),
            document.getElementById('backup-section'),
            document.getElementById('config-section'),
            document.querySelector('.container'),
            document.querySelector('.main-content'),
            document.body
        ];
        
        let targetLocation = null;
        
        for (const location of possibleLocations) {
            if (location && !document.getElementById('google-picker-section')) {
                targetLocation = location;
                break;
            }
        }
        
        if (!targetLocation) {
            console.warn('⚠️ Não encontrei um local para adicionar a interface');
            // Criar um container se não existir
            this.createContainer();
            return;
        }
        
        // Criar seção do Google Picker
        const pickerSection = document.createElement('div');
        pickerSection.id = 'google-picker-section';
        pickerSection.className = 'google-picker-container';
        pickerSection.style.cssText = `
            margin: 20px 0;
            padding: 0;
            width: 100%;
        `;
        
        pickerSection.innerHTML = `
            <div class="card" style="border: 2px solid #4285F4; border-radius: 10px;">
                <div class="card-header" style="background: linear-gradient(135deg, #4285F4, #34A853); border-radius: 8px 8px 0 0;">
                    <h4 class="mb-0 text-white" style="display: flex; align-items: center;">
                        <i class="fab fa-google-drive mr-2"></i> 
                        Backup no Google Drive
                        <span id="picker-status" class="badge badge-light ml-2" style="font-size: 0.7rem;">Carregando...</span>
                    </h4>
                </div>
                <div class="card-body" style="padding: 20px;">
                    <div id="picker-backup-content">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="sr-only">Carregando...</span>
                            </div>
                            <p class="mt-2">Inicializando sistema de backup...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar estilos CSS
        this.addStyles();
        
        // Inserir a seção
        if (targetLocation === document.body) {
            // Se for body, adicionar no início
            document.body.insertBefore(pickerSection, document.body.firstChild);
        } else {
            // Se for outro elemento, adicionar no final
            targetLocation.appendChild(pickerSection);
        }
        
        console.log('✅ Interface adicionada com sucesso');
        this.updateUI();
    }
    
    createContainer() {
        console.log('🏗️ Criando container para a interface...');
        
        // Criar um container no body
        const container = document.createElement('div');
        container.id = 'google-backup-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            z-index: 1000;
        `;
        
        container.innerHTML = `
            <div class="card shadow-lg" style="border: 2px solid #4285F4;">
                <div class="card-header" style="background: #4285F4; color: white; padding: 10px 15px;">
                    <h5 class="mb-0" style="font-size: 1rem;">
                        <i class="fab fa-google-drive mr-2"></i> Google Drive Backup
                    </h5>
                </div>
                <div class="card-body" style="padding: 15px;">
                    <div id="picker-backup-content">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="sr-only">Carregando...</span>
                            </div>
                            <p class="mt-2 small">Carregando...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.addStyles();
        this.updateUI();
    }
    
    addStyles() {
        // Adicionar estilos CSS se não existirem
        if (document.getElementById('google-picker-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'google-picker-styles';
        styles.textContent = `
            .google-picker-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            .google-picker-container .btn-google {
                background: linear-gradient(135deg, #4285F4, #34A853);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-weight: 500;
                transition: all 0.3s;
            }
            
            .google-picker-container .btn-google:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            .google-picker-container .btn-google:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .google-picker-container .card {
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .google-picker-container .feature-card {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                transition: all 0.3s;
            }
            
            .google-picker-container .feature-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.1);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    updateUI() {
        const content = document.getElementById('picker-backup-content');
        const status = document.getElementById('picker-status');
        
        if (!content) {
            console.warn('⚠️ Elemento #picker-backup-content não encontrado');
            return;
        }
        
        // Atualizar status
        if (status) {
            if (this.state.isAuthenticated) {
                status.className = 'badge badge-success ml-2';
                status.textContent = 'Conectado';
                status.style.fontSize = '0.7rem';
            } else if (this.config.pickerApiLoaded) {
                status.className = 'badge badge-warning ml-2';
                status.textContent = 'Pronto';
                status.style.fontSize = '0.7rem';
            } else {
                status.className = 'badge badge-secondary ml-2';
                status.textContent = 'Carregando...';
                status.style.fontSize = '0.7rem';
            }
        }
        
        content.innerHTML = '';
        
        if (this.state.isLoading) {
            content.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <p class="mt-2 small">Processando...</p>
                </div>
            `;
            return;
        }
        
        // Verificar se APIs estão carregadas
        if (!this.config.pickerApiLoaded || !this.config.authApiLoaded) {
            content.innerHTML = `
                <div class="text-center">
                    <i class="fab fa-google fa-2x mb-3" style="color: #4285F4;"></i>
                    <h6 class="mb-2">Google Drive Backup</h6>
                    <p class="text-muted small mb-3">Carregando integração com Google Drive...</p>
                    <div class="spinner-border spinner-border-sm text-primary mb-3" role="status">
                        <span class="sr-only">Carregando...</span>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Recarregar
                    </button>
                </div>
            `;
            return;
        }
        
        if (this.state.isAuthenticated) {
            content.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: #34A853; font-weight: 500;">
                            <i class="fas fa-check-circle mr-1"></i> Conectado
                        </span>
                        <button class="btn btn-sm btn-outline-warning" onclick="window.pickerBackup.logout()" style="padding: 3px 8px; font-size: 0.8rem;">
                            <i class="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <button class="btn btn-primary btn-block" onclick="window.pickerBackup.openPickerForUpload()" style="padding: 8px 12px; font-size: 0.85rem;">
                        <i class="fas fa-cloud-upload-alt mr-1"></i> Salvar
                    </button>
                    <button class="btn btn-success btn-block" onclick="window.pickerBackup.openPickerForDownload()" style="padding: 8px 12px; font-size: 0.85rem;">
                        <i class="fas fa-cloud-download-alt mr-1"></i> Restaurar
                    </button>
                </div>
                
                <button class="btn btn-info btn-block mb-3" onclick="window.pickerBackup.openPickerForView()" style="padding: 8px 12px; font-size: 0.85rem;">
                    <i class="fas fa-folder-open mr-1"></i> Ver Backups
                </button>
                
                <div class="text-center">
                    <small class="text-muted">Use a interface visual do Google Drive</small>
                </div>
            `;
            
        } else {
            content.innerHTML = `
                <div class="text-center">
                    <i class="fab fa-google-drive fa-3x mb-3" style="color: #4285F4;"></i>
                    <h6 class="mb-2">Backup no Google Drive</h6>
                    <p class="text-muted small mb-3">Salve e restaure seus dados visualmente</p>
                    
                    <button class="btn btn-google btn-block mb-3" onclick="window.pickerBackup.login()" style="padding: 10px;">
                        <i class="fab fa-google mr-2"></i> Conectar com Google
                    </button>
                    
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 15px;">
                        <h6 style="font-size: 0.9rem; color: #4285F4; margin-bottom: 8px;">
                            <i class="fas fa-star mr-1"></i> Vantagens:
                        </h6>
                        <ul style="text-align: left; padding-left: 20px; margin-bottom: 0; font-size: 0.8rem;">
                            <li>Interface visual do Google</li>
                            <li>Escolha pastas e arquivos</li>
                            <li>Organização completa</li>
                        </ul>
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
    }, 1000);
});

console.log('✅ Google Picker Backup carregado');
