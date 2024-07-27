const delete_account = function (db_key) {
    // db_keyは[1]などarray型
    db.account.bulkDelete(db_key)
}
