// 名前の高さに合わせてアイコン位置を調整する関数
const set_footer_height = function () {
    var footer_user_name_height = $(".footer_user_name").height();
    $(".footer").css("bottom",footer_user_name_height+"px");
}

// 画面サイズが変わったときに再計算
$(window).resize(function() {
    set_footer_height()
})