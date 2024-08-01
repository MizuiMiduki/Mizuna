const generate_menu_service = function () {
    $(".main_column").load("/parts/change_account.html", function () {
        $("#loading_anime_area").remove();
        // アカウント一覧を表示
        generate_account_list()
    });
}

// アカウント追加ボタンをクリックでアカウント追加フォームへ
let load_add_account_service = false;
$(document).on('click', '.add_account_floating_button', function () {
    if (load_add_account_service === false) {
        // 初回ロード
        $.getScript("/js/servise/add_account_servise.js", function () {
            $('body').append(`
            <div class="back_inputform_floating_button">
                <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
                    <path
                        d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z">
                    </path>
                </svg>
                <p>もどる</p>
            </div>
        `);
        })
        load_add_account_service = true;
    } else {
        add_account_servise()
        $('body').append(`
            <div class="back_inputform_floating_button">
                <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
                    <path
                        d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z">
                    </path>
                </svg>
                <p>もどる</p>
            </div>
        `);
    }
});

// アカウント追加フォームからアカウント一覧に戻るボタン
$(document).on('click', '.back_inputform_floating_button', function () {
    $(".main_column").load("/parts/change_account.html", function () {
        $("#loading_anime_area").remove();
        // アカウント一覧を表示
        generate_account_list();

        // 戻るボタンを削除
        $(".back_inputform_floating_button").remove();
    });
});
