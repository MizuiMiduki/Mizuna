const get_db_data = function (keynum, callback) {
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

        // キーに基づいてデータを取得
        const keylist = objectStore.getAllKeys();
        keylist.onsuccess = function (event) {
            // キーの配列を取得
            var keys = event.target.result;
            const getRequest = objectStore.get(keys[keynum]);

            getRequest.onsuccess = function (event) {
                const data = event.target.result;
                if (data) {
                    // データが見つかった場合、コールバック関数に渡す
                    callback(null, data);
                } else {
                    // データが見つからない場合、エラーメッセージをコールバック関数に渡す
                    callback('Data_Not_Found', null);
                }
            };

            getRequest.onerror = function (event) {
                // リクエストエラーをコールバック関数に渡す
                callback('Request_Error', null);
            };
        };
    };

    request.onerror = function (event) {
        // データベースのオープン中にエラーをコールバック関数に渡す
        callback('Open_Error', null);
    };
};
