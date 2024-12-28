const img_error = function (img) {
    img.onerror = null;
    img.src = '/icon.png';
}
