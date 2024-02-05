// アカウント認証
const add_account = function (address, session_ID, Mizuna_host_address) {
    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes", "_blank")
};

// アカウント情報取得
const get_account_data = function (address, session_ID) {
    let url = 'https://' + address + '/api/miauth/' + session_ID + '/check';
        const request = new XMLHttpRequest();
        request.open("POST", url, false); // `false` で同期リクエストになる
        request.send(null);
        if (request.status === 200) {
            return request.responseText;
        }

}