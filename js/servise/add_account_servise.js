if (location.search != "") {
    // アカウント情報を取得するMisskeyサーバーのアドレスをローカルストレージから取得
    var address = localStorage.getItem("add_server_address")
    if (address != "") {
        // **
        // ローカルストレージが空ではない場合
        // **

        // URLからセッションIDを取得
        var session_ID = location.search.replace("?session=", "");
        // サーバーからデータを取得
        $.getScript("/js/function/get_account_data.js", function () {
            let data = get_account_data(address, session_ID);
            let get_user_data = JSON.parse(data);
            if (get_user_data.ok == false) {
                // 取得できなかったとき
                location.href = "/";
            } else {
                // indexedDBに登録
                $.getScript("/js/function/add_indexedb.js", function () {
                    add_indexedb(get_user_data, address);
                    // ローカルストレージを全削除
                    localStorage.clear();
                    location.href = "/";
                })
            }
        })
    } else {
        // miauthのリンクだがアドレスが記憶されていなかった場合
        location.href = "/";
    }
} else {
    $(".main_column").load("/parts/add_account.html");
    $("#loading_anime_area").remove();
    $.getScript("/js/function/miauth.js")
}

const add_account_submit = function () {
    // アカウント情報を取得するMisskeyサーバーのアドレス
    var address = $('.server_address').val();
    if (address != "") {
        // Mizunaをホストしているページのホスト名
        var Mizuna_host_address = location.hostname

        // セッションIDを生成
        var session_ID = crypto.randomUUID();
        localStorage.setItem('add_server_address', address);

        // miauthを呼び出し
        miauth(address, session_ID, Mizuna_host_address);
    } else {
        toastr["error"]("アドレスを入力してください")
    }
}
