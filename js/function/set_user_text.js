// フッターにデータを反映
const set_user_text = function (data) {
    $("#user_name").text(data.name);
    $("#user_id").text(`${data.username}@${data.address}`);
    if (user_options.is_visible_icon === true) {
        $('#menu_icon').attr('src', mizuna_options.mizuna_address + '/php/image_proxy.php?url=' + data.avatarurl);
    } else {
        $('#menu_icon').attr('src', "/icon.png");
    }
    $('.footer').css('display', '');
}
