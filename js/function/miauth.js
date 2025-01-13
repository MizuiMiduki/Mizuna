// アカウント認証
var miauth = function (address, session_ID, Mizuna_host_address) {
    $("#add_account_server_button").prop("disabled", true);

    const check_url = `https://${Mizuna_host_address}/php/check_url.php?url=https://${address}/`;
    fetch(check_url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                location.assign("https://" + address + "/miauth/" + session_ID + "?name=Mizuna&callback=https://" + Mizuna_host_address + "&permission=write:notes,read:account,write:drive", "_blank")
            } else {
                toastr["error"]("アドレスのサーバーは見つかりませんでした")
            }
        })

    $("#add_account_server_button").prop("disabled", false);
};
