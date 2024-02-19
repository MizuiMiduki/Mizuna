const get_db_data = function (callback) {
    const dbName = 'userdata_db';
    const storeName = 'userdata_store';

    // データベースを開くリクエスト
    const request = indexedDB.open(dbName);

    request.onsuccess = function (event) {
        // データベースが成功裏に開かれたときの処理
        const db = event.target.result;

        // トランザクションを開始し、オブジェクトストアを取得
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);

        // 最初のオブジェクトを取得
        const getRequest = objectStore.openCursor();

        getRequest.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                // オブジェクトの中身をコールバック関数に渡す
                callback(null, cursor.value);
            } else {
                // データが見つからない場合
                callback('No_Data_Found', null);
            }
        };

        getRequest.onerror = function (event) {
            // リクエストエラーをコールバック関数に渡す
            callback('Request_Error', null);
        };
    };

    request.onerror = function (event) {
        // データベースのオープン中にエラーをコールバック関数に渡す
        callback('Open_Error', null);
    };
};
