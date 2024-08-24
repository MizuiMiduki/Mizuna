if (title) {
    $('.note_content').val(title);
}

if (text) {
    var oldValue = String($(".note_content").val());
    if (oldValue) {
        $('.note_content').val(oldValue + "\n" + text);
    } else {
        $('.note_content').val(oldValue + text);
    }
}

if (url) {
    var oldValue = String($(".note_content").val());
    if (oldValue) {
        $('.note_content').val(oldValue + "\n" + url);
    } else {
        $('.note_content').val(oldValue + url);
    }
}
