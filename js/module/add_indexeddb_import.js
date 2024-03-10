// indexedDBに登録する
const add_indexeddb_import = function (get_user_data) {
    // データベース名とストア名
    const dbName = 'userdata_db';
    const storeName = 'userdata_store';

    // データベースを開く（存在しない場合は新規作成されます）
    const request = indexedDB.open(dbName, 2);

    // データベースのアップグレードが必要な場合に呼び出されるイベントハンドラ
    request.onupgradeneeded = function (event) {
        const db = event.target.result;

        // ストアが存在しない場合は新しく作成します
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'username_address' });
        }
    };

    // データベース接続が成功した場合に呼び出されるイベントハンドラ
    request.onsuccess = function (event) {
        const db = event.target.result;

        // トランザクションを開始してストアにアクセスします
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.clear()
        for (let i = 0; i < get_user_data.length; i++) {
            // データを準備します
            const data = {
                "token": get_user_data[i].token,
                "name": get_user_data[i].name,
                "username_address": get_user_data[i].username_address,
                "address": get_user_data[i].address,
                "avatarurl": get_user_data[i].avatarurl
            };

            // データをストアに追加します
            store.put(data);
        }

        // トランザクションを完了してデータベース接続を閉じます
        transaction.oncomplete = function () {
            db.close();
            $(".modal_back").remove()

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
                };
            })
        }
    };
}