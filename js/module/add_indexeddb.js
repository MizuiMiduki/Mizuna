// indexedDBに登録する
const add_indexeddb = function (get_user_data, address) {
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
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement:true });
        }
    };

    // データベース接続が成功した場合に呼び出されるイベントハンドラ
    request.onsuccess = function (event) {
        const db = event.target.result;

        // トランザクションを開始してストアにアクセスします
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        // データを準備します
        const data = {
            "token": get_user_data.token,
            "name": get_user_data.user.name,
            "username": get_user_data.user.username,
            "address": address,
            "avatarurl": get_user_data.user.avatarUrl
        };

        // データをストアに追加します
        store.add(data);

        // トランザクションを完了してデータベース接続を閉じます
        transaction.oncomplete = function () {
            db.close();
            return
        };
    };

};