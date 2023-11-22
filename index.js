$(function () {
    'use strict';

    // 指定中のアカウントの要素番号を取得
    var select_account = localStorage.getItem("select_account");

    // 指定中のアカウントの要素番号が空だったときの処理
    if (select_account == null) {
        localStorage.setItem("select_account", 0);
    }
    // オンライン・オフライン検知
    // オンラインになったときの処理
    window.addEventListener('online', event => {
        document.getElementById('ofline_modal').classList.add('hidden');
        document.getElementById('mask3').classList.add('hidden');
    })
    // オフラインになったときの処理
    window.addEventListener('offline', event => {
        document.getElementById('ofline_modal').classList.remove('hidden');
        document.getElementById('mask3').classList.remove('hidden');
    })

    // サーバーアドレスのリストを取得
    var address_list = localStorage.getItem('address');
    if (address_list == null) {
        var address = null
    } else {
        address_list = JSON.parse(address_list)
        var address = address_list[select_account]
    }

    // トークンのリストを取得
    var token_list = localStorage.getItem('token');
    if (token_list == null) {
        var token = null
    } else {
        token_list = JSON.parse(token_list)
        var token = token_list[select_account]
    }

    // ユーザーネームのリストを取得
    var user_name_id_list = localStorage.getItem('user_name_id');
    if (user_name_id_list == null) {
        var user_name_id = null
    } else {
        user_name_id_list = JSON.parse(user_name_id_list)
        var user_name_id = user_name_id_list[select_account]
    }

    // ユーザーアイコンのリストを取得
    var user_icon_link_list = localStorage.getItem('user_icon_link');
    if (user_icon_link_list == null) {
        var user_icon_link = null
    } else {
        user_icon_link_list = JSON.parse(user_icon_link_list)
        var user_icon_link = user_icon_link_list[select_account]
    }

    // "ユーザーアイコン表示切り替え"の設定値を取得
    var user_icon_none = localStorage.getItem('user_icon_none');

    // "末尾に文言を付ける"の設定値を取得
    var note_end_mizuna_status = localStorage.getItem('note_end_mizuna_status');

    //note_end_mizuna_statusが1だったらチェックボックスを有効化する
    if (note_end_mizuna_status == 1) {
        document.getElementById('note_end_mizuna_checkbox').checked = true;
    }

    // アドレスが未登録(非ログイン)のときの処理
    if (address == null) {
        document.getElementById('mask1').classList.remove('hidden');
        document.getElementById('input_address_token').classList.remove('hidden');
    }


    // 新規ログイン
    $("#input_submit").click(function () {
        var address = document.getElementById('address_input').value
        var token = document.getElementById('token_input').value
        address_list = [address]
        token_list = [token]
        localStorage.setItem("address", JSON.stringify(address_list));
        localStorage.setItem("token", JSON.stringify(token_list));
        location.reload()
    })

    if (address != null && user_name_id == null) {
        let user_data_type = "post"
        let user_data_url = "https://" + address + "/api/i"
        let user_data = {
            "i": token
        }
        user_data = JSON.stringify(user_data);
        $.ajax({
            type: user_data_type,
            url: user_data_url,
            data: user_data,
            contentType: 'application/json',
            dataType: 'json',
            scriptCharset: 'utf-8',
            success: function (data) {
                user_icon_link_list = []
                user_icon_link_list.push(data.avatarUrl)
                user_name_id_list = []
                user_name_id_list.push(data.name + "(@" + data.username + "@" + address + ")")
                localStorage.setItem("user_icon_link", JSON.stringify(user_icon_link_list));
                localStorage.setItem("user_name_id", JSON.stringify(user_name_id_list));
                location.reload()
            },
            error: function () {
                document.getElementById('mask1').classList.remove('hidden');
                document.getElementById('input_address_token').classList.remove('hidden');
                document.getElementById('login_settings_title').innerHTML = "ログインに失敗しました<br>もう一度入力してください";
            }
        });
    }
    if (user_icon_link !== null) {
        if (user_icon_none == 0 || user_icon_none == null) {
            $('.user_icon').attr('src', user_icon_link);
        }
    }

    if (user_name_id !== null) {
        document.getElementById('user_name').innerHTML = user_name_id;
    }

    $("#add").click(function () {
        let clone = document.importNode(document.querySelector('#input-template').content, true);
        document.querySelector('#input-param').appendChild(clone);
    });

    // CWボタン
    $("#cw").click(function () {
        $(".cw_content").toggleClass("hidden");
    });


    //投稿ボタン
    $("#submit").click(function () {
        var note_content_input = $(".note_content").val();
        if (note_content_input === "" || !note_content_input.match(/\S/g)) {
            document.getElementById('mask').classList.remove('hidden');
            document.getElementById('modal').classList.remove('hidden');
        } else {
            let url = "https://" + address + "/api/notes/create"
            let type = "post"
            var visibility_select = document.getElementById('visibility_select');
            var visibility = visibility_select.value
            var note_end_mizuna = document.getElementById('note_end_mizuna_checkbox').checked;

            if (note_end_mizuna == false) {
                var note_text = note_content_input
                if (note_end_mizuna_status == 1) {
                    localStorage.setItem('note_end_mizuna_status', 0);
                }
            }
            else if (note_end_mizuna == true) {
                var note_text = note_content_input + "\n(from Mizuna)"
                if (note_end_mizuna_status == 0 || note_end_mizuna_status == null) {
                    localStorage.setItem('note_end_mizuna_status', 1)
                }
            }

            if ($('.cw_content').hasClass('hidden') == false) {
                var cw_text = $(".cw_content").val();
            }

            let param = {
                "i": token,
                "cw": cw_text,
                "text": note_text,
                "visibility": visibility
            };

            param = JSON.stringify(param);

            $.ajax({
                type: type,
                url: url,
                data: param,
                contentType: 'application/json',
                dataType: 'json',
                scriptCharset: 'utf-8',
                success: function () {
                    $('textarea').val("");
                },
                error: function () {
                    document.getElementById('mask').classList.remove('hidden');
                    document.getElementById('modal').classList.remove('hidden');
                }
            });
        }

    });
    document.getElementById('mask').addEventListener('click', () => {
        document.getElementById('mask').classList.add('hidden');
        document.getElementById('modal').classList.add('hidden');
    });

    window.addEventListener("DOMContentLoaded", () => {
        var textareaEls = document.querySelectorAll("textarea");

        textareaEls.forEach((textareaEl) => {
            textareaEl.setAttribute("style", `height: ${textareaEl.scrollHeight}px;`);
            textareaEl.addEventListener("input", setTextareaHeight);
        });

        function setTextareaHeight() {
            this.style.height = "auto";
            this.style.height = `${this.scrollHeight}px`;
        }
    });

    document.getElementById('menu_icon').addEventListener('click', () => {
        document.getElementById('mask2').classList.remove('hidden');
        document.getElementById('user_menu').classList.remove('hidden');
    });

    document.getElementById('mask2').addEventListener('click', () => {
        document.getElementById('mask2').classList.add('hidden');
        document.getElementById('user_menu').classList.add('hidden');
        document.getElementById('logout_confirm').classList.add('hidden');
        document.getElementById('about_me_modal').classList.add('hidden');
        document.getElementById('config_modal').classList.add('hidden');
        document.getElementById('account_modal').classList.add('hidden');
    });

    // 設定
    //ログアウト
    $("#logout").click(function () {
        document.getElementById('logout_confirm').classList.remove('hidden');
        document.getElementById('user_menu').classList.add('hidden');
    })
    // ログアウト -Yes
    $("#logout_yes").click(function () {
        delete address_list[select_account]
        delete token_list[select_account]
        delete user_icon_link_list[select_account]
        delete user_name_id_list[select_account]
        localStorage.setItem("address", JSON.stringify(address_list));
        localStorage.setItem("token", JSON.stringify(token_list));
        localStorage.setItem("user_icon_link", JSON.stringify(user_icon_link_list));
        localStorage.setItem("user_name_id", JSON.stringify(user_name_id_list));
        location.reload()
    })
    // ログアウト -No
    $("#logout_no").click(function () {
        document.getElementById('logout_confirm').classList.add('hidden');
        document.getElementById('mask2').classList.add('hidden');
    })
    // about me
    $("#about_me").click(function () {
        document.getElementById('about_me_modal').classList.remove('hidden');
        document.getElementById('user_menu').classList.add('hidden');
    })
    // 設定
    $("#config").click(function () {
        document.getElementById('config_modal').classList.remove('hidden');
        document.getElementById('user_menu').classList.add('hidden');
    })

    // アカウント
    $("#account").click(function () {
        document.getElementById('account_modal').classList.remove('hidden');
        document.getElementById('user_menu').classList.add('hidden');
    })

    //ユーザーアイコン表示切り替え
    $("#user_icon_none").click(function () {
        if (user_icon_none == 0 || user_icon_none == null) {
            localStorage.setItem("user_icon_none", 1);
            location.reload()
        } else if (user_icon_none == 1) {
            localStorage.setItem("user_icon_none", 0);
            location.reload()
        }
    })

    //ユーザーデータ再取得
    $("#user_icon_name_reload").click(function () {
        let user_data_type = "post"
        let user_data_url = "https://" + address + "/api/i"
        let user_data = {
            "i": token
        }
        user_data = JSON.stringify(user_data);
        $.ajax({
            type: user_data_type,
            url: user_data_url,
            data: user_data,
            contentType: 'application/json',
            dataType: 'json',
            scriptCharset: 'utf-8',
            success: function (data) {
                user_icon_link_list[select_account] = data.avatarUrl;
                user_name_id_list[select_account] = data.name + "(@" + data.username + "@" + address + ")";
                console.log(user_icon_link_list)
                console.log(user_name_id_list)
                localStorage.setItem("user_icon_link", JSON.stringify(user_icon_link_list));
                localStorage.setItem("user_name_id", JSON.stringify(user_name_id_list));
                location.reload()
            }
        });
    })
})

// エンターキーで投稿
document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.key === 'Enter') {
        $("#submit").click();
    }
});