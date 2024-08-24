const generate_menu_service = function () {
    $(".main_column").load("/parts/change_account.html", function () {
        $("#loading_anime_area").remove();
        // アカウント一覧を表示
        generate_account_list()
    });
}

// アカウント追加ボタンをクリックでアカウント追加フォームへ
let load_add_account_service = false;
$(document).on('click', '.add_account_floating_button', function () {
    if (load_add_account_service === false) {
        // 初回ロード
        $.getScript("/js/servise/add_account_servise.js", function () {
            $('body').append(`
            <div class="back_inputform_floating_button">
                <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
                    <path
                        d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z">
                    </path>
                </svg>
                <p>もどる</p>
            </div>
        `);
        })
        load_add_account_service = true;
    } else {
        add_account_servise()
        $('body').append(`
            <div class="back_inputform_floating_button">
                <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
                    <path
                        d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z">
                    </path>
                </svg>
                <p>もどる</p>
            </div>
        `);
    }
});

// アカウント追加フォームからアカウント一覧に戻るボタン
$(document).on('click', '.back_inputform_floating_button', function () {
    $(".main_column").load("/parts/change_account.html", function () {
        $("#loading_anime_area").remove();
        // アカウント一覧を表示
        generate_account_list();

        // 戻るボタンを削除
        $(".back_inputform_floating_button").remove();
    });
});

$(document).on('click', '#account_card', function () {
    let select_user_id = $(this).data('id');
    db.setting.bulkUpdate([
        {
            key: 1,
            changes: {
                select_user: select_user_id,
            }
        },
    ]).then(function () {
        get_user_db_data([select_user_id])
            .then(get_db_result => {
                // フッター表示
                user_data = get_db_result[0];
                set_user_text(user_data);
                user_setting();
                toastr["success"]('アカウントを切り替えました');
            })
    })
});

$(document).on('click', '.delete_account_mode_floating_button', function () {
    $(".delete_select_checknox").toggle();
    $(".delete_account_execution_floating_button").toggleClass("delete_account_execution_floating_button_flex delete_account_execution_floating_button_none");
    $(".delete_select_checknox").removeAttr('checked').prop('checked', false);
});

let load_delete_account = false;
$(document).on('click', '.delete_account_execution_floating_button', function () {
    $.confirm({
        title: '選択したアカウント削除します',
        content: '選択したアカウントをMizunaから登録解除しても良いですか？',
        buttons: {
            "はい": function () {
                var checkedItems = $(".delete_select_checknox:checked").map(function () {
                    return $(this).data('id');
                }).get();
                if (load_delete_account === false) {
                    $.getScript("/js/function/delete_account.js", function () {
                        delete_account(checkedItems);
                    });
                    load_delete_account = true;
                } else {
                    delete_account(checkedItems);
                }
            },
            "いいえ": function () {
            }
        }
    });
});
