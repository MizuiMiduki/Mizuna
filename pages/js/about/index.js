try {
    const response = await fetch('/lunanthus/pwa/manifest.json');
    const data = await response.json();
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.textContent = data.version;
    }
} catch (error) {
    console.error('Error :', error);
}
