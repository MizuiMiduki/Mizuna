const title = new URL(document.location).searchParams.get("title");
const text = new URL(document.location).searchParams.get("text");
const url = new URL(document.location).searchParams.get("url");

const wsta_text = "";

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
