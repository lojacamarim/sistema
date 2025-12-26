// ============================================
// GOOGLE DRIVE BACKUP SYSTEM - CAMARIM
// Versão Corrigida - Resolve erros de inicialização
// ============================================

// Configurações do Google Drive API
const GOOGLE_DRIVE_CONFIG = {
    apiKey: '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',
    clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: 'https://www.googleapis.com/auth/drive.file',
    folderName: 'Camarim-Backups',
    filePrefix: 'camarim-backup-',
    fileExtension: '.json',
    maxBackupFiles: 20,
    
    redirectUris: [
        'http://localhost',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        window.location.origin
    ]
};

// Estado do Google Drive
const driveState = {
    isAuthenticated: false,
    accessToken: null,
    backupFiles: [],
    folderId: null,
    isLoading: false,
    error: null,
    apiLoaded: false,
    gapiReady: false
};

// ============================================
// INICIALIZAÇÃO DO GOOGLE DRIVE
// ============================================

async function initGoogleDrive() {
    console.log('🚀 Inicializando Google Drive Backup System...');
    
    try {
        if (!GOOGLE_DRIVE_CONFIG.clientId) {
            console.warn('⚠️ Client ID não configurado.');
            driveState.error = 'Client ID do Google Drive não configurado. Configure no arquivo drive-backup.js';
            updateDriveStatusUI();
            return false;
        }
        
        if (driveState.apiLoaded && driveState.isAuthenticated) {
            console.log('✅ Google Drive já inicializado e autenticado');
            return true;
        }
        
        console.log('🔄 Etapa 1: Carregando Google API...');
        await loadGoogleApiAsync();
        
        if (!driveState.gapiReady) {
            console.warn('⚠️ Google API não carregada corretamente');
            driveState.error = 'Não foi possível carregar a API do Google. Verifique sua conexão.';
            updateDriveStatusUI();
            return false;
        }
        
        console.log('🔄 Etapa 2: Inicializando cliente Google...');
        await initGoogleClient();
        
        if (!driveState.apiLoaded) {
            throw new Error('Falha ao inicializar cliente Google');
        }
        
        console.log('🔄 Etapa 3: Verificando autenticação...');
        await checkExistingAuth();
        
        console.log('✅ Google Drive inicializado com sucesso');
        console.log(`📊 Status: ${driveState.isAuthenticated ? 'Autenticado' : 'Não autenticado'}`);
        
        return driveState.isAuthenticated;
        
    } catch (error) {
        console.error('❌ Erro crítico ao inicializar Google Drive:', error);
        driveState.error = error.message || 'Erro desconhecido ao inicializar Google Drive';
        
        if (error.message.includes('gapi.client') || error.message.includes('setApiKey')) {
            driveState.error = 'Erro na inicialização da API. Tente recarregar a página.';
        }
        
        updateDriveStatusUI();
        return false;
    }
}

function loadGoogleApiAsync() {
    return new Promise((resolve, reject) => {
        if (window.gapi && window.gapi.load) {
            console.log('✅ Google API já disponível');
            driveState.gapiReady = true;
            resolve();
            return;
        }
        
        console.log('🔄 Carregando Google API...');
        
        if (window.__gapiLoadingPromise) {
            console.log('📦 Google API já está sendo carregada, aguardando...');
            window.__gapiLoadingPromise.then(resolve).catch(reject);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        
        window.__gapiLoadingPromise = new Promise((scriptResolve, scriptReject) => {
            script.onload = () => {
                console.log('✅ Script da Google API carregado');
                
                const checkGapi = () => {
                    if (window.gapi && window.gapi.load) {
                        console.log('✅ Google API completamente carregada');
                        driveState.gapiReady = true;
                        scriptResolve();
                    } else {
                        setTimeout(checkGapi, 100);
                    }
                };
                
                setTimeout(checkGapi, 100);
            };
            
            script.onerror = () => {
                console.error('❌ Falha ao carregar Google API');
                delete window.__gapiLoadingPromise;
                scriptReject(new Error('Falha ao carregar API do Google'));
            };
        });
        
        document.head.appendChild(script);
        
        setTimeout(() => {
            if (!driveState.gapiReady) {
                console.warn('⚠️ Timeout ao carregar Google API');
                delete window.__gapiLoadingPromise;
                reject(new Error('Timeout ao carregar Google API'));
            }
        }, 20000);
        
        window.__gapiLoadingPromise.then(resolve).catch(reject);
    });
}

async function initGoogleClient() {
    try {
        console.log('🔧 Inicializando cliente Google...');
        
        if (!window.gapi) {
            throw new Error('gapi não está disponível');
        }
        
        try {
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 15000
                });
            });
            
            console.log('✅ client:auth2 carregado');
            
            await gapi.client.init({
                apiKey: GOOGLE_DRIVE_CONFIG.apiKey || '',
                clientId: GOOGLE_DRIVE_CONFIG.clientId,
                discoveryDocs: GOOGLE_DRIVE_CONFIG.discoveryDocs,
                scope: GOOGLE_DRIVE_CONFIG.scope
            });
            
            console.log('✅ Cliente Google inicializado');
            driveState.apiLoaded = true;
            
        } catch (error) {
            console.warn('⚠️ Erro na inicialização combinada, tentando separadamente...', error);
            
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000
                });
            });
            
            console.log('✅ Cliente básico carregado');
            
            if (GOOGLE_DRIVE_CONFIG.apiKey) {
                gapi.client.setApiKey(GOOGLE_DRIVE_CONFIG.apiKey);
            }
            
            await gapi.client.load('drive', 'v3');
            
            console.log('✅ Drive API carregada');
            driveState.apiLoaded = true;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro crítico ao inicializar cliente Google:', error);
        throw new Error(`Não foi possível inicializar a API do Google: ${error.message}`);
    }
}

async function checkExistingAuth() {
    try {
        console.log('🔍 Verificando autenticação existente...');
        
        if (!gapi.auth2) {
            console.warn('⚠️ gapi.auth2 não disponível, tentando inicializar...');
            await initAuth2();
        }
        
        const authInstance = gapi.auth2.getAuthInstance();
        
        if (!authInstance) {
            console.log('⚠️ Nenhuma instância de autenticação encontrada');
            return false;
        }
        
        const user = authInstance.currentUser.get();
        const isSignedIn = user.isSignedIn();
        
        if (isSignedIn) {
            console.log('✅ Usuário já autenticado no Google Drive');
            const authResponse = user.getAuthResponse();
            
            driveState.isAuthenticated = true;
            driveState.accessToken = authResponse.access_token;
            
            await loadBackupList();
            
            return true;
        }
        
        console.log('⚠️ Usuário não autenticado');
        return false;
        
    } catch (error) {
        console.warn('⚠️ Erro ao verificar autenticação:', error);
        
        try {
            await initAuth2();
            return false;
        } catch (initError) {
            console.error('❌ Falha ao inicializar auth2:', initError);
            return false;
        }
    }
}

async function initAuth2() {
    try {
        console.log('🔄 Inicializando gapi.auth2...');
        
        if (gapi.auth2 && gapi.auth2.getAuthInstance()) {
            console.log('✅ auth2 já inicializado');
            return gapi.auth2.getAuthInstance();
        }
        
        let attempts = 0;
        while (!gapi.auth2 && attempts < 10) {
            console.log(`⏳ Aguardando gapi.auth2 (tentativa ${attempts + 1}/10)...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (!gapi.auth2) {
            await new Promise((resolve, reject) => {
                gapi.load('auth2', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000
                });
            });
        }
        
        const auth2 = await gapi.auth2.init({
            client_id: GOOGLE_DRIVE_CONFIG.clientId,
            scope: GOOGLE_DRIVE_CONFIG.scope,
            fetch_basic_profile: false
        });
        
        console.log('✅ gapi.auth2 inicializado com sucesso');
        return auth2;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar auth2:', error);
        throw error;
    }
}

async function loginToGoogleDrive() {
    try {
        console.log('🔄 Iniciando login no Google Drive...');
        
        driveState.isLoading = true;
        driveState.error = null;
        updateDriveStatusUI();
        
        const authInstance = await initAuth2();
        
        if (!authInstance) {
            throw new Error('Não foi possível inicializar a autenticação do Google.');
        }
        
        console.log('🔑 Solicitando login...');
        const user = await authInstance.signIn();
        
        const authResponse = user.getAuthResponse();
        
        if (!authResponse || !authResponse.access_token) {
            throw new Error('Token de acesso não recebido');
        }
        
        driveState.isAuthenticated = true;
        driveState.accessToken = authResponse.access_token;
        driveState.error = null;
        
        console.log('✅ Login realizado com sucesso! Token:', authResponse.access_token.substring(0, 20) + '...');
        
        await loadBackupList();
        
        showAlert('Conectado ao Google Drive com sucesso!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao fazer login:', error);
        
        let errorMessage = error.message || 'Erro desconhecido no login';
        
        if (error.error === 'popup_closed_by_user') {
            errorMessage = 'Login cancelado pelo usuário';
        } else if (error.error === 'access_denied') {
            errorMessage = 'Acesso negado pelo usuário';
        } else if (error.message && error.message.includes('The popup was closed')) {
            errorMessage = 'A janela de login foi fechada';
        }
        
        driveState.error = errorMessage;
        showAlert(`Erro ao conectar ao Google Drive: ${errorMessage}`, 'error');
        
        return false;
    } finally {
        driveState.isLoading = false;
        updateDriveStatusUI();
    }
}

async function logoutFromGoogleDrive() {
    try {
        console.log('🔄 Realizando logout do Google Drive...');
        
        try {
            const authInstance = gapi.auth2 && gapi.auth2.getAuthInstance();
            if (authInstance) {
                await authInstance.signOut();
                console.log('✅ Logout realizado com sucesso via auth2');
            }
        } catch (authError) {
            console.warn('⚠️ Não foi possível fazer logout via auth2:', authError);
        }
        
        driveState.isAuthenticated = false;
        driveState.accessToken = null;
        driveState.backupFiles = [];
        driveState.folderId = null;
        driveState.error = null;
        
        console.log('✅ Estado limpo com sucesso');
        showAlert('Desconectado do Google Drive', 'info');
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        showAlert(`Erro ao desconectar: ${error.message}`, 'error');
    } finally {
        updateDriveStatusUI();
    }
}

// ============================================
// GERENCIAMENTO DA PASTA DE BACKUP
// ============================================

async function getOrCreateBackupFolder() {
    try {
        console.log('🔍 Procurando pasta de backups...');
        
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='"+ GOOGLE_DRIVE_CONFIG.folderName +"' and trashed=false",
            fields: 'files(id, name, createdTime)',
            spaces: 'drive'
        });
        
        if (response.result.files && response.result.files.length > 0) {
            driveState.folderId = response.result.files[0].id;
            console.log(`✅ Pasta encontrada: ${driveState.folderId}`);
            return driveState.folderId;
        } else {
            console.log('📁 Criando nova pasta de backups...');
            
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: GOOGLE_DRIVE_CONFIG.folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            
            driveState.folderId = createResponse.result.id;
            console.log(`✅ Pasta criada: ${driveState.folderId}`);
            
            return driveState.folderId;
        }
        
    } catch (error) {
        console.error('❌ Erro ao obter/criar pasta:', error);
        throw error;
    }
}

// ============================================
// GERENCIAMENTO DE ARQUIVOS DE BACKUP
// ============================================

async function loadBackupList() {
    if (!driveState.isAuthenticated) {
        console.log('⚠️ Usuário não autenticado, ignorando carregamento de backups');
        return;
    }
    
    try {
        driveState.isLoading = true;
        updateDriveStatusUI();
        
        const folderId = await getOrCreateBackupFolder();
        
        console.log('📂 Carregando lista de backups...');
        
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.filePrefix}' and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime, size, description)',
            orderBy: 'modifiedTime desc',
            pageSize: 50
        });
        
        if (response.result.files && response.result.files.length > 0) {
            driveState.backupFiles = response.result.files.map(file => ({
                id: file.id,
                name: file.name,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                size: file.size ? parseInt(file.size) : 0,
                description: file.description || '',
                isLatest: false
            }));
            
            driveState.backupFiles.sort((a, b) => b.modifiedTime - a.modifiedTime);
            
            if (driveState.backupFiles.length > 0) {
                driveState.backupFiles[0].isLatest = true;
            }
            
            console.log(`✅ ${driveState.backupFiles.length} backups encontrados`);
            
        } else {
            driveState.backupFiles = [];
            console.log('📭 Nenhum backup encontrado');
        }
        
        updateBackupListUI();
        
    } catch (error) {
        console.error('❌ Erro ao carregar lista de backups:', error);
        driveState.error = error.message;
        showAlert(`Erro ao carregar backups: ${error.message}`, 'error');
    } finally {
        driveState.isLoading = false;
        updateDriveStatusUI();
    }
}

async function createBackupToDrive(data, description = 'Backup automático') {
    if (!driveState.isAuthenticated) {
        console.log('⚠️ Usuário não autenticado, ignorando backup');
        showAlert('Faça login no Google Drive para criar backups', 'warning');
        return null;
    }
    
    try {
        driveState.isLoading = true;
        updateDriveStatusUI();
        showAlert('Criando backup no Google Drive...', 'info');
        
        const folderId = await getOrCreateBackupFolder();
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const fileName = `${GOOGLE_DRIVE_CONFIG.filePrefix}${timestamp}${GOOGLE_DRIVE_CONFIG.fileExtension}`;
        
        console.log(`💾 Criando backup: ${fileName}`);
        
        const jsonData = JSON.stringify(data, null, 2);
        
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
            description: description
        };
        
        const boundary = '-------' + Date.now().toString(16);
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelimiter = "\r\n--" + boundary + "--";
        
        const contentType = 'application/json';
        const metadataPart = JSON.stringify(metadata);
        
        const multipartRequestBody = 
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            metadataPart +
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n' +
            jsonData +
            closeDelimiter;
        
        const request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'multipart',
                fields: 'id,name,createdTime,modifiedTime'
            },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });
        
        const response = await request;
        const file = response.result;
        
        console.log(`✅ Backup criado com sucesso: ${file.id}`);
        
        const backupFile = {
            id: file.id,
            name: file.name,
            createdTime: new Date(file.createdTime),
            modifiedTime: new Date(file.modifiedTime),
            size: jsonData.length,
            description: description,
            isLatest: true
        };
        
        driveState.backupFiles.forEach(f => f.isLatest = false);
        driveState.backupFiles.unshift(backupFile);
        
        if (driveState.backupFiles.length > GOOGLE_DRIVE_CONFIG.maxBackupFiles) {
            await cleanupOldBackups();
        }
        
        updateBackupListUI();
        
        const readableDate = backupFile.createdTime.toLocaleString('pt-BR');
        showAlert(`Backup criado com sucesso em ${readableDate}!`, 'success');
        
        return backupFile;
        
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        driveState.error = error.message;
        showAlert(`Erro ao criar backup: ${error.message}`, 'error');
        return null;
    } finally {
        driveState.isLoading = false;
        updateDriveStatusUI();
    }
}

async function restoreBackupFromDrive(fileId) {
    if (!driveState.isAuthenticated) {
        showAlert('Faça login no Google Drive para restaurar backups', 'warning');
        return null;
    }
    
    try {
        driveState.isLoading = true;
        updateDriveStatusUI();
        
        const backupFile = driveState.backupFiles.find(f => f.id === fileId);
        if (!backupFile) {
            throw new Error('Arquivo de backup não encontrado');
        }
        
        console.log(`🔄 Restaurando backup: ${backupFile.name}`);
        showAlert(`Restaurando backup de ${backupFile.createdTime.toLocaleDateString('pt-BR')}...`, 'info');
        
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        if (!response.body) {
            throw new Error('Arquivo de backup vazio');
        }
        
        let backupData;
        try {
            backupData = JSON.parse(response.body);
        } catch (parseError) {
            throw new Error('Arquivo de backup corrompido');
        }
        
        if (!backupData || typeof backupData !== 'object') {
            throw new Error('Estrutura de backup inválida');
        }
        
        console.log(`✅ Backup carregado: ${backupData.products?.length || 0} produtos`);
        
        showRestoreConfirmationModal(backupFile, backupData);
        
        return backupData;
        
    } catch (error) {
        console.error('❌ Erro ao restaurar backup:', error);
        showAlert(`Erro ao restaurar backup: ${error.message}`, 'error');
        return null;
    } finally {
        driveState.isLoading = false;
        updateDriveStatusUI();
    }
}

async function deleteBackupFromDrive(fileId) {
    if (!driveState.isAuthenticated) {
        return false;
    }
    
    try {
        console.log(`🗑️ Excluindo backup: ${fileId}`);
        
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
        
        console.log('✅ Backup excluído com sucesso');
        
        const index = driveState.backupFiles.findIndex(f => f.id === fileId);
        if (index !== -1) {
            driveState.backupFiles.splice(index, 1);
            
            if (driveState.backupFiles.length > 0) {
                driveState.backupFiles[0].isLatest = true;
            }
        }
        
        updateBackupListUI();
        showAlert('Backup excluído com sucesso!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao excluir backup:', error);
        showAlert(`Erro ao excluir backup: ${error.message}`, 'error');
        return false;
    }
}

async function cleanupOldBackups() {
    if (driveState.backupFiles.length <= GOOGLE_DRIVE_CONFIG.maxBackupFiles) {
        return;
    }
    
    const filesToDelete = driveState.backupFiles.slice(GOOGLE_DRIVE_CONFIG.maxBackupFiles);
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
        try {
            await gapi.client.drive.files.delete({
                fileId: file.id
            });
            deletedCount++;
        } catch (error) {
            console.warn(`⚠️ Erro ao excluir backup antigo ${file.id}:`, error);
        }
    }
    
    driveState.backupFiles = driveState.backupFiles.slice(0, GOOGLE_DRIVE_CONFIG.maxBackupFiles);
    
    if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} backups antigos removidos`);
    }
}

// ============================================
// INTERFACE DO USUÁRIO (UI)
// ============================================

function updateDriveStatusUI() {
    let driveCard = document.getElementById('drive-status-card');
    
    if (!driveCard) {
        const dashboardCards = document.querySelector('.dashboard-cards');
        if (!dashboardCards) return;
        
        driveCard = document.createElement('div');
        driveCard.className = 'card';
        driveCard.id = 'drive-status-card';
        driveCard.style.cursor = 'pointer';
        driveCard.onclick = showDriveManagerModal;
        
        dashboardCards.appendChild(driveCard);
    }
    
    let statusText = 'Desconectado';
    let statusClass = 'secondary';
    let backupCount = 'Faça login';
    
    if (driveState.isLoading) {
        statusText = 'Carregando...';
        backupCount = 'Processando...';
    } else if (driveState.error) {
        statusText = 'Erro';
        statusClass = 'danger';
        backupCount = 'Verifique conexão';
    } else if (driveState.isAuthenticated) {
        statusText = 'Conectado';
        statusClass = 'success';
        backupCount = `${driveState.backupFiles.length} backups`;
    }
    
    driveCard.innerHTML = DOMPurify.sanitize(`
        <div class="card-icon" style="background-color: rgba(66, 133, 244, 0.1); color: #4285F4;">
            <i class="fab fa-google-drive"></i>
        </div>
        <h3>Google Drive</h3>
        <div class="card-value" id="drive-status-text">${statusText}</div>
        <div class="card-change ${statusClass === 'success' ? 'positive' : statusClass === 'danger' ? 'negative' : ''}" 
             id="drive-backup-count">${backupCount}</div>
    `);
    
    updateDatabaseViewWithDrive();
}

function updateDatabaseViewWithDrive() {
    const databaseView = document.getElementById('database-view');
    if (!databaseView) return;
    
    let driveContainer = databaseView.querySelector('#drive-actions-container');
    
    if (!driveContainer) {
        driveContainer = document.createElement('div');
        driveContainer.id = 'drive-actions-container';
        driveContainer.className = 'mt-20';
        
        const dbInfoContainer = databaseView.querySelector('#db-info-container');
        if (dbInfoContainer) {
            dbInfoContainer.parentNode.insertBefore(driveContainer, dbInfoContainer.nextSibling);
        }
    }
    
    driveContainer.innerHTML = DOMPurify.sanitize(`
        <h3>Google Drive Backup</h3>
        <div class="form-row">
            <div class="form-group">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    ${!driveState.isAuthenticated ? `
                    <button class="btn btn-success" id="drive-login-btn">
                        <i class="fab fa-google-drive"></i> Conectar ao Google Drive
                    </button>
                    ` : `
                    <button class="btn btn-warning" id="drive-logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Desconectar
                    </button>
                    <button class="btn btn-info" id="refresh-backups-btn">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                    <button class="btn btn-primary" id="create-drive-backup-btn">
                        <i class="fas fa-save"></i> Novo Backup
                    </button>
                    `}
                </div>
                
                <div class="mt-10" id="drive-status-message">
                    ${driveState.isLoading ? 
                        '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Processando...</div>' : 
                        driveState.error ? 
                        `<div class="alert alert-error"><i class="fas fa-exclamation-triangle"></i> ${driveState.error}</div>` : 
                        driveState.isAuthenticated ? 
                        `<div class="alert alert-success"><i class="fas fa-check-circle"></i> Conectado ao Google Drive</div>` : 
                        '<div class="alert alert-warning"><i class="fas fa-info-circle"></i> Conecte-se ao Google Drive para backup em nuvem</div>'
                    }
                </div>
            </div>
        </div>
        
        ${driveState.isAuthenticated && driveState.backupFiles.length > 0 ? `
        <div class="table-container mt-20">
            <h4>Backups Disponíveis (${driveState.backupFiles.length})</h4>
            <table id="backup-list-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Nome</th>
                        <th>Tamanho</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="backup-list-body">
                    ${driveState.backupFiles.map(backup => `
                    <tr>
                        <td>${backup.createdTime.toLocaleString('pt-BR')}</td>
                        <td>${backup.name.replace(GOOGLE_DRIVE_CONFIG.filePrefix, '').replace(GOOGLE_DRIVE_CONFIG.fileExtension, '')}</td>
                        <td>${formatFileSize(backup.size)}</td>
                        <td>${backup.isLatest ? '<span class="badge badge-success">Mais recente</span>' : '<span class="badge badge-light">Antigo</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-success restore-backup-btn" data-id="${backup.id}" title="Restaurar">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-sm btn-info download-backup-btn" data-id="${backup.id}" title="Baixar">
                                <i class="fas fa-download"></i>
                            </button>
                            ${!backup.isLatest ? `
                            <button class="btn btn-sm btn-danger delete-backup-btn" data-id="${backup.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                            ` : ''}
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : driveState.isAuthenticated ? `
        <div class="alert alert-info mt-20">
            <i class="fas fa-info-circle"></i> Nenhum backup encontrado. Crie seu primeiro backup!
        </div>
        ` : ''}
    `);
    
    setTimeout(() => {
        const loginBtn = document.getElementById('drive-login-btn');
        const logoutBtn = document.getElementById('drive-logout-btn');
        const refreshBtn = document.getElementById('refresh-backups-btn');
        const createBackupBtn = document.getElementById('create-drive-backup-btn');
        
        if (loginBtn) loginBtn.onclick = loginToGoogleDrive;
        if (logoutBtn) logoutBtn.onclick = logoutFromGoogleDrive;
        if (refreshBtn) refreshBtn.onclick = loadBackupList;
        if (createBackupBtn) createBackupBtn.onclick = () => createBackupToDrive(systemData, 'Backup manual');
        
        document.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.onclick = () => restoreBackupFromDrive(btn.getAttribute('data-id'));
        });
        
        document.querySelectorAll('.download-backup-btn').forEach(btn => {
            btn.onclick = () => downloadBackupFile(btn.getAttribute('data-id'));
        });
        
        document.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Tem certeza que deseja excluir este backup?')) {
                    deleteBackupFromDrive(btn.getAttribute('data-id'));
                }
            };
        });
    }, 100);
}

function updateBackupListUI() {
    updateDatabaseViewWithDrive();
}

function showDriveManagerModal() {
    let modal = document.getElementById('drive-manager-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'drive-manager-modal';
        modal.innerHTML = DOMPurify.sanitize(`
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3><i class="fab fa-google-drive"></i> Gerenciador de Backups</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="drive-manager-content"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" id="close-drive-modal">Fechar</button>
                    ${driveState.isAuthenticated ? `
                    <button class="btn btn-success" id="modal-create-backup">
                        <i class="fas fa-plus"></i> Novo Backup
                    </button>
                    ` : ''}
                </div>
            </div>
        `);
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').onclick = () => modal.classList.remove('active');
        modal.querySelector('#close-drive-modal').onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    }
    
    updateDriveManagerContent();
    
    modal.classList.add('active');
}

function updateDriveManagerContent() {
    const content = document.getElementById('drive-manager-content');
    if (!content) return;
    
    content.innerHTML = DOMPurify.sanitize(`
        ${!driveState.isAuthenticated ? `
        <div class="text-center" style="padding: 40px;">
            <i class="fab fa-google-drive fa-4x" style="color: #4285F4; margin-bottom: 20px;"></i>
            <h3>Conecte-se ao Google Drive</h3>
            <p>Para usar o sistema de backup em nuvem, conecte sua conta do Google.</p>
            <button class="btn btn-success btn-lg mt-20" id="modal-connect-drive">
                <i class="fab fa-google"></i> Conectar ao Google Drive
            </button>
            <div class="mt-20" style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h5><i class="fas fa-info-circle"></i> Como configurar:</h5>
                <ol style="margin: 10px 0 0 20px;">
                    <li>Acesse <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console</a></li>
                    <li>Crie um projeto e ative a Google Drive API</li>
                    <li>Crie credenciais OAuth 2.0 Client ID</li>
                    <li>Adicione <code>${window.location.origin}</code> como origem JavaScript autorizada</li>
                    <li>Cole o Client ID no arquivo drive-backup.js</li>
                </ol>
            </div>
        </div>
        ` : `
        <div class="drive-status">
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Conectado ao Google Drive
                <button class="btn btn-sm btn-warning float-right" id="modal-disconnect-drive">
                    <i class="fas fa-sign-out-alt"></i> Desconectar
                </button>
            </div>
            
            <div class="dashboard-cards" style="grid-template-columns: repeat(3, 1fr); margin: 20px 0;">
                <div class="card">
                    <div class="card-icon" style="background-color: rgba(66, 133, 244, 0.1); color: #4285F4;">
                        <i class="fas fa-save"></i>
                    </div>
                    <h3>Backups</h3>
                    <div class="card-value">${driveState.backupFiles.length}</div>
                    <div class="card-change">Arquivos salvos</div>
                </div>
                
                <div class="card">
                    <div class="card-icon" style="background-color: rgba(52, 168, 83, 0.1); color: #34A853;">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3>Último Backup</h3>
                    <div class="card-value">
                        ${driveState.backupFiles.length > 0 ? 
                            driveState.backupFiles[0].createdTime.toLocaleDateString('pt-BR') : 
                            'Nenhum'}
                    </div>
                    <div class="card-change">
                        ${driveState.backupFiles.length > 0 ? 
                            formatFileSize(driveState.backupFiles[0].size) : 
                            ''}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-icon" style="background-color: rgba(251, 188, 5, 0.1); color: #FBBC05;">
                        <i class="fas fa-cloud"></i>
                    </div>
                    <h3>Status</h3>
                    <div class="card-value">Ativo</div>
                    <div class="card-change">Sincronização automática</div>
                </div>
            </div>
            
            <div class="drive-actions" style="text-align: center; margin: 20px 0;">
                <button class="btn btn-success" id="modal-create-backup-action">
                    <i class="fas fa-plus"></i> Criar Novo Backup
                </button>
                <button class="btn btn-info" id="modal-refresh-backups">
                    <i class="fas fa-sync"></i> Atualizar Lista
                </button>
            </div>
            
            ${driveState.backupFiles.length > 0 ? `
            <div class="table-container">
                <h4>Seus Backups</h4>
                <table class="backup-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Tamanho</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${driveState.backupFiles.map(backup => `
                        <tr>
                            <td>${backup.createdTime.toLocaleString('pt-BR')}</td>
                            <td>
                                ${backup.name.replace(GOOGLE_DRIVE_CONFIG.filePrefix, '').replace(GOOGLE_DRIVE_CONFIG.fileExtension, '')}
                                ${backup.isLatest ? '<span class="badge badge-success ml-10">Mais recente</span>' : ''}
                            </td>
                            <td>${backup.description || 'Backup do sistema'}</td>
                            <td>${formatFileSize(backup.size)}</td>
                            <td>
                                <button class="btn btn-sm btn-success modal-restore-backup" data-id="${backup.id}">
                                    <i class="fas fa-undo"></i> Restaurar
                                </button>
                                <button class="btn btn-sm btn-info modal-download-backup" data-id="${backup.id}">
                                    <i class="fas fa-download"></i>
                                </button>
                                ${!backup.isLatest ? `
                                <button class="btn btn-sm btn-danger modal-delete-backup" data-id="${backup.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : `
            <div class="alert alert-info text-center" style="margin-top: 30px;">
                <i class="fas fa-cloud-upload-alt fa-3x" style="margin-bottom: 20px; color: #4285F4;"></i>
                <h4>Nenhum backup encontrado</h4>
                <p>Crie seu primeiro backup para começar a proteger seus dados na nuvem.</p>
            </div>
            `}
        </div>
        `}
    `);
    
    setTimeout(() => {
        const connectBtn = document.getElementById('modal-connect-drive');
        const disconnectBtn = document.getElementById('modal-disconnect-drive');
        const createBackupBtn = document.getElementById('modal-create-backup') || 
                               document.getElementById('modal-create-backup-action');
        const refreshBtn = document.getElementById('modal-refresh-backups');
        
        if (connectBtn) connectBtn.onclick = async () => {
            await loginToGoogleDrive();
            updateDriveManagerContent();
        };
        
        if (disconnectBtn) disconnectBtn.onclick = async () => {
            await logoutFromGoogleDrive();
            updateDriveManagerContent();
        };
        
        if (createBackupBtn) createBackupBtn.onclick = async () => {
            const description = prompt('Descrição do backup (opcional):', 'Backup manual do sistema');
            await createBackupToDrive(systemData, description || 'Backup manual');
            updateDriveManagerContent();
        };
        
        if (refreshBtn) refreshBtn.onclick = async () => {
            await loadBackupList();
            updateDriveManagerContent();
        };
        
        document.querySelectorAll('.modal-restore-backup').forEach(btn => {
            btn.onclick = () => {
                const modal = document.getElementById('drive-manager-modal');
                if (modal) modal.classList.remove('active');
                restoreBackupFromDrive(btn.getAttribute('data-id'));
            };
        });
        
        document.querySelectorAll('.modal-download-backup').forEach(btn => {
            btn.onclick = () => downloadBackupFile(btn.getAttribute('data-id'));
        });
        
        document.querySelectorAll('.modal-delete-backup').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Excluir este backup?')) {
                    deleteBackupFromDrive(btn.getAttribute('data-id'));
                    updateDriveManagerContent();
                }
            };
        });
    }, 100);
}

function showRestoreConfirmationModal(backupFile, backupData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'restore-confirmation-modal';
    modal.innerHTML = DOMPurify.sanitize(`
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Confirmar Restauração</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-warning">
                    <strong>ATENÇÃO:</strong> Esta ação substituirá TODOS os dados atuais!
                </div>
                
                <div class="backup-info">
                    <h4>Backup selecionado:</h4>
                    <p><strong>Data:</strong> ${backupFile.createdTime.toLocaleString('pt-BR')}</p>
                    <p><strong>Arquivo:</strong> ${backupFile.name}</p>
                    <p><strong>Produtos:</strong> ${backupData.products?.length || 0}</p>
                    <p><strong>Vendas:</strong> ${backupData.sales?.length || 0}</p>
                </div>
                
                <div class="alert alert-info mt-20">
                    <i class="fas fa-info-circle"></i> 
                    Recomenda-se criar um backup atual antes de restaurar.
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-light" id="cancel-restore">Cancelar</button>
                <button class="btn btn-danger" id="confirm-restore">Restaurar Backup</button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').onclick = 
    modal.querySelector('#cancel-restore').onclick = () => {
        modal.remove();
    };
    
    modal.querySelector('#confirm-restore').onclick = async () => {
        try {
            modal.remove();
            showAlert('Restaurando backup...', 'info');
            
            window.systemData = backupData;
            
            if (typeof databaseManager !== 'undefined' && databaseManager.saveSystemData) {
                await databaseManager.saveSystemData(backupData);
            } else {
                localStorage.setItem('camarim-system-data', JSON.stringify(backupData));
            }
            
            if (typeof loadData === 'function') loadData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateProductsList === 'function') updateProductsList();
            
            showAlert('Backup restaurado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao restaurar:', error);
            showAlert(`Erro: ${error.message}`, 'error');
        }
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    setTimeout(() => modal.classList.add('active'), 10);
}

async function downloadBackupFile(fileId) {
    try {
        const backupFile = driveState.backupFiles.find(f => f.id === fileId);
        if (!backupFile) return;
        
        showAlert('Baixando backup...', 'info');
        
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        const jsonData = JSON.stringify(response.body, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = backupFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        showAlert('Backup baixado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao baixar:', error);
        showAlert(`Erro: ${error.message}`, 'error');
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showAlert(message, type = 'info') {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        console.log(`${type}: ${message}`);
        alert(`${type}: ${message}`);
    }
}

// ============================================
// INTEGRAÇÃO COM SISTEMA PRINCIPAL
// ============================================

function integrateWithMainSystem() {
    console.log('🔗 Integrando Google Drive com sistema principal...');
    
    const originalSave = databaseManager ? databaseManager.saveSystemData : null;
    
    if (originalSave) {
        databaseManager.saveSystemData = async function(data) {
            const result = await originalSave.call(this, data);
            
            if (driveState.isAuthenticated && !driveState.isLoading) {
                setTimeout(async () => {
                    try {
                        await createBackupToDrive(data, 'Backup automático');
                    } catch (error) {
                        console.warn('⚠️ Backup automático falhou:', error);
                    }
                }, 1000);
            }
            
            return result;
        };
        
        console.log('✅ Integração com saveSystemData completa');
    }
}

// ============================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================

async function initDriveBackupSystem() {
    console.log('🚀 Iniciando sistema de backup do Google Drive...');
    
    try {
        if (typeof systemData === 'undefined') {
            console.log('⏳ Aguardando sistema principal...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const success = await initGoogleDrive();
        
        if (success) {
            integrateWithMainSystem();
            
            setInterval(() => {
                if (driveState.isAuthenticated) {
                    loadBackupList().catch(console.warn);
                }
            }, 5 * 60 * 1000);
            
            console.log('✅ Sistema de backup inicializado com sucesso!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema:', error);
    }
}

// ============================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// ============================================

window.DriveBackup = {
    state: driveState,
    config: GOOGLE_DRIVE_CONFIG,
    login: loginToGoogleDrive,
    logout: logoutFromGoogleDrive,
    createBackup: createBackupToDrive,
    restoreBackup: restoreBackupFromDrive,
    listBackups: loadBackupList,
    showManager: showDriveManagerModal,
    init: initDriveBackupSystem
};

// ============================================
// INSTRUÇÕES DE CONFIGURAÇÃO EM TEMPO REAL
// ============================================

function showConfigurationInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = DOMPurify.sanitize(`
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-cog"></i> Configuração do Google Drive</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    Para usar o backup em nuvem, você precisa configurar a Google Drive API.
                </div>
                
                <h4>Passo a Passo:</h4>
                <ol>
                    <li>Acesse <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console</a></li>
                    <li>Crie um novo projeto ou selecione um existente</li>
                    <li>Ative a "Google Drive API"</li>
                    <li>Vá para "Credenciais" → "Criar Credenciais" → "ID do cliente OAuth"</li>
                    <li>Tipo de aplicativo: "Aplicativo da Web"</li>
                    <li>Nome: "Camarim Backup System"</li>
                    <li>Adicione estas URLs autorizadas:
                        <ul>
                            <li><code>http://localhost</code></li>
                            <li><code>http://localhost:5500</code></li>
                            <li><code>http://127.0.0.1:5500</code></li>
                            <li><code>${window.location.origin}</code></li>
                        </ul>
                    </li>
                    <li>Clique em "Criar"</li>
                    <li>Copie o "ID do Cliente"</li>
                    <li>Cole no arquivo <code>drive-backup.js</code> na constante <code>GOOGLE_DRIVE_CONFIG.clientId</code></li>
                </ol>
                
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Importante:</strong> Em produção, você deve usar HTTPS e configurar URLs apropriadas.
                </div>
                
                <div class="text-center mt-20">
                    <button class="btn btn-success" id="open-drive-console">
                        <i class="fab fa-google"></i> Abrir Google Cloud Console
                    </button>
                    <button class="btn btn-light" id="close-instructions">Fechar</button>
                </div>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').onclick = 
    modal.querySelector('#close-instructions').onclick = () => modal.remove();
    
    modal.querySelector('#open-drive-console').onclick = () => {
        window.open('https://console.developers.google.com/', '_blank');
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.classList.add('active');
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initDriveBackupSystem().catch(console.error);
            
            if (!GOOGLE_DRIVE_CONFIG.clientId) {
                setTimeout(showConfigurationInstructions, 3000);
            }
        }, 2000);
    });
} else {
    setTimeout(() => {
        initDriveBackupSystem().catch(console.error);
        
        if (!GOOGLE_DRIVE_CONFIG.clientId) {
            setTimeout(showConfigurationInstructions, 3000);
        }
    }, 2000);
}

// ============================================
// FIM DO ARQUIVO
// ============================================
