$(function () {
    $('.note_content').on('input', function () {
        var textLength = $(this).val().length;
        $('#charCount').text(textLength);

        if (2986 == $('#max_charCount').text()) {
            if ($('#charCount').text() > $('#max_charCount').text()) {
                $('#charCount').css("color", "red");
            } else if ($('#charCount').text() == $('#max_charCount').text()) {
                $('#charCount').css("color", "goldenrod");
            } else {
                $('#charCount').css("color", "");
            }
        } else {
            if ($('#charCount').text() == $('#max_charCount').text()) {
                $('#charCount').css("color", "goldenrod");
            } else {
                $('#charCount').css("color", "");
            }
        }
    });

    $('.note_end_mizuna').on('input', function () {
        var from_mizuna_select = $('#note_end_mizuna_checkbox').prop("checked");
        if (from_mizuna_select == true) {
            $('#max_charCount').text(2986);
        } else {
            $('#max_charCount').text(3000);
        }

        if (2986 == $('#max_charCount').text()) {
            console.log("!!!!!!!!!!")
            if ($('#charCount').text() > $('#max_charCount').text()) {
                $('#charCount').css("color", "red");
            } else if ($('#charCount').text() == $('#max_charCount').text()) {
                $('#charCount').css("color", "goldenrod");
            } else {
                $('#charCount').css("color", "");
            }
        } else {
            if ($('#charCount').text() == $('#max_charCount').text()) {
                $('#charCount').css("color", "goldenrod");
            } else {
                $('#charCount').css("color", "");
            }
        }
    });
});