// アカウント認証
const add_account = function (address, session_ID, Mizuna_host_address) {
    window.open ("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=http://" + Mizuna_host_address + "&permission=write:notes","_blank")
};

// アカウント情報取得
const get_account_data = function (address, session_ID) {
    $.ajax({
        type: 'POST',
        url: 'https://' + address + '/api/miauth/' + session_ID + '/check',
        async: false,
        contentType: 'application/json',
        dataType: 'json',
        scriptCharset: 'utf-8',
        success: function (data) {
            return data;
        },
        error: function () {
            return "error";
        }

    });
    doAnything();
}