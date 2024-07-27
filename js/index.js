// 設定を読み込み
$.getScript("/js/option/toastr_option.js");
$.getScript("/js/option/mizuna_option.js");

// indexed DB接続
var db = new Dexie("MizunaDatabase");

db.version(1).stores({
    account: "++id, token, name, username, address, avatarurl, add_mizuna_versinon",
    setting: '++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color',
});

// ユーザー設定を読み込み
$.getScript("/js/function/get_setting_db_data.js",function(){
    user_setting();
})

// 初回判定
check_accountdb_status().then(function (check_accountdb_result) {
    if (check_accountdb_result === 1) {
        // **
        // アカウントがある場合
        // **
        $.getScript("/js/servise/inputform_servise.js")
        storage.clear();
    } else {
        // **
        // アカウントがない場合
        // **
        $.getScript("/js/servise/add_account_servise.js")
    }
})
