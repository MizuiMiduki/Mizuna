$(function () {
    'use strict';

    window.addEventListener('online', event => {
        document.getElementById('ofline_modal').classList.add('hidden');
        document.getElementById('mask3').classList.add('hidden');
    })

    window.addEventListener('offline', event => {
        document.getElementById('ofline_modal').classList.remove('hidden');
        document.getElementById('mask3').classList.remove('hidden');
    })

    const address = localStorage.getItem('address');
    const token = localStorage.getItem('token');
    const user_name_id = localStorage.getItem('user_name_id');
    const user_icon_link = localStorage.getItem('user_icon_link');
    const user_icon_none = localStorage.getItem('user_icon_none');

    if (address == null) {
        document.getElementById('mask1').classList.remove('hidden');
        document.getElementById('input_address_token').classList.remove('hidden');
    }

    $("#input_submit").click(function () {
        const address = document.getElementById('address_input').value
        const token = document.getElementById('token_input').value
        localStorage.setItem("address", address);
        localStorage.setItem("token", token);
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
                localStorage.setItem("user_icon_link", data.avatarUrl);
                localStorage.setItem("user_name_id", data.name + "(@" + data.username + "@" + address + ")");
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

    $("#submit").click(function () {
        let url = "https://" + address + "/api/notes/create"
        let type = "post"

        let param = {
            "i": token,
            "text": $(".note_content").val()
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
                var note_content = document.getElementById("note_content input_area");
                note_content.value = '';
            },
            error: function () {
                document.getElementById('mask').classList.remove('hidden');
                document.getElementById('modal').classList.remove('hidden');
            }
        });
    });
    document.getElementById('mask').addEventListener('click', () => {
        document.getElementById('mask').classList.add('hidden');
        document.getElementById('modal').classList.add('hidden');
    });

    window.addEventListener("DOMContentLoaded", () => {
        const textareaEls = document.querySelectorAll("textarea");

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
        document.getElementById('update_0').classList.add('hidden');
    });

    $("#logout").click(function () {
        document.getElementById('logout_confirm').classList.remove('hidden');
    })
    $("#logout_yes").click(function () {
        localStorage.removeItem("address");
        localStorage.removeItem("token");
        localStorage.removeItem("user_name_id");
        localStorage.removeItem("user_icon_link");
        location.reload()
    })
    $("#logout_no").click(function () {
        document.getElementById('logout_confirm').classList.add('hidden');
    })
    $("#about_me").click(function () {
        document.getElementById('about_me_modal').classList.remove('hidden');
    })
    $("#config").click(function () {
        document.getElementById('config_modal').classList.remove('hidden');
    })
    $("#user_icon_none").click(function () {
        if (user_icon_none == 0 || user_icon_none == null) {
            localStorage.setItem("user_icon_none", 1);
            location.reload()
        } else if (user_icon_none == 1) {
            localStorage.setItem("user_icon_none", 0);
            location.reload()
        }
    })
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
                localStorage.setItem("user_icon_link", data.avatarUrl);
                localStorage.setItem("user_name_id", data.name + "(@" + data.username + "@" + address + ")");
                location.reload()
            }
        });
    })
    $("#update_check").click(function () {
        document.getElementById('user_menu').classList.add('hidden');
        if (!('serviceWorker' in navigator))
            return;
        navigator.serviceWorker.getRegistration()
            .then(registration => {
                if (registration.waiting != null) {
                    document.getElementById('mask1').classList.remove('hidden');
                    document.getElementById('update_1').classList.remove('hidden');
                    document.getElementById('update_0').classList.add('hidden');
                    document.getElementById('mask2').classList.add('hidden');
                    disableUpdateButton();
                }
                else {
                    registration.update()
                        .then(registration => {
                            const installingWorker = registration.installing;
                            if (installingWorker != null) {
                                installingWorker.onstatechange = e => {
                                    if (e.target.state == 'installed') {
                                        document.getElementById('mask1').classList.remove('hidden');
                                        document.getElementById('update_1').classList.remove('hidden');
                                        document.getElementById('update_0').classList.add('hidden');
                                        document.getElementById('mask2').classList.add('hidden');
                                        disableUpdateButton();
                                    }
                                }
                            }
                            document.getElementById('mask2').classList.remove('hidden');
                            document.getElementById('update_0').classList.remove('hidden');
                        });
                }
            });
    })
});

// エンターキーで投稿
document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.key === 'Enter') {
		$("#submit").click();
    }
});