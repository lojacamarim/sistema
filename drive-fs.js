// Usando DriveFS (biblioteca simplificada)
// Adicione no HTML: <script src="https://unpkg.com/drivefs"></script>

const driveFS = new DriveFS({
    clientId: 'SEU_CLIENT_ID',
    apiKey: 'SUA_API_KEY'
});

// Backup com 3 linhas de código:
async function backupSimples() {
    await driveFS.signIn(); // Login com 1 clique
    await driveFS.uploadFile('backup.json', JSON.stringify(systemData));
    alert('Backup salvo no Drive!');
}

// Restaurar backup:
async function restaurarSimples() {
    const files = await driveFS.listFiles('backup.json');
    if (files.length > 0) {
        const data = await driveFS.downloadFile(files[0].id);
        localStorage.setItem('camarim-data', data);
        alert('Dados restaurados!');
    }
}