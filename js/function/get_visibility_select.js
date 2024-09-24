const get_visibility_select = function () {
    var public = $('#visibility_public').prop("checked");
    var home = $('#visibility_home').prop("checked");
    var followers = $('#visibility_followers').prop("checked");
    var select;

    if (public == true) {
        select = "public";
    } else if (home == true) {
        select = "home"
    } else if (followers == true) {
        select = "followers"
    } else {
        select = null;
    }

    return select;
}
