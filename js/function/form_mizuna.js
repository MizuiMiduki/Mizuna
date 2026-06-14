// 外側の関数宣言を var にして二重読み込みエラーを防ぐにゃ！
var from_mizuna = function () {
    // チェックボックスの状態を取得
    var from_mizuna_select = $('#note_end_mizuna_checkbox').prop("checked");

    // 関数名と被らないように、結果を入れる変数名を新しくしたにゃ
    var result_text = "";

    if (from_mizuna_select === true) {
        result_text = "\n(from Mizuna)";
    } else {
        result_text = "";
    }

    return result_text;
}
