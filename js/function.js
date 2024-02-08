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
    let dbName = ["token_db", ""]

    for (let i = 0; i < dbName.length; i++) {
        var openReq = indexedDB.open(dbName[i]);

        openReq.onupgradeneeded = function (event) {
            console.log('db upgrade');
        }
        openReq.onsuccess = function (event) {
            console.log('db open success');
            var db = event.target.result;
            // 接続を解除する
            db.close();
        }
        openReq.onerror = function (event) {
            console.log('db open error');
            return "db_error"
        }
    }
};