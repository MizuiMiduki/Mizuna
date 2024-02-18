// アカウント登録モーダル表示用
const add_account_area = function () {
    let form_data = `
    <div class="modal_back">
        <section class="miauth_form">
            <p class="title" id="login_settings_title">アカウント追加</p>
                <p>サーバーアドレス</p>
                <input type="text" class="server_address" list="server_address_list" placeholder="例:misskey.io" autocomplete="off">
                <datalist id="server_address_list">
                    <option value="misskey.io">
                    <option value="mfmf.club">
                    <option value="social.sda1.net">
                    <option value="misskey.systems">
                    <option value="yojohan.cc">
                </datalist>
                <button onclick="add_account_submit()">完了</button>
            <form>
        </section>
    <div>
    `
    $("#menu_display_area").append(form_data)

}

const add_account_submit = function () {
    // アカウント情報を取得するMisskeyサーバーのアドレス
    var address = $('.server_address').val();
    console.log(address)
    if (address != "") {
        // Mizunaをホストしているページのホスト名
        var Mizuna_host_address = location.hostname
        // セッションID
        var session_ID = crypto.randomUUID();
        localStorage.setItem('add_server_address', address);
        // miauthを呼び出し
        miauth(address, session_ID, Mizuna_host_address)
    } else {
        alert("サーバーアドレスを入力してください");
    }

}