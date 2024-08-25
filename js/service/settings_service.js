const settings_service = function () {
    $(".main_column").load("/parts/settings.html", function () {
        $("#loading_anime_area").remove();

    });
}
