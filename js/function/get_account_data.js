// アカウント情報取得
const get_account_data = function (address, session_ID) {

    let url = 'https://' + address + '/api/miauth/' + session_ID + '/check';

    const request = new XMLHttpRequest();
    request.open("POST", url, false);
    request.send(null);
    if (request.status === 200) {
        return request.responseText;
    }
};
