const get_user_db_data = function (db_key) {
    return db.account.bulkGet(db_key);
};
