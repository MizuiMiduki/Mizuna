const delete_account = function (db_key_list) {
    for (i = 0; i < db_key_list.length; i++) {
        db.account.bulkDelete([db_key_list[i]])
        $('[data-id=' + db_key_list[i] + ']').remove();
        user_setting();

        if (db_key_list[i] === user_options.select_user) {
            db.table('account').orderBy('id').first().then(record => {

                db.setting.bulkUpdate([
                    {
                        key: 1,
                        changes: {
                            select_user: record.id,
                        }
                    },
                ]).then(function () {
                    get_user_db_data([record.id])
                        .then(get_db_result => {
                            // フッター表示
                            user_data = get_db_result[0]
                            set_user_text(user_data)
                        })
                })

            });
        }

        db.table('account').orderBy('id').first().then(record => {
            if (!record) {
                $("#user_name").text("name");
                $("#user_id").text("id@address");
                $('#menu_icon').attr('src', "/icon.png");
                $('.footer').css('display', 'none');
                if (typeof add_account_service === "undefined") {
                    $.getScript("/js/service/add_account_service.js").then(() => {
                        add_account_service();
                    });
                } else {
                    add_account_service();
                }
            }
        });
    }
}
