// アカウント認証
const miauth = function (address, session_ID, Mizuna_host_address) {
    $("#add_account_server_button").prop("disabled", true);

    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna3.0&callback=https://" + Mizuna_host_address + "&permission=write:notes", "_blank")
};
