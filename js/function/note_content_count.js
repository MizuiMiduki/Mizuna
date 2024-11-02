$('.note_content').on('input', function () {
    var textLength = $(this).val().length;

    let digitCount = textLength.toString().length;
    let spaceCount = Math.max(0, 5 - digitCount);
    let spaces = '0'.repeat(spaceCount);
    $('#charCountSpace').text(spaces);

    $('#charCount').text(textLength);

    if (2986 === Number($('#max_charCount').text())) {
        if (Number($('#charCount').text()) > Number($('#max_charCount').text())) {
            $('#charCount').css("color", "red");
        } else if (Number($('#charCount').text()) === Number($('#max_charCount').text())) {
            $('#charCount').css("color", "goldenrod");
        } else {
            $('#charCount').css("color", "");
        }
    } else {
        if (Number($('#charCount').text()) === Number($('#max_charCount').text())) {
            $('#charCount').css("color", "goldenrod");
        } else {
            $('#charCount').css("color", "");
        }
    }
});

$('.note_end_mizuna').on('input', function () {
    var from_mizuna_select = $('#note_end_mizuna_checkbox').prop("checked");
    if (from_mizuna_select === true) {
        $('#max_charCount').text(2986);
    } else {
        $('#max_charCount').text(3000);
    }

    if (2986 === Number($('#max_charCount').text())) {
        if (Number($('#charCount').text()) > Number($('#max_charCount').text())) {
            $('#charCount').css("color", "red");
        } else if (Number($('#charCount').text()) == Number($('#max_charCount').text())) {
            $('#charCount').css("color", "goldenrod");
        } else {
            $('#charCount').css("color", "");
        }
    } else {
        if (Number($('#charCount').text()) === Number($('#max_charCount').text())) {
            $('#charCount').css("color", "goldenrod");
        } else {
            $('#charCount').css("color", "");
        }
    }
});
