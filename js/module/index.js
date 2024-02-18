$(function () {
    // 初回起動時
    check_db_status(function (result) {
        if (result == 'objectstore_empty') {
            console.log("空")
            add_account_area()
        }

        // miauth認証後
        if (location.search != "") {
            // アカウント情報を取得するMisskeyサーバーのアドレス
            var address = localStorage.getItem("add_server_address")
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
                // ローカルストレージを全削除
                localStorage.clear();
            }
        }
    });
});
