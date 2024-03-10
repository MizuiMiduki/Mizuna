// 投稿用
const send_note = function (user_data, note_content, cw_content) {
    console.log("!!!")
    if (note_content) {
        if (cw_content) {
            console.log("CW投稿")
            var param = {
                "i": user_data.token,
                "cw": cw_content,
                "text": note_content,
            };
        } else {
            console.log("通常投稿")
            var param = {
                "i": user_data.token,
                "text": note_content,
            };
        }

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
                $('textarea').val("");
                return 1;
            },
            error: function () {
                console.log("エラー")
                return 1;
            }
        });
    } else {
        console.log("ノートが空")
        return 1;
    }
}