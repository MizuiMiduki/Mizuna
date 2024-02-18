// アカウント認証
const miauth = function (address, session_ID, Mizuna_host_address) {
    location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes", "_blank")
};
