// アカウント認証
var miauth = function (address, session_ID, Mizuna_host_address) {
    $("#add_account_server_button").prop("disabled", true);

    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes,read:account", "_blank")
};
