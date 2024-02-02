// アカウント認証
const add_account = function (address, session_ID, Mizuna_host_address) {
    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes", "_blank")
};

// アカウント情報取得
const get_account_data = function (address, session_ID) {
    let url = 'https://' + address + '/api/miauth/' + session_ID + '/check';
    fetch(url, {
        method: 'POST'
    })
        .then(response => response.text())
        .then(data => {
            console.log(data) 
        });
}