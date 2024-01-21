$(function () {
    // Mizunaをホストしているページのホスト名
    var Mizuna_host_address = location.hostname
    // アカウント情報を取得するMisskeyサーバーのアドレス
    var address = "misskey.io";
    // セッションID
    var session_ID = crypto.randomUUID();

    document.getElementById("get_account").addEventListener('click', () => {
        add_account(address, session_ID, Mizuna_host_address)
    });
    document.getElementById("get_data").addEventListener('click', () => {
        let data = get_account_data(address, session_ID)
        console.log(data)
    });
});
