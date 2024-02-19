$(function () {
    // 初回起動時
    check_db_status(function (result) {
        console.log(result)
        if (result == 'objectstore_empty') {
            add_account_area()
        }

        // オブジェクトストアが空じゃなかった場合
        // miauth認証後
        if (location.search != "") {
            // アカウント情報を取得するMisskeyサーバーのアドレス
            var address = localStorage.getItem("add_server_address")
            console.log(address)
            if (address != "") {
                // セッションIDを取得
                var session_ID = location.search.replace("?session=", "")
                // サーバーからデータを取得
                let data = get_account_data(address, session_ID)
                let get_user_data = JSON.parse(data)
                if (get_user_data.ok == false) {
                    // 取得できなかったとき
                    window.open(document.location.hostname);
                } else {
                    // indexedDBに登録
                    add_indexeddb(get_user_data, address)
                    // ローカルストレージを全削除
                    localStorage.clear();
                    location.href = "/";
                }
            }
            // miauthのリンクだがアドレスが記憶されていなかった場合
            location.href = "/";
        } else if (result == 'objectstore_not_empty') {
            console.log("ok")
        }

    });
});
