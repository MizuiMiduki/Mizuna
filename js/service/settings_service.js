const settings_service = function () {
    $(".main_column").load("/parts/settings.html", function () {
        $("#loading_anime_area").remove();

        // Mizunaについてを生成
        $(".mizuna_version_span").text(mizuna_options.mizuna_version);

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
                // public
                $("#is_note_end_mizuna_false").addClass('active')
                break;
            case true:
                // home
                $("#is_note_end_mizuna_true").addClass('active')
                break;
            default:
                $("#is_note_end_mizuna_false").addClass('active')
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
