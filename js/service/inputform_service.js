// 入力欄の読み込み
$(".main_column").load("/parts/form.html", function () {
    $("#loading_anime_area").remove();
    // 文字数カウンターをロード
    $.getScript("/js/function/note_content_count.js")
    // デフォルトの公開範囲ボタンにユーザー設定を適用
    $.getScript("/js/function/apply_default_visibility_button.js");

})

// アカウント情報読み込み
$.getScript("/js/function/get_user_db_data.js", function () {
    get_user_db_data([user_options.select_user])
        .then(get_db_result => {
            if (get_db_result[0]) {
                // フッター表示
                user_data = get_db_result[0]
                $.getScript("/js/function/set_user_text.js", function () {
                    set_user_text(user_data)
                })
                // ノート送信関数をロード
                $.getScript("/js/function/send_note.js")
            } else {
                db.table('account').orderBy('id').first()
                    .then(record => {
                        db.setting.bulkUpdate([
                            {
                                key: 1,
                                changes: {
                                    select_user: record.id,
                                }
                            },
                        ])
                        get_user_db_data([record.id])
                            .then(get_db_result => {
                                // フッター表示
                                user_data = get_db_result[0]
                                $.getScript("/js/function/set_user_text.js", function () {
                                    set_user_text(user_data)
                                })
                            })

                    });
            }
        })
})

// キーボードショートカットを読み込み
$.getScript("/js/function/keybordshortcut.js")

// ノート送信ボタン
var send_standby = 1
$.getScript("/js/function/get_visibility_select.js")
$.getScript("/js/function/form_mizuna.js")

function note_send_submit() {
    $(".note_submit").prop("disabled", true);
    send_note(user_data)
}

// 公開範囲ボタンをラジオボタンと同じ挙動にする
$(document).on("click", ".visibility_checkbox", function () {
    $('.visibility_checkbox').prop('checked', false);
    $(this).prop('checked', true);
});

// CWエリアの表示切り替え
$(document).on("click", "#cw", function () {
    $('.cw_input_ara').slideToggle();
});

// フォームクリアボタン
$(document).on("click", "#form_clear_button", function () {
    toastr["success"]('フォームクリア！');
    localStorage.clear();
    $('.cw_content').val('');
    $('.note_content').val('');
});

// アカウントメニューボタン
let load_generate_menu_service = false;
let toggle_menu_input = 0;
$(document).on("click", "#menu_icon", function () {
    $(".main_column").empty();
    $(".back_inputform_floating_button").remove();

    if (toggle_menu_input === 0) {
        $(".main_column").load("/parts/loading.html");
        toggle_menu_input = 1;
        toggle_settings_input = 0;

        if (load_generate_menu_service === false) {
            // 初回ロード
            $.getScript("/js/function/generate_account_list.js", function () {
                $.getScript("/js/service/generate_menu_service.js", function () {
                    generate_menu_service();
                });
            });
            load_generate_menu_service = true;
        } else {
            generate_menu_service();
        }
    } else if (toggle_menu_input === 1) {
        toggle_menu_input = 0;
        toggle_settings_input = 0;

        $(".main_column").load("/parts/form.html", function () {
            apply_default_visibility_button();
            websharetarget();
        });
    }
});

// Web Share Target
$.getScript("/js/function/WebShareTarget.js", function () {
    websharetarget();
})
// Web Share
$.getScript("/js/function/WebShare.js")


// 設定メニューボタン
let load_settings_service = false;
let toggle_settings_input = 0;
$(document).on("click", "#settings_icon", function () {
    $(".main_column").empty();
    $(".back_inputform_floating_button").remove();

    if (toggle_settings_input === 0) {
        $(".main_column").load("/parts/loading.html");
        toggle_settings_input = 1;
        toggle_menu_input = 0;

        if (load_settings_service === false) {
            // 初回ロード
            $.getScript("/js/service/settings_service.js", function () {
                settings_service();
            });
            load_settings_service = true;
        } else {
            settings_service();
        }
    } else if (toggle_settings_input === 1) {
        toggle_settings_input = 0;
        toggle_menu_input = 0;

        $(".main_column").load("/parts/form.html", function () {
            apply_default_visibility_button();
            websharetarget();
        });
    }
});
