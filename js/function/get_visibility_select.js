// 外側の関数宣言を var にして、二重読み込みエラーを防ぐにゃ！
var get_visibility_select = function () {
    // 『public』はJavaScriptの予約語なので『is_public』などの安全な名前に変えたにゃ
    var is_public = $('#visibility_public').prop("checked");
    var is_home = $('#visibility_home').prop("checked");
    var is_followers = $('#visibility_followers').prop("checked");
    var select;

    if (is_public === true) {
        select = "public";
    } else if (is_home === true) {
        select = "home"; // 文末のセミコロンも補完したにゃ
    } else if (is_followers === true) {
        select = "followers";
    } else {
        select = null;
    }

    return select;
}
