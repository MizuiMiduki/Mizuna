const delete_accountdata = function (keynum, callback) {
    console.log(keynum)

    const dbName = 'userdata_db';
    const storeName = 'userdata_store';

    // データベースを開くリクエスト
    const request = indexedDB.open(dbName);

    request.onsuccess = function (event) {
        // データベースが成功裏に開かれたときの処理
        const db = event.target.result;

        // トランザクションを開始し、オブジェクトストアを取得
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        // キーに基づいてデータを取得
        const keylist = objectStore.getAllKeys();
        keylist.onsuccess = function (event) {
            // キーの配列を取得
            var keys = event.target.result;
            const getRequest = objectStore.delete(keys[keynum]);

            getRequest.onsuccess = function (event) {
                //アカウント削除完了
                check_db_status(function (result) {
                    if (result == 'objectstore_empty') {
                        $("#user_name").text("name");
                        $("#user_id").text("id@address");
                        $('#menu_icon').attr('src', "/icon.png");
                        set_footer_height()
                        add_account_area()
                    } else {
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
                                return
                            };
                        })
                    }
                })
            };

            getRequest.onerror = function (event) {
                // リクエストエラーをコールバック関数に渡す
                callback('Request_Error');
            };
        };
    };

    request.onerror = function (event) {
        // データベースのオープン中にエラーをコールバック関数に渡す
        callback('Open_Error');
    };
};
