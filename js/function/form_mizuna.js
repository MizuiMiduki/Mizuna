const from_mizuna = function () {
    var from_mizuna_select = $('#note_end_mizuna_checkbox').prop("checked");
    var from_mizuna;

    if (from_mizuna_select === true) {
        from_mizuna = "\n(from Mizuna)";
    } else {
        from_mizuna = "";
    }

    return from_mizuna;
}
