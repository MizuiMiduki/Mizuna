// フッターにデータを反映
const set_user_text = function (data) {
    $("#user_name").text(data.name);
    $("#user_id").text(`${data.username}@${data.address}`);
    $('#menu_icon').attr('src', data.avatarurl);
}
