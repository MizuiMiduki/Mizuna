// 設定を読み込み
$.getScript("/js/option/toastr_option.js")

// indexed DB接続
var db = new Dexie("MizunaDatabase");

db.version(1).stores({
    account: "++id, token, name, username, address, avatarurl",
    setting: '++id, setting ',
});

// db.account.bulkPut([
// ])

// 初回判定
check_accountdb_status().then(function (check_accountdb_result) {
    if (check_accountdb_result === 1) {
        // **
        // アカウントがある場合
        // **
        $.getScript("/js/servise/inputform_servise.js")

    } else {
        // **
        // アカウントがない場合
        // **
    }
})
    .catch(function (error) {
        // エラーハンドリング
        toastr.error('実行中にエラーが発生しました:', error);
    });
