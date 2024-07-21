// 入力欄の読み込み
$(".main_column").load("/parts/form.html");
$("#loading_anime_area").remove();
// アカウント情報読み込み
$.getScript("/js/function/get_db_data.js", function () {
    // [1]を適宜書き換える
    get_db_data([1])
        .then(get_db_result => {
            // フッター表示
            user_data = get_db_result[0]
            $.getScript("/js/function/set_user_text.js", function () {
                set_user_text(user_data)
            })
            // ノート送信関数をロード
            $.getScript("/js/function/send_note.js")
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
    $('.cw_content').val('');
    $('.note_content').val('');
});

// メニューボタン
let load_generate_menu_service = false;
$(document).on("click", "#menu_icon", function () {
    $(".main_column").empty();
    $(".main_column").load("/parts/loading.html");

    if (load_generate_menu_service === false) {
        // 初回ロード
        $.getScript("/js/function/generate_account_list.js", function () {
            $.getScript("/js/servise/generate_menu_service.js", function () {
                generate_menu_service();
            });
        });
        load_generate_menu_service = true;
    } else {
        generate_menu_service();
    }
});
