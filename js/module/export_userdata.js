const export_userdata = function () {
    const dbName = 'userdata_db';

    const request = indexedDB.open(dbName);

    request.onerror = function (event) {
        console.error('DB_Open_Error');
    };

    request.onsuccess = function (event) {
        const db = event.target.result;

        // userdata_storeのテーブル数を取得する
        const objectStoreCount = db.objectStoreNames.contains('userdata_store') ? 1 : 0;

        if (objectStoreCount) {
            const transaction = db.transaction('userdata_store', 'readonly');
            const objectStore = transaction.objectStore('userdata_store');

            // オブジェクトストア内のデータを反復処理する
            var export_data = [];
            objectStore.openCursor().onsuccess = function (event) {
                const cursor = event.target.result;
                if (cursor) {
                    // カーソルがデータを示す場合
                    const data = cursor.value;
                    export_data.push(data)

                    // 次のデータに進む
                    export_data.push(",")
                    cursor.continue();
                } else {
                    export_data.pop();
                    var json_data = JSON.stringify(export_data);

                    // Blobオブジェクトを作成
                    var blob = new Blob([json_data], { type: "application/json" });

                    // a要素を作成し、ダウンロードリンクとして設定
                    var a = document.createElement('a');
                    a.download = "data_export.mizuna";
                    a.href = window.URL.createObjectURL(blob);
                    a.textContent = "data_export.mizuna";

                    // a要素をbodyに追加してクリック
                    document.body.appendChild(a);
                    a.click();

                    // a要素を削除
                    document.body.removeChild(a);
                }
            };

        } else {
            // データが見つからない場合
            console.error('Data_Not_Found');
        }
    };
    return
};
