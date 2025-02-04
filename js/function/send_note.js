const end_note_send_anim = function () {
    $(".note_submit").removeClass('loading');
    $(".note_submit").html('ノートする');
}
const send_note = function (user_data) {
    var cw_content = $(".cw_content").val();
    var note_content = $(".note_content").val();
    var file = $('#fileInput')[0].files[0];


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

    if (file) {
        uploadImage(file, user_data, note_content, cw_content);
    } else {
        var visibility = get_visibility_select();
        sendNoteContent(user_data, note_content, cw_content, visibility);
    }
};

function uploadImage(file, user_data, note_content, cw_content) {
    if (0 >= comparison_version("3.5.0", user_data.add_mizuna_versinon)) {
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
                var visibility = get_visibility_select();
                var fileIds_list = [response.id];
                var updatedNoteContent = note_content;
                sendNoteContent(user_data, updatedNoteContent, cw_content, visibility, fileIds_list);
            },
            error: function () {
                toastr["error"]('画像のアップロードに失敗しました');
                $(".note_submit").prop("disabled", false);
                end_note_send_anim();
            }
        });
    } else {
        toastr["warning"]('Mizuna 3.5.0以上のバージョンでアカウントを追加してください', 'このアカウントでは画像付きノートが出来ません');
    }
}

function sendNoteContent(user_data, note_content, cw_content, visibility, fileIds_list) {
    var url = `https://${user_data.address}/api/notes/create`;
    var param = {
        "i": user_data.token,
        "text": note_content + from_mizuna(),
        "visibility": visibility,
    };

    if (cw_content) {
        param["cw"] = cw_content;
    }

    if (fileIds_list) {
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
                $('#fileInput').val(''); // ファイル入力をクリア
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
