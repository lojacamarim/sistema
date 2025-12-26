// ============================================
// GOOGLE DRIVE BACKUP - VERSÃO SIMPLIFICADA
// ============================================

const GOOGLE_CONFIG = {
    clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
    apiKey: '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',
    scope: 'https://www.googleapis.com/auth/drive.file',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
};

const driveState = {
    isAuthenticated: false,
    tokenClient: null,
    accessToken: null,
    gapiInited: false,
    gisInited: false
};

// ============================================
// 1. CARREGAMENTO SIMPLIFICADO DAS APIS
// ============================================

function loadGoogleApis() {
    // Carregar Google API Client
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
        gapi.load('client', initializeGapiClient);
    };
    document.head.appendChild(gapiScript);
    
    // Carregar Google Identity Services
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = initializeGisClient;
    document.head.appendChild(gisScript);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
    });
    driveState.gapiInited = true;
    maybeEnableButtons();
}

function initializeGisClient() {
    driveState.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.clientId,
        scope: GOOGLE_CONFIG.scope,
        callback: (response) => {
            if (response.error) {
                console.error('Erro de autenticação:', response);
                return;
            }
            driveState.accessToken = response.access_token;
            driveState.isAuthenticated = true;
            updateUI();
            loadBackupList();
        },
    });
    driveState.gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (driveState.gapiInited && driveState.gisInited) {
        document.getElementById('drive-login-btn').disabled = false;
    }
}

// ============================================
// 2. AUTENTICAÇÃO SIMPLES (1 CLIQUE)
// ============================================

function loginToDrive() {
    if (!driveState.tokenClient) {
        alert('API do Google não carregada. Aguarde...');
        return;
    }
    
    driveState.tokenClient.requestAccessToken();
}

function logoutFromDrive() {
    if (driveState.accessToken) {
        google.accounts.oauth2.revoke(driveState.accessToken, () => {
            console.log('Access token revoked');
        });
    }
    
    driveState.isAuthenticated = false;
    driveState.accessToken = null;
    updateUI();
    alert('Desconectado do Google Drive');
}

// ============================================
// 3. OPERAÇÕES BÁSICAS DE BACKUP
// ============================================

async function createSimpleBackup(data, description = 'Backup') {
    if (!driveState.isAuthenticated) {
        loginToDrive();
        return;
    }
    
    try {
        // 1. Criar ou encontrar pasta
        const folderId = await getOrCreateFolder('Camarim-Backups');
        
        // 2. Criar arquivo
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const fileName = `backup-${timestamp}.json`;
        const fileContent = JSON.stringify(data, null, 2);
        
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
            description: description
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', new Blob([fileContent], {type: 'application/json'}));
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driveState.accessToken}`
            },
            body: form
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        alert(`✅ Backup criado com sucesso!\nArquivo: ${fileName}`);
        return result.id;
        
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        alert(`❌ Erro: ${error.message}`);
    }
}

async function getOrCreateFolder(folderName) {
    // Buscar pasta existente
    const searchResponse = await gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive'
    });
    
    if (searchResponse.result.files && searchResponse.result.files.length > 0) {
        return searchResponse.result.files[0].id;
    }
    
    // Criar nova pasta
    const createResponse = await gapi.client.drive.files.create({
        resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
    });
    
    return createResponse.result.id;
}

async function listBackups() {
    if (!driveState.isAuthenticated) return [];
    
    try {
        const folderId = await getOrCreateFolder('Camarim-Backups');
        
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name contains 'backup-' and trashed=false`,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc',
            pageSize: 20
        });
        
        return response.result.files || [];
        
    } catch (error) {
        console.error('Erro ao listar backups:', error);
        return [];
    }
}

async function restoreBackup(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        const data = JSON.parse(response.body);
        
        // Restaurar dados no sistema
        if (confirm('Restaurar este backup? Isso substituirá todos os dados atuais.')) {
            localStorage.setItem('camarim-system-data', JSON.stringify(data));
            alert('✅ Backup restaurado! A página será recarregada.');
            location.reload();
        }
        
    } catch (error) {
        console.error('Erro ao restaurar:', error);
        alert(`❌ Erro: ${error.message}`);
    }
}

// ============================================
// 4. INTERFACE SIMPLES
// ============================================

function updateUI() {
    const container = document.getElementById('drive-container') || createDriveUI();
    
    container.innerHTML = `
        <div class="drive-section">
            <h3><i class="fab fa-google-drive"></i> Google Drive Backup</h3>
            
            ${driveState.isAuthenticated ? `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Conectado
                <button onclick="logoutFromDrive()" class="btn btn-sm btn-warning float-right">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            </div>
            
            <div class="drive-actions">
                <button onclick="createSimpleBackup(systemData, 'Backup manual')" class="btn btn-primary">
                    <i class="fas fa-save"></i> Criar Backup
                </button>
                <button onclick="refreshBackupList()" class="btn btn-info">
                    <i class="fas fa-sync"></i> Atualizar
                </button>
            </div>
            
            <div id="backups-list" class="mt-3">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin"></i> Carregando...
                </div>
            </div>
            ` : `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Conecte-se para salvar backups na nuvem
            </div>
            
            <button onclick="loginToDrive()" id="drive-login-btn" class="btn btn-success" disabled>
                <i class="fab fa-google"></i> Conectar ao Google Drive
            </button>
            
            <div class="mt-3 small text-muted">
                <i class="fas fa-shield-alt"></i> Seus dados são privados e só você tem acesso
            </div>
            `}
        </div>
    `;
    
    if (driveState.isAuthenticated) {
        refreshBackupList();
    }
}

async function refreshBackupList() {
    const listContainer = document.getElementById('backups-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    
    const backups = await listBackups();
    
    if (backups.length === 0) {
        listContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-cloud-upload-alt"></i> Nenhum backup encontrado
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = `
        <h5>Backups Disponíveis (${backups.length})</h5>
        <div class="list-group">
            ${backups.map(backup => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${backup.name}</strong>
                        <div class="small text-muted">
                            ${new Date(backup.createdTime).toLocaleString('pt-BR')}
                            ${backup.size ? ` • ${formatBytes(backup.size)}` : ''}
                        </div>
                    </div>
                    <div>
                        <button onclick="restoreBackup('${backup.id}')" class="btn btn-sm btn-success" title="Restaurar">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>
    `;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createDriveUI() {
    const container = document.createElement('div');
    container.id = 'drive-container';
    container.className = 'card mt-4';
    
    const dbView = document.getElementById('database-view');
    if (dbView) {
        dbView.appendChild(container);
    } else {
        document.body.appendChild(container);
    }
    
    return container;
}

// ============================================
// 5. INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Iniciar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadGoogleApis();
        updateUI();
    }, 1000);
});

// Exportar para uso global
window.DriveBackupSimple = {
    login: loginToDrive,
    logout: logoutFromDrive,
    createBackup: createSimpleBackup,
    listBackups: listBackups,
    restoreBackup: restoreBackup
};
