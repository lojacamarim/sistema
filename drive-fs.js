// Usando DriveFS (biblioteca simplificada)
// Adicione no HTML: <script src="https://unpkg.com/drivefs"></script>

const driveFS = new DriveFS({
    clientId: '821978818510-oo69bs0uln83avvst0obpjmq9amgtg8c.apps.googleusercontent.com',
    apiKey: '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'
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
