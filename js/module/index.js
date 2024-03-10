$(function () {
    // 初回起動時
    check_db_status(function (result) {
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
            // 通常の処理

            // データ取得
            var keynum = 0;
            get_db_data(keynum, function (error, db_user_data) {
                if (error) {
                    // 取得エラー
                    console.log(error);
                } else {
                    // データが取得できた場合
                    var user_data = db_user_data;
                    set_user_text(user_data);

                    // "ノートボタン"押下時
                }
            });
            // export_userdata()
        }
    });
});