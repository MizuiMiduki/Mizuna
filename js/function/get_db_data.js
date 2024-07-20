const get_db_data = function (keys) {
    return db.account.bulkGet(keys);
};
