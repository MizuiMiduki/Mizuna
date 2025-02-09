// 入力欄の読み込み
const inputform_service = function () {
    $(".main_column").load("/parts/form.html", function () {
        $("#loading_anime_area").remove();
        // 文字数カウンターをロード
        $.getScript("/js/function/note_content_count.js")
        // デフォルトの公開範囲ボタンにユーザー設定を適用
        if (typeof apply_default_visibility_button === "undefined") {
            $.getScript("/js/function/apply_default_visibility_button.js").then(() => {
                inputform_service();
            });
        } else {
            apply_default_visibility_button();
        }
    })
}

inputform_service();

// アカウント情報読み込み
$.getScript("/js/function/get_user_db_data.js", function () {
    get_user_db_data([user_options.select_user])
        .then(get_db_result => {
            if (get_db_result[0]) {
                // フッター表示
                user_data = get_db_result[0]
                $.getScript("/js/function/set_user_text.js", function () {
                    set_user_text(user_data)
                })
                // ノート送信関数をロード
                $.getScript("/js/function/send_note.js")
            } else {
                db.table('account').orderBy('id').first()
                    .then(record => {
                        db.setting.bulkUpdate([
                            {
                                key: 1,
                                changes: {
                                    select_user: record.id,
                                }
                            },
                        ])
                        get_user_db_data([record.id])
                            .then(get_db_result => {
                                // フッター表示
                                user_data = get_db_result[0]
                                $.getScript("/js/function/set_user_text.js", function () {
                                    set_user_text(user_data)
                                })
                            })

                    });
            }
        })
})

// キーボードショートカットを読み込み
$.getScript("/js/function/keybordshortcut.js")

// ノート送信ボタン
var send_standby = 1
$.getScript("/js/function/get_visibility_select.js")
$.getScript("/js/function/form_mizuna.js")

function note_send_submit() {
    $(".note_submit").prop("disabled", true);
    send_note(user_data);
}

// 公開範囲ボタンをラジオボタンと同じ挙動にする
$(document).on("click", ".visibility_checkbox", function () {
    $('.visibility_checkbox').prop('checked', false);
    $(this).prop('checked', true);
});

// CWエリアの表示切り替え
$(document).on("click", "#cw", function () {
    $('.cw_input_ara').slideToggle();
});

// フォームクリアボタン
$(document).on("click", "#form_clear_button", function () {
    toastr["success"]('フォームクリア！');
    localStorage.clear();
    $('.cw_content').val('');
    $('.note_content').val('');
    $('#charCountSpace').text('0000');
    $('#cw_charCount').text(0);
    $('#charCount').text(0);
    $('#fileInput').val('');
    $('.input_image_preview_area').empty();
});

// アカウントメニューボタン
let load_generate_menu_service = false;
let toggle_menu_input = 0;
$(document).on("click", "#menu_icon", function () {
    if ($('.input_block').length) {
        if (toggle_settings_input === 0) {
            cw_content_tmp = $('.cw_content').val();
            note_content_tmp = $('.note_content').val();
            cw_button_tmp = $('#cw').prop("checked");
        }
    }

    $(".main_column").empty();
    $(".back_inputform_floating_button").remove();

    if (toggle_menu_input === 0) {
        $(".main_column").load("/parts/loading.html");
        toggle_menu_input = 1;
        toggle_settings_input = 0;

        if (load_generate_menu_service === false) {
            // 初回ロード
            $.getScript("/js/function/generate_account_list.js", function () {
                $.getScript("/js/service/generate_menu_service.js", function () {
                    generate_menu_service();
                });
            });
            load_generate_menu_service = true;
        } else {
            generate_menu_service();
        }
    } else if (toggle_menu_input === 1) {
        toggle_menu_input = 0;
        toggle_settings_input = 0;

        $(".main_column").load("/parts/form.html", function () {
            apply_default_visibility_button();
            websharetarget();
            if (cw_button_tmp) {
                $("#cw").prop("checked", true);
                $(".cw_input_ara").css('display', 'block');
                $('.cw_content').text(cw_content_tmp);
            }
            $('.note_content').val(note_content_tmp);
            let textLength = $('.note_content').val().length;
            let cw_textLength = $('.cw_content').val().length;
            let digitCount = textLength.toString().length;
            let spaceCount = Math.max(0, 5 - digitCount);
            let spaces = '0'.repeat(spaceCount);
            $('#charCountSpace').text(spaces);
            $('#charCount').text(textLength);
            $('#cw_charCount').text(cw_textLength);
            $.getScript("/js/function/note_content_count.js")
        });
    }
});

// Web Share Target
$.getScript("/js/function/WebShareTarget.js", function () {
    websharetarget();
})

// 設定メニューボタン
let load_settings_service = false;
let toggle_settings_input = 0;
$(document).on("click", "#settings_icon", function () {
    if ($('.input_block').length) {
        if (toggle_settings_input === 0) {
            cw_content_tmp = $('.cw_content').val();
            note_content_tmp = $('.note_content').val();
            cw_button_tmp = $('#cw').prop("checked");
        }
    }

    $(".main_column").empty();
    $(".back_inputform_floating_button").remove();

    if (toggle_settings_input === 0) {
        $(".main_column").load("/parts/loading.html");
        toggle_settings_input = 1;
        toggle_menu_input = 0;

        if (load_settings_service === false) {
            // 初回ロード
            $.getScript("/js/service/settings_service.js", function () {
                settings_service();
                $.getScript("/js/function/WebShare.js");
            });
            load_settings_service = true;
        } else {
            settings_service();
        }
    } else if (toggle_settings_input === 1) {
        toggle_settings_input = 0;
        toggle_menu_input = 0;

        $(".main_column").load("/parts/form.html", function () {
            apply_default_visibility_button();
            websharetarget();
            if (cw_button_tmp) {
                $("#cw").prop("checked", true);
                $(".cw_input_ara").css('display', 'block');
                $('.cw_content').text(cw_content_tmp);
            }
            $('.note_content').val(note_content_tmp);
            let textLength = $('.note_content').val().length;
            let digitCount = textLength.toString().length;
            let spaceCount = Math.max(0, 5 - digitCount);
            let spaces = '0'.repeat(spaceCount);
            $('#charCountSpace').text(spaces);
            $('#charCount').text(textLength);
            $.getScript("/js/function/note_content_count.js")
        });
    }
});

// フォームのヒント表示
$(document).on('focus', '.input_area', function () {
    $('.now_input_user_area').removeClass("now_input_user_none");
    $('.now_input_user_area').addClass("now_input_user_block");
    get_user_db_data([user_options.select_user])
        .then(get_db_result => {
            // フッター表示
            user_data = get_db_result[0]
            $('.now_input_user_name').text(`${user_data.name}(${user_data.address})`);
            if (user_options.is_visible_icon === true) {
                $('.now_input_user_icon').attr('src', user_data.avatarurl);
            }
        })
});

$(document).on("blur", ".input_area", function () {
    $('.now_input_user_area').removeClass("now_input_user_block");
    $('.now_input_user_area').addClass("now_input_user_none");
});

// 画像プレビュー
$(document).on('change', '#fileInput', function () {
    if (16 < this.files.length) {
        toastr["error"]('画像は16枚までです', '画像選択エラー');
        this.value = "";
    }

    if (1 <= this.files.length) {
        $('.input_image_preview_area').empty();

        Array.from(this.files).forEach(file => {
            var reader = new FileReader();

            reader.onload = function (e) {
                var previewArea = $('<div>', {
                    class: 'image_preview_area'
                });

                var imgElement = $('<img>', {
                    class: 'input_image_preview',
                    src: e.target.result
                });

                previewArea.append(imgElement);

                $('.input_image_preview_area').append(previewArea);
            };

            reader.readAsDataURL(file);
        });
    }
});

// 画像をクリックでモーダル表示
$(document).on('click', '.input_image_preview', function () {
    $('#modalImage').attr('src', $(this).attr('src'));
    $('#imageModal').addClass('active');
});

// モーダルを閉じる
$(document).on('click', '#imageModal', function () {
    $('#imageModal').removeClass('active');
});
