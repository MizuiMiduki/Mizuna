const generate_menu_service = function () {
    $(".main_column").load("/parts/change_account.html", function () {
        $("#loading_anime_area").remove();
        // アカウント一覧を表示
        generate_account_list()
    });
}
