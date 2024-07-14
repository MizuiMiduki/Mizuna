// 入力欄の読み込み
$(".main_column").load("/parts/form.html");

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
