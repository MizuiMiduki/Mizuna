const add_indexedb = function (get_user_data, address) {
    db.account.bulkPut([
        {
            token: get_user_data.token,
            name: get_user_data.user.name,
            username: get_user_data.user.username,
            address: address,
            avatarurl: get_user_data.user.avatarUrl,
            add_mizuna_versinon: mizuna_options.mizuna_db_version
        },
    ])
}
