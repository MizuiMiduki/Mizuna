const settings_service = function () {
    $(".main_column").load("/parts/settings.html", function () {
        var window_height = $(window).height();
        var header_height = $('.header').height();
        var tab_height = $('.cp_tabs').height();
        var footer_height = $('.user_icon_back').outerHeight() + $('.footer_user_name').height();
        var maxHeight = window_height - footer_height - header_height - tab_height;
        $('.cp_tabpanels').height(maxHeight);

        $('.tab_label').click(function () {
            const classes = $(this).attr('class').split(' ');
            const tabClass = classes.find(className => className.startsWith('tab') && className !== 'tab_label');

            $('.cp_tabpanel').css('display', 'none');
            $('.cp_tabpanel.' + tabClass).css('display', 'block');
            if ('tab3' === tabClass) {
                // Mizunaについてを生成
                $("#mizuna_version_span").text(mizuna_options.mizuna_version);
                document.getElementById('Copyright_year').textContent = new Date().getFullYear();
            }
        });

        // 投稿範囲
        switch (user_options.default_visibility) {
            case 1:
                // public
                $("#visibility_public").addClass('active')
                break;
            case 2:
                // home
                $("#visibility_home").addClass('active')
                break;
            case 3:
                // followers
                $("#visibility_followers").addClass('active')
                break;
            default:
                $("#visibility_public").addClass('active')
                break;
        }

        // デフォルトで投稿の末尾に『(from Mizuna)』を付ける
        switch (user_options.is_note_end_mizuna) {
            case false:
                // true
                $("#is_note_end_mizuna_false").addClass('active')
                break;
            case true:
                // false
                $("#is_note_end_mizuna_true").addClass('active')
                break;
            default:
                $("#is_note_end_mizuna_false").addClass('active')
                break;
        }

        // アイコン画像を非表示にする
        switch (user_options.is_visible_icon) {
            case false:
                // false
                $("#is_visible_icon_true").addClass('active')
                break;
            case true:
                // true
                $("#is_visible_icon_false").addClass('active')
                break;
            default:
                $("#is_visible_icon_false").addClass('active')
                break;
        }

        // アイコンの色を取得する
        switch (user_options.is_pick_theme_color) {
            case true:
                $("#is_get_icon_keycolor_true").addClass('active')
                break;
            case false:
                $("#is_get_icon_keycolor_false").addClass('active')
                break;
            default:
                $("#is_get_icon_keycolor_false").addClass('active')
                break;
        }

        // ダークモード
        switch (user_options.is_darkmode) {
            case 1:
                $("#darkmode_disable").addClass('active')
                break;
            case 2:
                $("#darkmode_auto").addClass('active')
                break;
            case 3:
                $("#darkmode_enable").addClass('active')
                break;
            default:
                $("#darkmode_disable").addClass('active')
                break;
        }
    });
}

function visibilityOption(element) {
    var options = document.getElementsByClassName('visibility-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }

    // 投稿範囲
    switch (element.id) {
        case "visibility_public":
            // public
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        default_visibility: 1,
                    }
                },
            ])
            user_options.default_visibility = 1;
            break;
        case "visibility_home":
            // home
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        default_visibility: 2,
                    }
                },
            ])
            user_options.default_visibility = 2;
            break;
        case "visibility_followers":
            // followers
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        default_visibility: 3,
                    }
                },
            ])
            user_options.default_visibility = 3;
            break;
    }

    element.classList.add('active');
}

function noteEndOption(element) {
    var options = document.getElementsByClassName('note_end-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }

    // デフォルトで投稿の末尾に『(from Mizuna)』を付ける
    switch (element.id) {
        case "is_note_end_mizuna_false":
            // public
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_note_end_mizuna: false,
                    }
                },
            ])
            user_options.is_note_end_mizuna = false;
            break;
        case "is_note_end_mizuna_true":
            // home
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_note_end_mizuna: true,
                    }
                },
            ])
            user_options.is_note_end_mizuna = true;
            break;
    }

    element.classList.add('active');
}

function visibleIconOption(element) {
    var options = document.getElementsByClassName('visible_icon-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }

    // アイコンを非表示にする
    switch (element.id) {
        case "is_visible_icon_false":
            // false
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_visible_icon: true,
                    }
                },
            ])
            user_options.is_visible_icon = true;

            get_user_db_data([user_options.select_user])
                .then(get_db_result => {
                    if (get_db_result[0]) {
                        // フッター表示
                        user_data = get_db_result[0]
                        set_user_text(user_data)
                    }
                })
            break;
        case "is_visible_icon_true":
            // true
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_visible_icon: false,
                    }
                },
            ])
            user_options.is_visible_icon = false;
            $('#menu_icon').attr('src', "/icon.png");
            break;
    }

    element.classList.add('active');
}

function GetIconKeycolorOption(element) {
    var options = document.getElementsByClassName('get_icon_keycolor-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }

    // アイコンから色を取得する
    switch (element.id) {
        case "is_get_icon_keycolor_false":
            // false
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_pick_theme_color: false,
                    }
                },
            ])
            user_options.is_pick_theme_color = false;
            get_icon_key_color();
            break;
        case "is_get_icon_keycolor_true":
            // true
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_pick_theme_color: true,
                    }
                },
            ])
            user_options.is_pick_theme_color = true;
            get_icon_key_color();
            break;
    }

    element.classList.add('active');
}

function clearCache() {
    window.location.reload(true);
}

function darkmodeOption(element) {
    var options = document.getElementsByClassName('darkmode-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }

    // 投稿範囲
    switch (element.id) {
        case "darkmode_disable":
            // public
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_darkmode: 1,
                    }
                },
            ])
            user_options.is_darkmode = 1;
            darkmode();
            get_icon_key_color()
            break;
        case "darkmode_auto":
            // home
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_darkmode: 2,
                    }
                },
            ])
            user_options.is_darkmode = 2;
            darkmode();
            get_icon_key_color()
            break;
        case "darkmode_enable":
            // followers
            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        is_darkmode: 3,
                    }
                },
            ])
            user_options.is_darkmode = 3;
            darkmode();
            break;
    }

    element.classList.add('active');
}
