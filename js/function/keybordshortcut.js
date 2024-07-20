// コントロール+エンターキーで投稿
document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.altKey) {
        switch (event.key) {
            case 'Enter':
                // 投稿
                $(".note_submit").click();
                break;
            case 'p':
                // 投稿範囲パブリック
                $("#visibility_public").click();
                break;
            case 'h':
                // 投稿範囲ホーム
                $("#visibility_home").click();
                break;
            case 'f':
                // 投稿範囲フォロワー
                $("#visibility_followers").click();
                break;
            case 'w':
                // CW
                $("#cw").click();
                break;
            case 'm':
                // from Mizuna
                $("#note_end_mizuna_checkbox").click();
                break;
            case 'c':
                // フォームクリア
                $("#form_clear_button").click();
                break;
        }
    }
});
