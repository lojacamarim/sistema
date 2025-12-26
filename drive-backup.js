// ============================================
// GOOGLE DRIVE BACKUP SYSTEM - CAMARIM
// ============================================

// Configurações do Google Drive API
const GOOGLE_DRIVE_CONFIG = {
    apiKey: 'AIzaSyBYourAPIKeyHere', // Você precisa gerar sua própria API Key
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Seu Client ID
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: 'https://www.googleapis.com/auth/drive.file',
    folderName: 'Camarim-Backups',
    filePrefix: 'camarim-backup-',
    fileExtension: '.json',
    maxBackupFiles: 20 // Número máximo de backups mantidos
};

// Estado do Google Drive
const driveState = {
    isAuthenticated: false,
    accessToken: null,
    backupFiles: [],
    folderId: null,
    isLoading: false,
    error: null
};

// ============================================
// 1. INICIALIZAÇÃO DO GOOGLE DRIVE
// ============================================

/**
 * Inicializa a API do Google Drive
 */
async function initGoogleDrive() {
    console.log('🚀 Inicializando Google Drive Backup System...');
    
    try {
        // Carregar a API do Google
        await loadGoogleApi();
        
        // Verificar se já está autenticado
        const authResponse = await checkAuth();
        
        if (authResponse) {
            console.log('✅ Usuário já autenticado no Google Drive');
            driveState.isAuthenticated = true;
            driveState.accessToken = authResponse.access_token;
            
            // Carregar lista de backups
            await loadBackupList();
            
            // Mostrar status na UI
            updateDriveStatusUI();
            
            return true;
        } else {
            console.log('⚠️ Usuário não autenticado');
            showDriveLoginButton();
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Google Drive:', error);
        driveState.error = error.message;
        showDriveError(error.message);
        return false;
    }
}

/**
 * Carrega a API do Google
 */
function loadGoogleApi() {
    return new Promise((resolve, reject) => {
        if (window.gapi && window.gapi.auth2) {
            console.log('✅ Google API já carregada');
            resolve();
            return;
        }
        
        console.log('🔄 Carregando Google API...');
        
        // Script já está incluído no index.html
        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_DRIVE_CONFIG.apiKey,
                    clientId: GOOGLE_DRIVE_CONFIG.clientId,
                    discoveryDocs: GOOGLE_DRIVE_CONFIG.discoveryDocs,
                    scope: GOOGLE_DRIVE_CONFIG.scope
                });
                
                console.log('✅ Google API inicializada com sucesso');
                resolve();
            } catch (error) {
                console.error('❌ Erro ao inicializar Google API:', error);
                reject(error);
            }
        });
    });
}

// ============================================
// 2. AUTENTICAÇÃO DO GOOGLE DRIVE
// ============================================

/**
 * Verifica se o usuário já está autenticado
 */
async function checkAuth() {
    try {
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance) {
            console.log('⚠️ Instância de autenticação não disponível');
            return null;
        }
        
        const user = authInstance.currentUser.get();
        const isSignedIn = user.isSignedIn();
        
        if (isSignedIn) {
            const authResponse = user.getAuthResponse();
            return authResponse;
        }
        
        return null;
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return null;
    }
}

/**
 * Realiza login no Google Drive
 */
async function loginToGoogleDrive() {
    try {
        console.log('🔄 Iniciando login no Google Drive...');
        
        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance) {
            throw new Error('Instância de autenticação não disponível');
        }
        
        // Solicitar login
        const user = await authInstance.signIn();
        const authResponse = user.getAuthResponse();
        
        // Atualizar estado
        driveState.isAuthenticated = true;
        driveState.accessToken = authResponse.access_token;
        
        console.log('✅ Login realizado com sucesso!');
        
        // Ocultar botão de login e mostrar status
        hideDriveLoginButton();
        updateDriveStatusUI();
        
        // Carregar lista de backups
        await loadBackupList();
        
        // Mostrar alerta de sucesso
        showAlert('Conectado ao Google Drive com sucesso!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao fazer login:', error);
        driveState.error = error.message;
        showAlert(`Erro ao conectar ao Google Drive: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Realiza logout do Google Drive
 */
async function logoutFromGoogleDrive() {
    try {
        console.log('🔄 Realizando logout do Google Drive...');
        
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
            await authInstance.signOut();
        }
        
        // Limpar estado
        driveState.isAuthenticated = false;
        driveState.accessToken = null;
        driveState.backupFiles = [];
        driveState.folderId = null;
        
        // Atualizar UI
        updateDriveStatusUI();
        showDriveLoginButton();
        
        console.log('✅ Logout realizado com sucesso!');
        showAlert('Desconectado do Google Drive', 'info');
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        showAlert(`Erro ao desconectar: ${error.message}`, 'error');
    }
}

// ============================================
// 3. GERENCIAMENTO DA PASTA DE BACKUP
// ============================================

/**
 * Cria ou obtém a pasta de backups no Google Drive
 */
async function getOrCreateBackupFolder() {
    try {
        console.log('🔍 Procurando pasta de backups...');
        
        // Procurar pasta existente
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='"+ GOOGLE_DRIVE_CONFIG.folderName +"' and trashed=false",
            fields: 'files(id, name, createdTime)',
            spaces: 'drive'
        });
        
        if (response.result.files && response.result.files.length > 0) {
            // Pasta já existe
            driveState.folderId = response.result.files[0].id;
            console.log(`✅ Pasta encontrada: ${driveState.folderId}`);
            return driveState.folderId;
        } else {
            // Criar nova pasta
            console.log('📁 Criando nova pasta de backups...');
            
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: GOOGLE_DRIVE_CONFIG.folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [] // Na raiz do Drive
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
// 4. GERENCIAMENTO DE ARQUIVOS DE BACKUP
// ============================================

/**
 * Carrega lista de backups do Google Drive
 */
async function loadBackupList() {
    if (!driveState.isAuthenticated) {
        console.log('⚠️ Usuário não autenticado, ignorando carregamento de backups');
        return;
    }
    
    try {
        driveState.isLoading = true;
        updateDriveStatusUI();
        
        // Garantir que temos a pasta
        const folderId = await getOrCreateBackupFolder();
        
        console.log('📂 Carregando lista de backups...');
        
        // Buscar arquivos JSON na pasta
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.filePrefix}' and mimeType='application/json' and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime, size, description)',
            orderBy: 'modifiedTime desc',
            pageSize: 50
        });
        
        if (response.result.files) {
            // Processar arquivos
            driveState.backupFiles = response.result.files.map(file => ({
                id: file.id,
                name: file.name,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                size: file.size ? parseInt(file.size) : 0,
                description: file.description || '',
                isLatest: false // Será definido depois
            }));
            
            // Ordenar por data (mais recente primeiro)
            driveState.backupFiles.sort((a, b) => b.modifiedTime - a.modifiedTime);
            
            // Marcar o mais recente
            if (driveState.backupFiles.length > 0) {
                driveState.backupFiles[0].isLatest = true;
            }
            
            console.log(`✅ ${driveState.backupFiles.length} backups encontrados`);
            
        } else {
            driveState.backupFiles = [];
            console.log('📭 Nenhum backup encontrado');
        }
        
        // Atualizar UI
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

/**
 * Cria um novo backup no Google Drive
 * @param {Object} data - Dados do sistema a serem salvos
 * @param {string} description - Descrição do backup
 */
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
        
        // Garantir que temos a pasta
        const folderId = await getOrCreateBackupFolder();
        
        // Nome do arquivo com timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${GOOGLE_DRIVE_CONFIG.filePrefix}${timestamp}${GOOGLE_DRIVE_CONFIG.fileExtension}`;
        
        console.log(`💾 Criando backup: ${fileName}`);
        
        // Converter dados para JSON
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Criar metadados do arquivo
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
            description: description,
            appProperties: {
                appName: 'Camarim-System',
                version: '1.0',
                backupType: 'full'
            }
        };
        
        // Criar o arquivo no Google Drive
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,modifiedTime', {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${driveState.accessToken}`
            }),
            body: form
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const file = await response.json();
        
        console.log(`✅ Backup criado com sucesso: ${file.id}`);
        
        // Adicionar à lista local
        const backupFile = {
            id: file.id,
            name: file.name,
            createdTime: new Date(file.createdTime),
            modifiedTime: new Date(file.modifiedTime),
            size: jsonData.length,
            description: description,
            isLatest: true
        };
        
        // Adicionar no início da lista e marcar os outros como não mais recentes
        driveState.backupFiles.forEach(f => f.isLatest = false);
        driveState.backupFiles.unshift(backupFile);
        
        // Limitar número de backups
        if (driveState.backupFiles.length > GOOGLE_DRIVE_CONFIG.maxBackupFiles) {
            console.log(`🗑️ Removendo backups antigos (mantendo apenas ${GOOGLE_DRIVE_CONFIG.maxBackupFiles})`);
            
            const filesToDelete = driveState.backupFiles.slice(GOOGLE_DRIVE_CONFIG.maxBackupFiles);
            for (const fileToDelete of filesToDelete) {
                await deleteBackupFromDrive(fileToDelete.id, false); // false = não atualizar UI ainda
            }
            
            // Manter apenas os mais recentes
            driveState.backupFiles = driveState.backupFiles.slice(0, GOOGLE_DRIVE_CONFIG.maxBackupFiles);
        }
        
        // Atualizar UI
        updateBackupListUI();
        updateDriveStatusUI();
        
        // Mostrar sucesso
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

/**
 * Restaura um backup do Google Drive
 * @param {string} fileId - ID do arquivo a ser restaurado
 */
async function restoreBackupFromDrive(fileId) {
    if (!driveState.isAuthenticated) {
        console.log('⚠️ Usuário não autenticado, ignorando restauração');
        showAlert('Faça login no Google Drive para restaurar backups', 'warning');
        return null;
    }
    
    try {
        driveState.isLoading = true;
        updateDriveStatusUI();
        
        // Encontrar o arquivo na lista
        const backupFile = driveState.backupFiles.find(f => f.id === fileId);
        if (!backupFile) {
            throw new Error('Arquivo de backup não encontrado');
        }
        
        console.log(`🔄 Restaurando backup: ${backupFile.name}`);
        showAlert(`Restaurando backup de ${backupFile.createdTime.toLocaleDateString('pt-BR')}...`, 'info');
        
        // Baixar o arquivo
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        // Verificar se os dados são válidos
        if (!response.body) {
            throw new Error('Arquivo de backup vazio ou corrompido');
        }
        
        let backupData;
        try {
            backupData = JSON.parse(response.body);
        } catch (parseError) {
            throw new Error('Arquivo de backup corrompido (formato JSON inválido)');
        }
        
        // Validar estrutura básica dos dados
        if (!backupData || typeof backupData !== 'object') {
            throw new Error('Estrutura de backup inválida');
        }
        
        if (!backupData.products || !Array.isArray(backupData.products)) {
            throw new Error('Backup não contém dados de produtos válidos');
        }
        
        console.log(`✅ Backup carregado: ${backupData.products.length} produtos, ${backupData.sales?.length || 0} vendas`);
        
        // Formatar dados para exibição
        const backupInfo = {
            fileName: backupFile.name,
            date: backupFile.createdTime.toLocaleString('pt-BR'),
            products: backupData.products.length,
            sales: backupData.sales?.length || 0,
            settings: backupData.settings ? 'Sim' : 'Não'
        };
        
        // Mostrar modal de confirmação
        showRestoreConfirmationModal(backupInfo, backupData);
        
        return backupData;
        
    } catch (error) {
        console.error('❌ Erro ao restaurar backup:', error);
        driveState.error = error.message;
        showAlert(`Erro ao restaurar backup: ${error.message}`, 'error');
        return null;
    } finally {
        driveState.isLoading = false;
        updateDriveStatusUI();
    }
}

/**
 * Deleta um backup do Google Drive
 * @param {string} fileId - ID do arquivo a ser deletado
 * @param {boolean} updateUI - Se deve atualizar a UI após deletar
 */
async function deleteBackupFromDrive(fileId, updateUI = true) {
    if (!driveState.isAuthenticated) {
        console.log('⚠️ Usuário não autenticado, ignorando exclusão');
        return false;
    }
    
    try {
        console.log(`🗑️ Excluindo backup: ${fileId}`);
        
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
        
        console.log('✅ Backup excluído com sucesso');
        
        // Remover da lista local
        driveState.backupFiles = driveState.backupFiles.filter(f => f.id !== fileId);
        
        // Atualizar status "isLatest"
        if (driveState.backupFiles.length > 0) {
            driveState.backupFiles[0].isLatest = true;
            driveState.backupFiles.slice(1).forEach(f => f.isLatest = false);
        }
        
        if (updateUI) {
            updateBackupListUI();
            updateDriveStatusUI();
            showAlert('Backup excluído com sucesso!', 'success');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao excluir backup:', error);
        showAlert(`Erro ao excluir backup: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Deleta todos os backups antigos (mantém apenas os X mais recentes)
 */
async function cleanupOldBackups() {
    try {
        if (driveState.backupFiles.length <= GOOGLE_DRIVE_CONFIG.maxBackupFiles) {
            console.log('✅ Número de backups dentro do limite, nada para limpar');
            return;
        }
        
        console.log(`🧹 Limpando backups antigos (mantendo ${GOOGLE_DRIVE_CONFIG.maxBackupFiles} mais recentes)...`);
        
        const filesToDelete = driveState.backupFiles.slice(GOOGLE_DRIVE_CONFIG.maxBackupFiles);
        let deletedCount = 0;
        
        for (const file of filesToDelete) {
            const success = await deleteBackupFromDrive(file.id, false);
            if (success) {
                deletedCount++;
            }
        }
        
        // Atualizar lista local
        driveState.backupFiles = driveState.backupFiles.slice(0, GOOGLE_DRIVE_CONFIG.maxBackupFiles);
        
        // Atualizar UI
        updateBackupListUI();
        updateDriveStatusUI();
        
        console.log(`✅ ${deletedCount} backups antigos removidos`);
        showAlert(`${deletedCount} backups antigos removidos automaticamente`, 'info');
        
    } catch (error) {
        console.error('❌ Erro na limpeza de backups:', error);
    }
}

// ============================================
// 5. INTEGRAÇÃO COM O SISTEMA PRINCIPAL
// ============================================

/**
 * Integra o Google Drive com o sistema principal
 */
function integrateWithMainSystem() {
    console.log('🔗 Integrando Google Drive com sistema principal...');
    
    // Sobrescrever/estender a função saveData do sistema principal
    const originalSaveData = window.saveData || databaseManager.saveSystemData;
    
    window.saveDataWithBackup = async function(data) {
        // Salvar localmente (comportamento original)
        const localResult = await originalSaveData.call(databaseManager, data);
        
        // Criar backup no Google Drive (se autenticado)
        if (driveState.isAuthenticated && !driveState.isLoading) {
            try {
                await createBackupToDrive(data, 'Backup automático do sistema');
            } catch (backupError) {
                console.warn('⚠️ Backup automático falhou, mas dados foram salvos localmente:', backupError);
            }
        }
        
        return localResult;
    };
    
    // Sobrescrever a função saveData original
    if (typeof databaseManager.saveSystemData === 'function') {
        const originalSave = databaseManager.saveSystemData;
        databaseManager.saveSystemData = async function(data) {
            const result = await originalSave.call(this, data);
            
            if (driveState.isAuthenticated && !driveState.isLoading) {
                setTimeout(async () => {
                    try {
                        await createBackupToDrive(data, 'Backup automático');
                    } catch (error) {
                        console.warn('⚠️ Falha no backup automático:', error);
                    }
                }, 1000);
            }
            
            return result;
        };
    }
    
    console.log('✅ Integração com sistema principal completa');
}

/**
 * Atualiza automaticamente os backups
 */
async function autoUpdateBackups() {
    if (!driveState.isAuthenticated) return;
    
    try {
        console.log('🔄 Verificando atualizações de backup...');
        await loadBackupList();
        
        // Limpar backups antigos automaticamente
        await cleanupOldBackups();
        
    } catch (error) {
        console.warn('⚠️ Erro na atualização automática de backups:', error);
    }
}

// ============================================
// 6. INTERFACE DO USUÁRIO (UI)
// ============================================

/**
 * Atualiza o status do Google Drive na UI
 */
function updateDriveStatusUI() {
    // Adicionar ou atualizar elementos na UI
    
    // 1. Status no dashboard
    const dashboardCards = document.querySelector('.dashboard-cards');
    if (dashboardCards && !document.getElementById('drive-status-card')) {
        const driveCard = document.createElement('div');
        driveCard.className = 'card';
        driveCard.id = 'drive-status-card';
        driveCard.innerHTML = `
            <div class="card-icon" style="background-color: rgba(66, 133, 244, 0.1); color: #4285F4;">
                <i class="fab fa-google-drive"></i>
            </div>
            <h3>Google Drive</h3>
            <div class="card-value" id="drive-status-text">${driveState.isAuthenticated ? 'Conectado' : 'Desconectado'}</div>
            <div class="card-change" id="drive-backup-count">
                ${driveState.isAuthenticated ? `${driveState.backupFiles.length} backups` : 'Faça login'}
            </div>
        `;
        dashboardCards.appendChild(driveCard);
        
        // Adicionar evento de clique para abrir gerenciador
        driveCard.addEventListener('click', () => {
            showDriveManagerModal();
        });
    } else if (document.getElementById('drive-status-text')) {
        document.getElementById('drive-status-text').textContent = 
            driveState.isAuthenticated ? 'Conectado' : 'Desconectado';
        
        const backupCountElement = document.getElementById('drive-backup-count');
        if (backupCountElement) {
            if (driveState.isAuthenticated) {
                backupCountElement.textContent = 
                    driveState.isLoading ? 'Carregando...' : `${driveState.backupFiles.length} backups`;
            } else {
                backupCountElement.textContent = 'Faça login';
            }
        }
    }
    
    // 2. Botões na view de banco de dados
    updateDatabaseViewWithDrive();
    
    // 3. Botão na view de configurações
    updateSettingsViewWithDrive();
}

/**
 * Atualiza a view de banco de dados com controles do Google Drive
 */
function updateDatabaseViewWithDrive() {
    const databaseView = document.getElementById('database-view');
    if (!databaseView) return;
    
    // Encontrar ou criar container para controles do Drive
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
    
    // Atualizar conteúdo do container
    driveContainer.innerHTML = DOMPurify.sanitize(`
        <h3>Google Drive Backup</h3>
        <div class="form-row">
            <div class="form-group">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn ${driveState.isAuthenticated ? 'btn-warning' : 'btn-success'}" id="drive-login-btn">
                        <i class="fab fa-google-drive"></i> 
                        ${driveState.isAuthenticated ? 'Desconectar' : 'Conectar ao Google Drive'}
                    </button>
                    
                    ${driveState.isAuthenticated ? `
                    <button class="btn btn-info" id="refresh-backups-btn">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                    <button class="btn btn-primary" id="create-drive-backup-btn">
                        <i class="fas fa-save"></i> Novo Backup
                    </button>
                    ` : ''}
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
        
        ${driveState.isAuthenticated ? `
        <div class="table-container mt-20" id="backup-list-container" style="${driveState.backupFiles.length === 0 ? 'display: none;' : ''}">
            <h4>Backups Disponíveis</h4>
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
                    <!-- Será preenchido por updateBackupListUI() -->
                </tbody>
            </table>
        </div>
        
        ${driveState.backupFiles.length === 0 ? 
            '<div class="alert alert-info mt-20"><i class="fas fa-info-circle"></i> Nenhum backup encontrado. Crie seu primeiro backup!</div>' : 
            ''
        }
        ` : ''}
    `);
    
    // Adicionar event listeners
    setTimeout(() => {
        const loginBtn = document.getElementById('drive-login-btn');
        const refreshBtn = document.getElementById('refresh-backups-btn');
        const createBackupBtn = document.getElementById('create-drive-backup-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                if (driveState.isAuthenticated) {
                    await logoutFromGoogleDrive();
                } else {
                    await loginToGoogleDrive();
                }
            });
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadBackupList();
            });
        }
        
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', async () => {
                await createBackupToDrive(systemData, 'Backup manual');
            });
        }
    }, 100);
}

/**
 * Atualiza a view de configurações com botão do Google Drive
 */
function updateSettingsViewWithDrive() {
    const settingsView = document.getElementById('settings-view');
    if (!settingsView) return;
    
    const gerenciamentoTitle = settingsView.querySelector('h3');
    if (!gerenciamentoTitle || !gerenciamentoTitle.textContent.includes('Gerenciamento de Dados')) {
        return;
    }
    
    // Encontrar a linha de exportação de dados
    const exportRow = settingsView.querySelector('.form-row');
    if (!exportRow) return;
    
    // Adicionar botão do Google Drive se não existir
    if (!settingsView.querySelector('#drive-manager-btn')) {
        const driveGroup = document.createElement('div');
        driveGroup.className = 'form-group';
        driveGroup.innerHTML = DOMPurify.sanitize(`
            <label>Backup em Nuvem</label>
            <button type="button" class="btn btn-primary btn-block" id="drive-manager-btn">
                <i class="fab fa-google-drive"></i> Gerenciar Google Drive
            </button>
            <div class="form-text">Backup automático e restauração em nuvem</div>
        `);
        
        exportRow.appendChild(driveGroup);
        
        // Adicionar event listener
        document.getElementById('drive-manager-btn').addEventListener('click', () => {
            showDriveManagerModal();
        });
    }
}

/**
 * Atualiza a lista de backups na UI
 */
function updateBackupListUI() {
    const backupListBody = document.getElementById('backup-list-body');
    if (!backupListBody) return;
    
    backupListBody.innerHTML = '';
    
    if (driveState.backupFiles.length === 0) {
        const container = document.getElementById('backup-list-container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }
    
    // Mostrar container
    const container = document.getElementById('backup-list-container');
    if (container) {
        container.style.display = 'block';
    }
    
    // Adicionar cada backup à tabela
    driveState.backupFiles.forEach(backup => {
        const row = document.createElement('tr');
        
        // Data formatada
        const dateCell = document.createElement('td');
        dateCell.textContent = backup.createdTime.toLocaleString('pt-BR');
        row.appendChild(dateCell);
        
        // Nome (sem o prefixo e timestamp)
        const nameCell = document.createElement('td');
        const displayName = backup.name
            .replace(GOOGLE_DRIVE_CONFIG.filePrefix, '')
            .replace(GOOGLE_DRIVE_CONFIG.fileExtension, '')
            .replace(/-/g, ':')
            .replace('T', ' ');
        nameCell.textContent = displayName;
        row.appendChild(nameCell);
        
        // Tamanho formatado
        const sizeCell = document.createElement('td');
        sizeCell.textContent = formatFileSize(backup.size);
        row.appendChild(sizeCell);
        
        // Status
        const statusCell = document.createElement('td');
        if (backup.isLatest) {
            statusCell.innerHTML = '<span class="badge badge-success">Mais recente</span>';
        } else {
            statusCell.innerHTML = '<span class="badge badge-light">Antigo</span>';
        }
        row.appendChild(statusCell);
        
        // Ações
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        // Botão Restaurar
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn btn-small btn-success restore-backup-btn';
        restoreBtn.setAttribute('data-id', backup.id);
        restoreBtn.setAttribute('title', 'Restaurar este backup');
        restoreBtn.innerHTML = '<i class="fas fa-undo"></i>';
        actionsCell.appendChild(restoreBtn);
        
        // Botão Download
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-small btn-info download-backup-btn';
        downloadBtn.setAttribute('data-id', backup.id);
        downloadBtn.setAttribute('title', 'Baixar backup');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        actionsCell.appendChild(downloadBtn);
        
        // Botão Excluir (apenas se não for o mais recente)
        if (!backup.isLatest) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger delete-backup-btn';
            deleteBtn.setAttribute('data-id', backup.id);
            deleteBtn.setAttribute('title', 'Excluir backup');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            actionsCell.appendChild(deleteBtn);
        }
        
        row.appendChild(actionsCell);
        backupListBody.appendChild(row);
    });
    
    // Adicionar event listeners
    setTimeout(() => {
        document.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                restoreBackupFromDrive(fileId);
            });
        });
        
        document.querySelectorAll('.download-backup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                downloadBackupFile(fileId);
            });
        });
        
        document.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.')) {
                    deleteBackupFromDrive(fileId);
                }
            });
        });
    }, 100);
}

/**
 * Mostra botão de login do Google Drive
 */
function showDriveLoginButton() {
    // Será mostrado no updateDriveStatusUI
    updateDriveStatusUI();
}

/**
 * Oculta botão de login do Google Drive
 */
function hideDriveLoginButton() {
    // Será atualizado no updateDriveStatusUI
    updateDriveStatusUI();
}

/**
 * Mostra erro do Google Drive
 */
function showDriveError(message) {
    showAlert(`Erro no Google Drive: ${message}`, 'error');
}

/**
 * Mostra modal de gerenciamento do Google Drive
 */
function showDriveManagerModal() {
    // Criar modal se não existir
    let modal = document.getElementById('drive-manager-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'drive-manager-modal';
        modal.innerHTML = DOMPurify.sanitize(`
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3><i class="fab fa-google-drive"></i> Gerenciador de Backups - Google Drive</h3>
                    <button class="modal-close" data-modal="drive-manager-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="drive-manager-content">
                        <!-- Conteúdo será atualizado dinamicamente -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" data-modal="drive-manager-modal">Fechar</button>
                    ${driveState.isAuthenticated ? `
                    <button class="btn btn-success" id="create-backup-now-btn">
                        <i class="fas fa-plus"></i> Novo Backup
                    </button>
                    ` : ''}
                </div>
            </div>
        `);
        document.body.appendChild(modal);
        
        // Adicionar event listener para fechar
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.querySelector('.btn[data-modal="drive-manager-modal"]').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Clique fora para fechar
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }
    
    // Atualizar conteúdo do modal
    updateDriveManagerContent();
    
    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Atualiza o conteúdo do modal de gerenciamento
 */
function updateDriveManagerContent() {
    const content = document.getElementById('drive-manager-content');
    if (!content) return;
    
    content.innerHTML = DOMPurify.sanitize(`
        <div class="drive-manager">
            ${!driveState.isAuthenticated ? `
            <div class="text-center" style="padding: 40px;">
                <i class="fab fa-google-drive fa-4x" style="color: #4285F4; margin-bottom: 20px;"></i>
                <h3>Conecte-se ao Google Drive</h3>
                <p>Para usar o sistema de backup em nuvem, conecte sua conta do Google Drive.</p>
                <button class="btn btn-success btn-lg mt-20" id="connect-drive-btn">
                    <i class="fab fa-google"></i> Conectar ao Google Drive
                </button>
                <p class="mt-20" style="font-size: 0.9em; color: #666;">
                    Seus dados serão armazenados de forma segura e só você terá acesso.
                </p>
            </div>
            ` : `
            <div class="drive-status">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> Conectado ao Google Drive
                    <button class="btn btn-sm btn-warning float-right" id="disconnect-drive-btn">
                        <i class="fas fa-sign-out-alt"></i> Desconectar
                    </button>
                </div>
                
                <div class="row" style="display: flex; gap: 20px; margin: 20px 0;">
                    <div class="card" style="flex: 1;">
                        <div class="card-icon" style="background-color: rgba(66, 133, 244, 0.1); color: #4285F4;">
                            <i class="fas fa-save"></i>
                        </div>
                        <h4>Backups</h4>
                        <div class="card-value">${driveState.backupFiles.length}</div>
                        <div class="card-change">Arquivos salvos</div>
                    </div>
                    
                    <div class="card" style="flex: 1;">
                        <div class="card-icon" style="background-color: rgba(52, 168, 83, 0.1); color: #34A853;">
                            <i class="fas fa-history"></i>
                        </div>
                        <h4>Último Backup</h4>
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
                    
                    <div class="card" style="flex: 1;">
                        <div class="card-icon" style="background-color: rgba(251, 188, 5, 0.1); color: #FBBC05;">
                            <i class="fas fa-cloud"></i>
                        </div>
                        <h4>Espaço</h4>
                        <div class="card-value">15 GB</div>
                        <div class="card-change">Livre no Google Drive</div>
                    </div>
                </div>
                
                <div class="drive-actions mt-20">
                    <button class="btn btn-success" id="create-backup-action-btn">
                        <i class="fas fa-plus"></i> Criar Novo Backup
                    </button>
                    <button class="btn btn-info" id="refresh-backups-action-btn">
                        <i class="fas fa-sync"></i> Atualizar Lista
                    </button>
                    <button class="btn btn-light" id="auto-backup-settings-btn">
                        <i class="fas fa-cog"></i> Configurações
                    </button>
                </div>
                
                ${driveState.backupFiles.length > 0 ? `
                <div class="table-container mt-20">
                    <h4>Backups Disponíveis</h4>
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
                        <tbody id="modal-backup-list">
                            <!-- Será preenchido abaixo -->
                        </tbody>
                    </table>
                </div>
                ` : `
                <div class="alert alert-info mt-20">
                    <i class="fas fa-info-circle"></i> Nenhum backup encontrado. Crie seu primeiro backup!
                </div>
                `}
            </div>
            `}
        </div>
    `);
    
    // Preencher lista de backups no modal
    if (driveState.isAuthenticated && driveState.backupFiles.length > 0) {
        const backupList = document.getElementById('modal-backup-list');
        if (backupList) {
            driveState.backupFiles.forEach(backup => {
                const row = document.createElement('tr');
                
                row.innerHTML = DOMPurify.sanitize(`
                    <td>${backup.createdTime.toLocaleString('pt-BR')}</td>
                    <td>
                        ${backup.name.replace(GOOGLE_DRIVE_CONFIG.filePrefix, '').replace(GOOGLE_DRIVE_CONFIG.fileExtension, '')}
                        ${backup.isLatest ? '<span class="badge badge-success ml-10">Mais recente</span>' : ''}
                    </td>
                    <td>${backup.description || 'Backup do sistema'}</td>
                    <td>${formatFileSize(backup.size)}</td>
                    <td>
                        <button class="btn btn-sm btn-success restore-backup-modal" data-id="${backup.id}">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                        <button class="btn btn-sm btn-info download-backup-modal" data-id="${backup.id}">
                            <i class="fas fa-download"></i>
                        </button>
                        ${!backup.isLatest ? `
                        <button class="btn btn-sm btn-danger delete-backup-modal" data-id="${backup.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </td>
                `);
                
                backupList.appendChild(row);
            });
        }
    }
    
    // Adicionar event listeners
    setTimeout(() => {
        // Botão conectar
        const connectBtn = document.getElementById('connect-drive-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                await loginToGoogleDrive();
                updateDriveManagerContent();
            });
        }
        
        // Botão desconectar
        const disconnectBtn = document.getElementById('disconnect-drive-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', async () => {
                await logoutFromGoogleDrive();
                updateDriveManagerContent();
            });
        }
        
        // Botões de ação
        const createBackupBtn = document.getElementById('create-backup-action-btn') || 
                               document.getElementById('create-backup-now-btn') ||
                               document.getElementById('create-backup-action-btn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', async () => {
                const description = prompt('Digite uma descrição para este backup (opcional):', 'Backup manual do sistema');
                await createBackupToDrive(systemData, description || 'Backup manual');
                updateDriveManagerContent();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-backups-action-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadBackupList();
                updateDriveManagerContent();
            });
        }
        
        // Botões de backup no modal
        document.querySelectorAll('.restore-backup-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                const modal = document.getElementById('drive-manager-modal');
                if (modal) modal.classList.remove('active');
                restoreBackupFromDrive(fileId);
            });
        });
        
        document.querySelectorAll('.download-backup-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                downloadBackupFile(fileId);
            });
        });
        
        document.querySelectorAll('.delete-backup-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este backup?')) {
                    deleteBackupFromDrive(fileId);
                    updateDriveManagerContent();
                }
            });
        });
    }, 100);
}

/**
 * Mostra modal de confirmação para restaurar backup
 */
function showRestoreConfirmationModal(backupInfo, backupData) {
    // Criar modal de confirmação
    let modal = document.getElementById('restore-confirmation-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'restore-confirmation-modal';
        modal.innerHTML = DOMPurify.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Confirmar Restauração</h3>
                    <button class="modal-close" data-modal="restore-confirmation-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="restore-confirmation-content">
                        <!-- Conteúdo será preenchido dinamicamente -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" data-modal="restore-confirmation-modal">Cancelar</button>
                    <button class="btn btn-danger" id="confirm-restore-btn">Restaurar</button>
                </div>
            </div>
        `);
        document.body.appendChild(modal);
        
        // Adicionar event listeners para fechar
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.querySelector('.btn[data-modal="restore-confirmation-modal"]').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }
    
    // Preencher conteúdo
    const content = document.getElementById('restore-confirmation-content');
    content.innerHTML = DOMPurify.sanitize(`
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> 
            <strong>ATENÇÃO:</strong> Esta ação irá substituir TODOS os dados atuais do sistema!
        </div>
        
        <div class="backup-info">
            <h4>Informações do Backup:</h4>
            <table class="table" style="width: 100%;">
                <tr>
                    <td><strong>Arquivo:</strong></td>
                    <td>${backupInfo.fileName}</td>
                </tr>
                <tr>
                    <td><strong>Data:</strong></td>
                    <td>${backupInfo.date}</td>
                </tr>
                <tr>
                    <td><strong>Produtos:</strong></td>
                    <td>${backupInfo.products}</td>
                </tr>
                <tr>
                    <td><strong>Vendas:</strong></td>
                    <td>${backupInfo.sales}</td>
                </tr>
                <tr>
                    <td><strong>Configurações:</strong></td>
                    <td>${backupInfo.settings}</td>
                </tr>
            </table>
        </div>
        
        <div class="alert alert-info mt-20">
            <i class="fas fa-info-circle"></i> 
            Recomenda-se criar um backup atual antes de restaurar.
        </div>
    `);
    
    // Configurar botão de confirmação
    const confirmBtn = document.getElementById('confirm-restore-btn');
    confirmBtn.onclick = async function() {
        try {
            modal.classList.remove('active');
            showAlert('Restaurando backup...', 'info');
            
            // Atualizar systemData global
            window.systemData = backupData;
            
            // Salvar localmente
            await databaseManager.saveSystemData(backupData);
            
            // Recarregar todas as views
            if (typeof loadData === 'function') loadData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateProductsList === 'function') updateProductsList();
            if (typeof updateSalesList === 'function') updateSalesList();
            if (typeof updateReports === 'function') updateReports();
            if (typeof updateDatabaseInfo === 'function') updateDatabaseInfo();
            if (typeof updateInventorySummary === 'function') updateInventorySummary();
            
            showAlert('Backup restaurado com sucesso! Sistema recarregado.', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
            showAlert(`Erro ao restaurar backup: ${error.message}`, 'error');
        }
    };
    
    // Mostrar modal
    modal.classList.add('active');
}

/**
 * Baixa um arquivo de backup localmente
 */
async function downloadBackupFile(fileId) {
    try {
        const backupFile = driveState.backupFiles.find(f => f.id === fileId);
        if (!backupFile) {
            throw new Error('Arquivo não encontrado');
        }
        
        showAlert('Baixando backup...', 'info');
        
        // Obter conteúdo do arquivo
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        // Criar blob e link de download
        const jsonData = JSON.stringify(response.body, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = backupFile.name;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showAlert('Backup baixado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao baixar backup:', error);
        showAlert(`Erro ao baixar backup: ${error.message}`, 'error');
    }
}

// ============================================
// 7. FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Formata tamanho de arquivo de forma legível
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Mostra alerta no sistema
 */
function showAlert(message, type = 'info') {
    // Usar sistema de alerta existente ou criar um básico
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(`${type}: ${message}`);
    }
}

// ============================================
// 8. INICIALIZAÇÃO DO SISTEMA
// ============================================

/**
 * Inicializa o sistema de backup do Google Drive
 */
async function initDriveBackupSystem() {
    console.log('🚀 Iniciando sistema de backup do Google Drive...');
    
    try {
        // Aguardar carregamento do sistema principal
        if (typeof systemData === 'undefined') {
            console.log('⏳ Aguardando sistema principal...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Inicializar Google Drive
        await initGoogleDrive();
        
        // Integrar com sistema principal
        integrateWithMainSystem();
        
        // Configurar atualizações periódicas
        setInterval(() => {
            autoUpdateBackups();
        }, 5 * 60 * 1000); // A cada 5 minutos
        
        console.log('✅ Sistema de backup do Google Drive inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema de backup:', error);
    }
}

// ============================================
// 9. EXPORTAÇÃO PARA ESCOPO GLOBAL
// ============================================

// Exportar funções principais para o escopo global
window.DriveBackupSystem = {
    // Estado
    state: driveState,
    
    // Autenticação
    login: loginToGoogleDrive,
    logout: logoutFromGoogleDrive,
    
    // Backup
    createBackup: createBackupToDrive,
    restoreBackup: restoreBackupFromDrive,
    deleteBackup: deleteBackupFromDrive,
    listBackups: loadBackupList,
    
    // UI
    showManager: showDriveManagerModal,
    
    // Utilitários
    init: initDriveBackupSystem,
    isAvailable: () => driveState.isAuthenticated
};

// ============================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Inicializar quando o documento estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Pequeno delay para garantir que o sistema principal está carregado
        setTimeout(() => {
            initDriveBackupSystem().catch(console.error);
        }, 2000);
    });
} else {
    // Documento já carregado
    setTimeout(() => {
        initDriveBackupSystem().catch(console.error);
    }, 2000);
}

// ============================================
// INSTRUÇÕES DE CONFIGURAÇÃO
// ============================================

/*
PARA CONFIGURAR O GOOGLE DRIVE API:

1. Acesse: https://console.developers.google.com/
2. Crie um novo projeto ou selecione um existente
3. Ative a Google Drive API
4. Configure a tela de consentimento OAuth:
   - Tipo de aplicativo: Web
   - Nome: Camarim Backup System
   - Escopos: .../auth/drive.file
   - URLs autorizadas: http://localhost (para desenvolvimento)

5. Crie credenciais:
   - Tipo: ID do cliente OAuth
   - Tipo de aplicativo: Aplicativo da Web
   - URLs de redirecionamento autorizadas:
     * http://localhost (para desenvolvimento)
     * Seu domínio em produção

6. Copie o Client ID e cole na constante GOOGLE_DRIVE_CONFIG

7. Para API Key (opcional, mas recomendado):
   - Crie uma chave de API sem restrições (apenas para desenvolvimento)
   - Em produção, restrinja por referenciador HTTP

NOTA: Em produção, você deve hospedar em HTTPS e configurar URLs apropriadas.
*/

// Expor configuração para fácil edição
window.DriveBackupConfig = GOOGLE_DRIVE_CONFIG;
