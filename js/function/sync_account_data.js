const sync_account_data = function () {
    get_user_db_data([user_options.select_user])
        .then(get_db_result => {
            if (get_db_result[0]) {

                let user_data_type = "post"
                let user_data_url = "https://" + get_db_result[0].address + "/api/i"
                let token_parameter = {
                    "i": get_db_result[0].token
                }
                token_parameter = JSON.stringify(token_parameter);
                $.ajax({
                    type: user_data_type,
                    url: user_data_url,
                    data: token_parameter,
                    contentType: 'application/json',
                    dataType: 'json',
                    scriptCharset: 'utf-8',
                    success: function (data) {
                        db.account.bulkUpdate([
                            {
                                key: user_options.select_user,
                                changes: {
                                    name: data.name,
                                    username: data.username,
                                    avatarurl: data.avatarUrl,
                                    add_mizuna_versinon: mizuna_options.mizuna_version
                                }
                            },
                        ]);
                        user_data['name'] = data.name;
                        user_data['username'] = data.username;
                        user_data['avatarurl'] = data.avatarUrl;
                        user_data['add_mizuna_versinon'] = mizuna_options.mizuna_version
                        set_user_text(user_data);

                        toastr["success"]('アカウント情報を同期しました');
                    },
                    error: function () {
                        toastr["error"]('アカウント情報の同期に失敗しました');
                    }
                });
            }
        });
}
