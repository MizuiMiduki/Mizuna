// アカウント認証
const add_account = function (address, session_ID, Mizuna_host_address) {
    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes", "_blank")
};

// アカウント情報取得
const get_account_data = function (address, session_ID) {
    let url = 'https://' + address + '/api/miauth/' + session_ID + '/check';

    const request = new XMLHttpRequest();
    request.open("POST", url, false);
    request.send(null);
    if (request.status === 200) {
        return request.responseText;
    }
};

// indexedDBに登録する
const add_indexeddb = function (get_user_data, address) {
    const dbName = "userdata_db"
    const storeName = '"userdata_store';
    const db_base_version = 1;
    const db_object_store_create_version = 2;
    let data = {
        "token": get_user_data.token,
        "name": get_user_data.user.name,
        "username": get_user_data.user.username,
        "address": address,
        "avatarurl": get_user_data.user.avatarUrl
    };

    // indexeddb 作成
    const createRequest = window.indexedDB.open(dbName, db_base_version);
    createRequest.onerror = (event) => {
        err.innerHTML = event.target.error;
    };
    createRequest.onsuccess = (event) => {
        db = event.target.result;
        console.info("db作成完了")
        // 接続を解除
        db.close();
    }

    // object store 作成
    const openRequest = window.indexedDB.open(dbName, db_object_store_create_version);
    openRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 顧客の情報を保存する objectStore を作成します
        const objectStore = db.createObjectStore(storeName, { keyPath: "id", autoincrement: true });
        console.info("store作成完了")
        // 接続を解除
        db.close();
    };

    // insert データ
    const insert_openRequest = window.indexedDB.open(dbName);
    insert_openRequest.onerror = (event) => {
        console.error("error");
    };
    insert_openRequest.onsuccess = (event) => {
        const db = event.target.result;
        const customerObjectStore = db.transaction(storeName, 'readwrite').objectStore(storeName);
        customerObjectStore.add(data);
        console.info("データ追加完了")
        // 接続を解除
        db.close();
    };
};