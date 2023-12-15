// バージョン名
const mizuna_version = 'R2.1';
// リリースノートURL
const releasenote_url = "https://blossomsarchive.com/blog/post-2579/"

// 実装
document.getElementById('mizuna_version').innerHTML = mizuna_version;
if (localStorage.getItem("ls_mizuna_version") != mizuna_version) {
    $(".header").after("<div class=\"new_version_notifiy\"><p>バージョン" + mizuna_version + "にアップデートされました！<br>更新情報は<a href=\"" + releasenote_url + "\" target=\"_blank\" rel=\"noopener noreferrer\">こちら</a>から</p> <svg class=\"new_version_notifiy_close\"  xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 -960 960 960\" width=\"24\"><path d=\"m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z\"/></svg></div>")
    localStorage.setItem("ls_mizuna_version", mizuna_version);
}
$(".new_version_notifiy_close").click(function () {
    $(".new_version_notifiy").css("display", "none");
});
