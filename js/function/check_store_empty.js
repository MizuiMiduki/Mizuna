const check_accountdb_status = function () {
    return db.open().then(function () {
        return db.account.count();
    }).then(function (count) {
        if (count === 0) {
            // アカウント未登録
            return 0;
        } else {
            // アカウント登録済み
            return 1;
        }
    }).catch(function (error) {
        throw error;
    });
}
