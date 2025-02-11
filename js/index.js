// 設定を読み込み
$.getScript("/js/option/toastr_option.js");
$.getScript("/js/option/mizuna_option.js", function () {
    if (true === mizuna_options.maintenance) {
        window.location.href = mizuna_options.mizuna_address + '/maintenance.html';
    } else {
        $.getScript("/js/function/news_area.js");

        const wst_title = new URL(document.location).searchParams.get("title");
        const wst_text = new URL(document.location).searchParams.get("text");
        const wst_url = new URL(document.location).searchParams.get("url");

        if (wst_title || wst_text || wst_url) {
            localStorage.clear();

            if (wst_title) {
                localStorage.setItem('wst_title', wst_title);
            }
            if (wst_text) {
                localStorage.setItem('wst_text', wst_text);
            }
            if (wst_url) {
                localStorage.setItem('wst_url', wst_url);
            }
        }

        // indexed DB
        $.getScript("/js/option/indexed_db.js", function () {
            // ユーザー設定を読み込み
            $.getScript("/js/function/get_setting_db_data.js", function () {
                user_setting().then(() => {
                    $.getScript("/js/function/check_new_release_note.js", function () {
                        check_new_release_note();
                    });
                    $.getScript("/js/function/get_icon_key_color.js", function () {
                        $.getScript("/js/function/darkmode.js", function () {
                            $.getScript("/js/function/img_error.js");

                            // 初回判定
                            check_accountdb_status().then(function (check_accountdb_result) {
                                if (check_accountdb_result === 1) {
                                    // **
                                    // アカウントがある場合
                                    // **
                                    if (location.search !== "") {
                                        var address = localStorage.getItem("add_server_address")
                                        if (!address) {
                                            location.href = "/";
                                        }
                                        $.getScript("/js/service/add_account_service.js")
                                    } else {
                                        $.getScript("/js/service/inputform_service.js")
                                    }
                                } else {
                                    // **
                                    // アカウントがない場合
                                    // **
                                    $('.footer').css('display', 'none');
                                    $.getScript("/js/service/add_account_service.js")
                                }
                            });
                        });
                    });
                });
            });
        });
    }
});
$.getScript("/js/function/pull_to_refresh.js");
$.getScript("/js/function/comparison_version.js");
