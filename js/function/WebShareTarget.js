const ls_title = localStorage.getItem("wst_title")
const ls_text = localStorage.getItem("wst_text")
const ls_url = localStorage.getItem("wst_url")

if (ls_title) {
    title = ls_title;
}
if (ls_text) {
    text = ls_text;
}
if (ls_url) {
    url = ls_url;
}

if (typeof title !== 'undefined') {
    $('.note_content').val(title);
}

if (typeof text !== 'undefined') {
    var oldValue = String($(".note_content").val());
    if (oldValue) {
        $('.note_content').val(oldValue + "\n" + text);
    } else {
        $('.note_content').val(oldValue + text);
    }
}

if (typeof url !== 'undefined') {
    var oldValue = String($(".note_content").val());
    if (oldValue) {
        $('.note_content').val(oldValue + "\n" + url);
    } else {
        $('.note_content').val(oldValue + url);
    }
}

if(localStorage.getItem("wst_title") != null || localStorage.getItem("wst_text") != null || localStorage.getItem("wst_url") != null){
    if (String($(".note_content").val()) === ""){
        location.reload;
    }
}
