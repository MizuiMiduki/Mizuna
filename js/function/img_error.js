const img_error = function (img) {
    img.onerror = null;
    img.src = '/icon.png';
    error_get_icon_key_color();
}