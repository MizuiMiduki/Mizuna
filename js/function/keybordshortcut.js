// コントロール+エンターキーで投稿
document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.altKey && event.key === 'Enter') {
        $(".note_submit").click();
    }
});
