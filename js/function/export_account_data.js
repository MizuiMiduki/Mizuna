function saveAsJsonFile(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const export_account_data = async function () {
    const accounts = await db.account.toArray();
    saveAsJsonFile('accounts.json', accounts);
};
