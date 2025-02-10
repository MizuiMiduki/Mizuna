const end_note_send_anim = function () {
    $(".note_submit").removeClass('loading');
    $(".note_submit").html('ノートする&nbsp;<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"> <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /> </svg>');
}
const send_note = function (user_data) {
    $(".note_submit").addClass('loading');
    var cw_content = $(".cw_content").val();
    var note_content = $(".note_content").val();
    var files = $('#fileInput')[0].files;

    if ($('.cw_input_ara').css('display') === 'block') {
        var trimmed_cw_content = cw_content.replace(/[\s\u3000]/g, '');
        if (0 === trimmed_cw_content.length) {
            toastr["warning"]('なにか入力してください', 'CWが空です');
            $(".note_submit").prop("disabled", false);
            end_note_send_anim();
            return;
        }

        if (100 < trimmed_cw_content.length) {
            toastr["warning"]('100文字以内で入力してください', 'CWが長すぎます');
            $(".note_submit").prop("disabled", false);
            end_note_send_anim();
            return;
        }
    }

    var trimmed_content = note_content.replace(/[\s\u3000]/g, '');
    if (0 === trimmed_content.length) {
        toastr["warning"]('なにか入力してください', 'ノートが空です');
        $(".note_submit").prop("disabled", false);
        end_note_send_anim();
        return;
    }

    if (files) {
        uploadImage(files, user_data, note_content, cw_content);
    } else {
        var visibility = get_visibility_select();
        sendNoteContent(user_data, note_content, cw_content, visibility);
    }
};

function uploadImage(files, user_data, note_content, cw_content) {
    if (0 >= comparison_version("3.5.0", user_data.add_mizuna_versinon)) {
        $(".note_submit").html(`画像アップロード中 (0/${files.length})...<div class="loading-spinner"></div>`);

        var fileIds_list = new Array(files.length); // 元の順番を保持するための配列
        var uploadPromises = [];

        function uploadFile(file, index) {
            return new Promise((resolve, reject) => {
                var ImgFormData = new FormData();
                ImgFormData.append('file', file);
                ImgFormData.append('i', user_data.token);

                $.ajax({
                    url: `https://${user_data.address}/api/drive/files/create`,
                    type: 'POST',
                    data: ImgFormData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        fileIds_list[index] = response.id; // インデックスに対応した位置に格納
                        $(".note_submit").html(`画像アップロード中 (${fileIds_list.filter(id => id).length}/${files.length})...<div class="loading-spinner"></div>`);
                        resolve(response.id);
                    },
                    error: function () {
                        toastr["error"]('画像のアップロードに失敗しました: ' + file.name);
                        reject(file.name);
                    }
                });
            });
        }

        // すべての画像を並列アップロード
        for (let i = 0; i < files.length; i++) {
            uploadPromises.push(uploadFile(files[i], i));
        }

        // すべてのアップロードが完了したらノートを送信
        Promise.all(uploadPromises)
            .then(() => {
                var visibility = get_visibility_select();
                sendNoteContent(user_data, note_content, cw_content, visibility, fileIds_list);
            })
            .catch(() => {
                $(".note_submit").prop("disabled", false);
                end_note_send_anim();
            });

    } else {
        toastr["warning"]('Mizuna 3.5.0以上のバージョンでアカウントを追加してください', 'このアカウントでは画像付きノートが出来ません');
    }
}

function sendNoteContent(user_data, note_content, cw_content, visibility, fileIds_list) {
    $(".note_submit").html('送信中...<div class="loading-spinner"></div>');
    var url = `https://${user_data.address}/api/notes/create`;
    var param = {
        "i": user_data.token,
        "text": note_content + from_mizuna(),
        "visibility": visibility,
    };

    if (cw_content) {
        param["cw"] = cw_content;
    }

    if (fileIds_list?.length) {
        param["fileIds"] = fileIds_list;
    }

    // 文字数チェック
    if (Number($('#charCount').text()) <= Number($('#max_charCount').text())) {
        $.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify(param), // JSON 文字列として送信
            contentType: 'application/json', // JSON データとして指定
            dataType: 'json',
            scriptCharset: 'utf-8',
            success: function () {
                toastr["success"]('ノート成功');
                $('textarea').val("");
                $('#charCount').text(0);
                $(".note_submit").prop("disabled", false);
                end_note_send_anim();
                $('#fileInput').val('');
                $('.input_image_preview_area').empty();
                localStorage.clear();
            },
            error: function (response) {
                toastr["error"]("ノートできませんでした");
                $(".note_submit").prop("disabled", false);
                end_note_send_anim();
            }
        });
    } else {
        toastr["warning"]('文字数が多すぎます');
        $(".note_submit").prop("disabled", false);
        end_note_send_anim();
    }
}
