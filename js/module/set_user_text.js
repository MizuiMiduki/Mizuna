// フッターにデータを反映
const set_user_text = function (data) {
    $("#user_name").text(data.name);
    $("#user_id").text(data.username_address);
    $('#menu_icon').attr('src', data.avatarurl);
}