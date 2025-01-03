// 投稿用
const send_note = function (user_data) {
    var cw_content = $(".cw_content").val();
    var note_content = $(".note_content").val();
    var visibility = get_visibility_select();

    if ("" !== note_content) {
        if ($('.cw_input_ara').css('display') === 'block') {
            var param = {
                "i": user_data.token,
                "cw": cw_content,
                "text": note_content + from_mizuna(),
                "visibility": visibility,
            };
        } else {
            var param = {
                "i": user_data.token,
                "text": note_content + from_mizuna(),
                "visibility": visibility,
            };
        }
        if (Number($('#charCount').text()) <= Number($('#max_charCount').text())) {
            param = JSON.stringify(param);
            let type = "post"
            let url = "https://" + user_data.address + "/api/notes/create"
            $.ajax({
                type: type,
                url: url,
                data: param,
                contentType: 'application/json',
                dataType: 'json',
                scriptCharset: 'utf-8',
                success: function () {
                    toastr["success"]('ノート成功');
                    $('textarea').val("");
                    $('#charCount').text(0)
                    $(".note_submit").prop("disabled", false);
                    localStorage.clear();
                },
                error: function () {
                    toastr["error"]("ノートできませんでした");
                    $(".note_submit").prop("disabled", false);
                }
            });
        } else {
            toastr["warning"]('文字数が多すぎます');
            $(".note_submit").prop("disabled", false);
        }
    } else {
        toastr["warning"]('なにか入力してください', 'ノートが空です');
        $(".note_submit").prop("disabled", false);
    }
}
