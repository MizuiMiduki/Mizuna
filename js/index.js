$(function () {
    document.getElementById("get_account").addEventListener('click', () => {
        // Mizunaをホストしているページのホスト名
        var Mizuna_host_address = location.hostname
        // アカウント情報を取得するMisskeyサーバーのアドレス
        var address = "misskey.io";
        // セッションID
        var session_ID = crypto.randomUUID();
        add_account(address, session_ID, Mizuna_host_address)
    });


    document.getElementById("get_data").addEventListener('click', () => {
        // アカウント情報を取得するMisskeyサーバーのアドレス
        var address = "misskey.io";
        // セッションIDを取得
        session_ID = location.search.replace("?session=", "")
        // サーバーからデータを取得
        let data = get_account_data(address, session_ID)
        let get_user_data = JSON.parse(data)

        if (get_user_data.ok == false) {
            // 取得できなかったとき
            console.warn("アカウントデータを取得できませんでした")
        } else {
            // indexedDBに登録
            add_indexeddb(get_user_data, address)
        }
    });
});
