// データベース内にストアがあるか確認
const check_db_status = function (callback) {

    // データベース名とストア名
    const dbName = 'userdata_db';
    const storeName = 'userdata_store';

    // データベースを開く（存在しない場合は新規作成されます）
    const request = indexedDB.open(dbName, 1);

    // データベース接続が成功した場合に呼び出されるイベントハンドラ
    request.onsuccess = function (event) {
        const db = event.target.result;

        // object storeが存在するか確認します
        if (db.objectStoreNames.contains(storeName)) {
            var result = "objectstore_not_empty";
        } else {
            var result = "objectstore_empty";
        }

        // データベース接続を閉じます
        db.close();
        if (callback && typeof callback === "function") {
            callback(result);
        }
    };
}