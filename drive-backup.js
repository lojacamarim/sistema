// ============================================
// SISTEMA DE BACKUP NO GOOGLE DRIVE (VERSÃO REVISADA)
// ============================================

let driveBackup = {
    isInitialized: false,
    accessToken: null,
    // SUBSTITUA ESTES VALORES PELOS SEUS
    clientId: '821978818510-ia36jn3fn9ucqgl27jmtbaqeee9kujmp.apps.googleusercontent.com',
    apiKey: 'SUA_API_KEY_AQUI',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: 'https://www.googleapis.com/auth/drive.file',
    folderName: 'Camarim-Backup-System',
    folderId: null,
    backups: [],
    
    // Inicializar cliente Google API
    init: async function() {
        console.log('🔄 Inicializando Google Drive Backup System...');
        
        try {
            // Verificar se já está inicializado
            if (this.isInitialized) {
                console.log('✅ Já inicializado');
                return true;
            }
            
            // Carregar Google API se necessário
            if (!window.gapi) {
                console.log('📦 Carregando Google API...');
                await this.loadGoogleAPI();
            }
            
            // Inicializar cliente
            console.log('🔧 Inicializando cliente Google...');
            await gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                discoveryDocs: this.discoveryDocs,
                scope: this.scope
            });
            
            console.log('✅ Cliente Google inicializado');
            
            // Verificar autenticação existente
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance && authInstance.isSignedIn.get()) {
                console.log('🔑 Sessão existente encontrada');
                this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
                await this.setupDriveFolder();
                this.isInitialized = true;
                console.log('✅ Google Drive conectado automaticamente');
            } else {
                console.log('ℹ️ Nenhuma sessão ativa. Usuário precisa fazer login.');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            console.error('Detalhes:', error.message, error.stack);
            return false;
        }
    },
    
    // Carregar Google API
    loadGoogleAPI: function() {
        return new Promise((resolve, reject) => {
            // Verificar se já está carregando
            if (window.gapiLoading) {
                const checkInterval = setInterval(() => {
                    if (window.gapi) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                return;
            }
            
            window.gapiLoading = true;
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            
            script.onload = () => {
                console.log('✅ Google API carregada');
                window.gapiLoading = false;
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('❌ Falha ao carregar Google API');
                window.gapiLoading = false;
                reject(new Error('Falha ao carregar Google API'));
            };
            
            script.onreadystatechange = () => {
                if (script.readyState === 'complete') {
                    script.onload();
                }
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Fazer login no Google Drive
    login: async function() {
        console.log('🔑 Iniciando processo de login...');
        
        try {
            // Verificar inicialização
            if (!window.gapi || !window.gapi.auth2) {
                console.log('🔄 Re-inicializando cliente...');
                await this.init();
            }
            
            const authInstance = gapi.auth2.getAuthInstance();
            
            if (!authInstance) {
                throw new Error('Instância de autenticação não disponível');
            }
            
            console.log('👤 Solicitando login...');
            const user = await authInstance.signIn({
                prompt: 'select_account'
            });
            
            console.log('✅ Login realizado');
            this.accessToken = user.getAuthResponse().access_token;
            
            console.log('📁 Configurando pasta...');
            await this.setupDriveFolder();
            this.isInitialized = true;
            
            console.log('✅ Login Google Drive realizado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro no login:', error);
            
            // Tentativa alternativa
            try {
                console.log('🔄 Tentando método alternativo...');
                return await this.alternativeLogin();
            } catch (altError) {
                console.error('❌ Método alternativo também falhou:', altError);
                return false;
            }
        }
    },
    
    // Método alternativo de login
    alternativeLogin: function() {
        return new Promise((resolve, reject) => {
            // Método manual usando popup OAuth2
            const authUrl = 'https://accounts.google.com/o/oauth2/auth?' +
                'client_id=' + encodeURIComponent(this.clientId) +
                '&redirect_uri=' + encodeURIComponent(window.location.origin + window.location.pathname) +
                '&response_type=token' +
                '&scope=' + encodeURIComponent(this.scope) +
                '&prompt=consent';
            
            console.log('🔗 URL de autenticação:', authUrl);
            
            // Abrir popup manual
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                authUrl,
                'Google Login',
                `width=${width},height=${height},left=${left},top=${top}`
            );
            
            if (!popup) {
                reject(new Error('Popup bloqueado. Permita popups para este site.'));
                return;
            }
            
            // Verificar popup periodicamente
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    reject(new Error('Popup fechado pelo usuário'));
                }
                
                try {
                    const popupUrl = popup.location.href;
                    
                    if (popupUrl.includes('access_token=')) {
                        clearInterval(checkPopup);
                        popup.close();
                        
                        // Extrair token da URL
                        const hash = new URL(popupUrl).hash.substring(1);
                        const params = new URLSearchParams(hash);
                        const token = params.get('access_token');
                        
                        if (token) {
                            this.accessToken = token;
                            this.isInitialized = true;
                            resolve(true);
                        } else {
                            reject(new Error('Token não encontrado na URL'));
                        }
                    }
                } catch (e) {
                    // Ignorar erros de cross-origin
                }
            }, 100);
        });
    },
    
    // Criar ou obter pasta de backups
    setupDriveFolder: async function() {
        try {
            console.log('📁 Configurando pasta de backups...');
            
            if (!this.accessToken) {
                throw new Error('Token de acesso não disponível');
            }
            
            // Primeiro, verificar se temos permissão para acessar o Drive
            try {
                await gapi.client.drive.about.get({
                    fields: 'user'
                });
                console.log('✅ Permissão do Drive confirmada');
            } catch (error) {
                console.error('❌ Sem permissão para acessar Drive:', error);
                throw error;
            }
            
            // Procurar pasta existente
            console.log('🔍 Procurando pasta existente...');
            const response = await gapi.client.drive.files.list({
                q: `name='${this.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });
            
            if (response.result.files.length > 0) {
                this.folderId = response.result.files[0].id;
                console.log(`✅ Pasta encontrada: ${this.folderId}`);
            } else {
                console.log('📝 Criando nova pasta...');
                // Criar nova pasta
                const createResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: this.folderName,
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
            console.error('Detalhes:', error.result ? error.result.error : error.message);
            throw error;
        }
    },
    
    // Listar todos os backups disponíveis
    listBackups: async function() {
        console.log('📋 Listando backups...');
        
        if (!this.isInitialized || !this.folderId) {
            throw new Error('Drive não inicializado. Faça login primeiro.');
        }
        
        try {
            const response = await gapi.client.drive.files.list({
                q: `'${this.folderId}' in parents and name contains 'camarim-backup' and mimeType='application/json' and trashed=false`,
                fields: 'files(id, name, createdTime, modifiedTime, size, description)',
                orderBy: 'createdTime desc',
                pageSize: 50,
                spaces: 'drive'
            });
            
            console.log(`📊 Resposta da API: ${response.result.files?.length || 0} arquivos`);
            
            this.backups = (response.result.files || []).map(file => ({
                id: file.id,
                name: file.name,
                description: file.description || '',
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                size: parseInt(file.size) || 0,
                readableSize: this.formatFileSize(parseInt(file.size) || 0)
            }));
            
            console.log(`📦 ${this.backups.length} backups encontrados`);
            return this.backups;
        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            console.error('Detalhes:', error.result ? error.result.error : error.message);
            
            // Tentar método alternativo
            return await this.listBackupsAlternative();
        }
    },
    
    // Método alternativo para listar backups
    listBackupsAlternative: async function() {
        console.log('🔄 Usando método alternativo para listar backups...');
        
        try {
            // Usar fetch API diretamente
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${this.folderId}'+in+parents+and+name+contains+'camarim-backup'+and+mimeType='application/json'+and+trashed=false&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=createdTime+desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.backups = (data.files || []).map(file => ({
                id: file.id,
                name: file.name,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                size: parseInt(file.size) || 0,
                readableSize: this.formatFileSize(parseInt(file.size) || 0)
            }));
            
            console.log(`📦 ${this.backups.length} backups encontrados (método alternativo)`);
            return this.backups;
        } catch (error) {
            console.error('❌ Método alternativo também falhou:', error);
            throw error;
        }
    },
    
    // Criar novo backup (versão simplificada)
    createBackup: async function(data, description = '') {
        console.log('💾 Criando backup...');
        
        if (!this.isInitialized || !this.folderId) {
            throw new Error('Drive não inicializado. Faça login primeiro.');
        }
        
        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const fileName = `camarim-backup-${timestamp}.json`;
            
            // Preparar dados
            const backupData = {
                ...data,
                _backupMetadata: {
                    created: new Date().toISOString(),
                    system: 'Camarim Boutique Management System',
                    version: '1.0',
                    description: description,
                    productCount: data.products?.length || 0,
                    saleCount: data.sales?.length || 0
                }
            };
            
            const fileContent = JSON.stringify(backupData, null, 2);
            
            // Método simples usando fetch
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [this.folderId],
                description: description || `Backup Camarim ${timestamp}`
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([fileContent], { type: 'application/json' }));
            
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    body: form
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload falhou: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Backup criado:', result.name);
            
            // Atualizar lista
            await this.listBackups();
            
            return {
                success: true,
                fileId: result.id,
                fileName: result.name
            };
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            throw error;
        }
    },
    
    // Restaurar backup (versão simplificada)
    restoreBackup: async function(fileId) {
        console.log(`🔄 Restaurando backup ${fileId}...`);
        
        try {
            // Usar fetch API
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Falha ao baixar: ${response.status}`);
            }
            
            const backupData = await response.json();
            
            // Validar dados
            if (!backupData.products || !Array.isArray(backupData.products)) {
                throw new Error('Arquivo de backup inválido');
            }
            
            console.log(`✅ Backup carregado: ${backupData.products.length} produtos`);
            
            // Limpar metadados
            if (backupData._backupMetadata) {
                delete backupData._backupMetadata;
            }
            
            return backupData;
        } catch (error) {
            console.error('❌ Erro ao restaurar:', error);
            throw error;
        }
    },
    
    // Utilitários
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    getStatus: function() {
        return {
            isInitialized: this.isInitialized,
            isLoggedIn: this.accessToken !== null,
            folderId: this.folderId,
            backupsCount: this.backups.length,
            clientIdSet: this.clientId !== 'YOUR_CLIENT_ID.apps.googleusercontent.com',
            apiKeySet: this.apiKey !== 'YOUR_API_KEY'
        };
    }
};

// ============================================
// INTERFACE DO USUÁRIO (VERSÃO SIMPLIFICADA)
// ============================================

window.CamarimDriveBackup = driveBackup;

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Drive Backup...');
    
    // Aguardar sistema principal carregar
    setTimeout(async () => {
        try {
            const initialized = await driveBackup.init();
            
            if (initialized && driveBackup.isInitialized) {
                console.log('✅ Drive Backup pronto');
                updateUI();
            } else {
                console.log('⚠️ Drive Backup não inicializado');
                showLoginButton();
            }
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            showErrorUI();
        }
    }, 2000);
});

// Atualizar interface
function updateUI() {
    console.log('🎨 Atualizando interface...');
    
    // Adicionar ou atualizar botão no header
    let backupBtn = document.getElementById('drive-backup-btn');
    if (!backupBtn) {
        backupBtn = document.createElement('button');
        backupBtn.id = 'drive-backup-btn';
        backupBtn.className = 'btn btn-success';
        backupBtn.innerHTML = '<i class="fab fa-google-drive"></i> Drive';
        backupBtn.title = 'Google Drive Backup';
        backupBtn.style.marginLeft = '10px';
        backupBtn.addEventListener('click', showDriveModal);
        
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.appendChild(backupBtn);
        }
    }
    
    backupBtn.innerHTML = '<i class="fab fa-google-drive"></i> Drive Conectado';
    backupBtn.className = 'btn btn-success';
}

// Mostrar botão de login
function showLoginButton() {
    console.log('👤 Mostrando botão de login...');
    
    let backupBtn = document.getElementById('drive-backup-btn');
    if (!backupBtn) {
        backupBtn = document.createElement('button');
        backupBtn.id = 'drive-backup-btn';
        backupBtn.className = 'btn btn-warning';
        backupBtn.innerHTML = '<i class="fab fa-google-drive"></i> Conectar Drive';
        backupBtn.title = 'Conectar Google Drive';
        backupBtn.style.marginLeft = '10px';
        backupBtn.addEventListener('click', async function() {
            try {
                backupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                backupBtn.disabled = true;
                
                const success = await driveBackup.login();
                if (success) {
                    updateUI();
                    showDriveModal();
                } else {
                    backupBtn.innerHTML = '<i class="fab fa-google-drive"></i> Tentar Novamente';
                    backupBtn.disabled = false;
                    alert('Falha na conexão. Verifique o console para detalhes.');
                }
            } catch (error) {
                backupBtn.innerHTML = '<i class="fab fa-google-drive"></i> Tentar Novamente';
                backupBtn.disabled = false;
                console.error('Erro:', error);
            }
        });
        
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.appendChild(backupBtn);
        }
    }
}

// Mostrar UI de erro
function showErrorUI() {
    console.log('❌ Mostrando UI de erro...');
    
    let backupBtn = document.getElementById('drive-backup-btn');
    if (!backupBtn) {
        backupBtn = document.createElement('button');
        backupBtn.id = 'drive-backup-btn';
        backupBtn.className = 'btn btn-danger';
        backupBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Drive Indisponível';
        backupBtn.title = 'Google Drive não disponível';
        backupBtn.style.marginLeft = '10px';
        
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.appendChild(backupBtn);
        }
    }
}

// Modal simplificado
function showDriveModal() {
    if (!driveBackup.isInitialized) {
        alert('Por favor, conecte ao Google Drive primeiro.');
        return;
    }
    
    // Criar modal simples
    const modalId = 'simple-drive-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;"><i class="fab fa-google-drive"></i> Google Drive Backup</h3>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <div id="modal-content">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #4285f4;"></i>
                        <p>Carregando...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal
        modal.querySelector('#close-modal').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    } else {
        modal.style.display = 'flex';
    }
    
    // Carregar conteúdo
    loadModalContent();
}

async function loadModalContent() {
    const content = document.getElementById('modal-content');
    if (!content) return;
    
    try {
        // Carregar backups
        const backups = await driveBackup.listBackups();
        
        let html = `
            <div style="margin-bottom: 20px;">
                <button id="create-backup-btn" style="background: #34a853; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%;">
                    <i class="fas fa-cloud-upload-alt"></i> Criar Novo Backup
                </button>
            </div>
        `;
        
        if (backups.length > 0) {
            html += `
                <h4>Backups Disponíveis:</h4>
                <div style="max-height: 400px; overflow-y: auto;">
            `;
            
            backups.forEach(backup => {
                const date = backup.createdTime.toLocaleDateString('pt-BR');
                const time = backup.createdTime.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                
                html += `
                    <div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 10px;">
                        <div style="font-weight: bold;">${backup.name}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">
                            ${date} ${time} • ${backup.readableSize}
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="restore-btn" data-id="${backup.id}" style="background: #4285f4; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                                <i class="fas fa-download"></i> Restaurar
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            html += `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-database" style="font-size: 40px; margin-bottom: 10px;"></i>
                    <p>Nenhum backup encontrado</p>
                </div>
            `;
        }
        
        content.innerHTML = html;
        
        // Adicionar eventos
        document.getElementById('create-backup-btn').onclick = async function() {
            if (confirm('Criar backup dos dados atuais?')) {
                try {
                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
                    
                    const systemData = window.systemData;
                    if (!systemData) {
                        throw new Error('Dados do sistema não disponíveis');
                    }
                    
                    await driveBackup.createBackup(systemData, 'Backup manual');
                    alert('Backup criado com sucesso!');
                    loadModalContent();
                } catch (error) {
                    alert('Erro: ' + error.message);
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Criar Novo Backup';
                }
            }
        };
        
        // Adicionar eventos aos botões de restaurar
        document.querySelectorAll('.restore-btn').forEach(button => {
            button.onclick = async function() {
                const fileId = this.dataset.id;
                const fileName = this.closest('div').querySelector('div').textContent;
                
                if (confirm(`Restaurar backup "${fileName}"?\n\nIsso substituirá todos os dados atuais.`)) {
                    try {
                        this.disabled = true;
                        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restaurando...';
                        
                        const backupData = await driveBackup.restoreBackup(fileId);
                        
                        // Substituir dados
                        window.systemData = backupData;
                        
                        // Salvar localmente
                        if (window.databaseManager && databaseManager.saveSystemData) {
                            await databaseManager.saveSystemData(backupData);
                        }
                        
                        // Recarregar sistema
                        if (window.loadData) loadData();
                        if (window.updateDashboard) updateDashboard();
                        if (window.updateProductsList) updateProductsList();
                        
                        alert('Backup restaurado com sucesso!');
                        document.getElementById('simple-drive-modal').remove();
                    } catch (error) {
                        alert('Erro: ' + error.message);
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-download"></i> Restaurar';
                    }
                }
            };
        });
        
    } catch (error) {
        content.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #d32f2f;">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 10px;"></i>
                <p>Erro: ${error.message}</p>
                <button onclick="loadModalContent()" style="background: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Adicionar estilos
const styles = `
<style>
    #drive-backup-btn {
        transition: all 0.3s ease;
    }
    
    #drive-backup-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .restore-btn:hover {
        opacity: 0.9;
    }
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);

console.log('✅ Drive Backup System carregado');
