// @ts-check

/**
 * @typedef {Object} UserData
 * @property {string} token - アカウントの認証トークン
 * @property {string} address - インスタンスのホスト名 (例: misskey.io)
 * @property {string} add_mizuna_versinon - Mizunaのバージョン (例: "3.5.0")
 */

/**
 * @typedef {Object} NoteParam
 * @property {string} i - 認証トークン
 * @property {string} text - ノートの本文
 * @property {string} visibility - 公開範囲
 * @property {string} [cw] - 閲覧注意の警告文（オプショナル）
 * @property {string[]} [fileIds] - 添付ファイルのIDリスト（オプショナル）
 */

/**
 * @typedef {function(string, string=): void} ToastrMethod
 * @typedef {Object} ToastrType
 * @property {ToastrMethod} warning - 警告トーストを表示
 * @property {ToastrMethod} success - 成功トーストを表示
 * @property {ToastrMethod} error - エラートーストを表示
 */

/** @type {import('jquery')} */
// @ts-ignore
var $ = window.$;

/** @type {ToastrType} */
// @ts-ignore
var toastr = window.toastr;

/** @type {function(): string} */
// @ts-ignore
var from_mizuna = window.from_mizuna;

/** @type {function(): string} */
// @ts-ignore
var get_visibility_select = window.get_visibility_select;

/** @type {function(string, string): number} */
// @ts-ignore
var comparison_version = window.comparison_version;

const end_note_send_anim = function () {
    $(".note_submit").removeClass('loading');
    $(".note_submit").html('ノートする&nbsp;<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"> <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /> </svg>');
};

/**
 * ノートを送信するメイン関数
 * @param {UserData} user_data
 */
const send_note = function (user_data) {
    $(".note_submit").addClass('loading');

    /** @type {string} */
    var cw_content = String($(".cw_content").val() || "");
    /** @type {string} */
    var note_content = String($(".note_content").val() || "");

    /** @type {FileList | null} */
    var files = (/** @type {HTMLInputElement} */ ($('#fileInput')[0]))?.files || null;

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

    if (files && files.length > 0) {
        uploadImage(files, user_data, note_content, cw_content);
    } else {
        var visibility = String(get_visibility_select() || "public");
        sendNoteContent(user_data, note_content, cw_content, visibility);
    }
};

/**
 * ランダムなファイル名を生成する (.webp固定)
 * @returns {string} 生成されたファイル名
 */
function generateRandomFileName() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID() + '.webp';
    } else {
        return Math.random().toString(36).substring(2, 15) + '_' + Date.now() + '.webp';
    }
}

/**
 * 画像をWebPに変換・圧縮する
 * @param {File} file - 圧縮元のFileオブジェクト
 * @param {number} [quality=0.75] - 圧縮品質 (0.0 ～ 1.0)
 * @returns {Promise<File>} 圧縮後のFileオブジェクトを返すプロミス
 */
function compressAndConvertToWebP(file, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (!e.target || typeof e.target.result !== 'string') {
                reject(new Error('File reader result is invalid'));
                return;
            }

            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas 2d context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(function (blob) {
                    if (!blob) {
                        reject(new Error('Canvas to Blob conversion failed'));
                        return;
                    }
                    const randomName = generateRandomFileName();
                    const compressedFile = new File([blob], randomName, { type: 'image/webp' });

                    const originalSizeKB = (file.size / 1024).toFixed(2);
                    const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
                    const reductionPercent = ((1 - (compressedFile.size / file.size)) * 100).toFixed(1);

                    console.log(`[画像圧縮] 元のファイル: ${file.name} (${originalSizeKB} KB) -> 圧縮後: ${randomName} (${compressedSizeKB} KB) [${reductionPercent}% 削減]`);

                    resolve(compressedFile);
                }, 'image/webp', quality);
            };
            img.onerror = function () {
                reject(new Error('Image load error'));
            };
            img.src = e.target.result;
        };
        reader.onerror = function () {
            reject(new Error('File reader error'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 画像を圧縮してAPIへアップロードする
 * @param {FileList} files - アップロードするファイルリスト
 * @param {UserData} user_data - ユーザー情報
 * @param {string} note_content - ノート本文
 * @param {string} cw_content - CW本文
 */
function uploadImage(files, user_data, note_content, cw_content) {
    if (0 >= comparison_version("3.5.0", user_data.add_mizuna_versinon)) {
        $(".note_submit").html(`画像圧縮中...<div class="loading-spinner"></div>`);

        const compressionPromises = Array.from(files).map(file => compressAndConvertToWebP(file, 0.75));

        Promise.all(compressionPromises)
            .then((compressedFiles) => {
                $(".note_submit").html(`画像アップロード中 (0/${compressedFiles.length})...<div class="loading-spinner"></div>`);

                /** @type {string[]} */
                var fileIds_list = new Array(compressedFiles.length);
                /** @type {Promise<string>[]} */
                var uploadPromises = [];

                /**
                 * ファイルを個別にアップロードする内部関数
                 * @param {File} file 
                 * @param {number} index 
                 * @returns {Promise<string>}
                 */
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
                                fileIds_list[index] = response.id;
                                $(".note_submit").html(`画像アップロード中 (${fileIds_list.filter(id => id).length}/${compressedFiles.length})...<div class="loading-spinner"></div>`);
                                resolve(response.id);
                            },
                            error: function () {
                                toastr["error"]('画像のアップロードに失敗しました: ' + file.name);
                                reject(new Error(file.name));
                            }
                        });
                    });
                }

                for (let i = 0; i < compressedFiles.length; i++) {
                    uploadPromises.push(uploadFile(compressedFiles[i], i));
                }

                return Promise.all(uploadPromises).then(() => fileIds_list);
            })
            .then((fileIds_list) => {
                var visibility = String(get_visibility_select() || "public");
                sendNoteContent(user_data, note_content, cw_content, visibility, fileIds_list);
            })
            .catch((error) => {
                console.error(error);
                toastr["error"]('画像の処理またはアップロード中にエラーが発生しました');
                $(".note_submit").prop("disabled", false);
                end_note_send_anim();
            });

    } else {
        toastr["warning"]('Mizuna 3.5.0以上のバージョンでアカウントを追加してください', 'このアカウントでは画像付きノートが出来ません');
    }
}

/**
 * 最終的なノート内容をAPIに送信する
 * @param {UserData} user_data - ユーザー情報
 * @param {string} note_content - ノート本文
 * @param {string} cw_content - CW本文
 * @param {string} visibility - 公開範囲
 * @param {string[]} [fileIds_list] - アップロードされたファイルのIDリスト
 */
function sendNoteContent(user_data, note_content, cw_content, visibility, fileIds_list) {
    $(".note_submit").html('送信中...<div class="loading-spinner"></div>');
    var url = `https://${user_data.address}/api/notes/create`;

    /** @type {NoteParam} */
    var param = {
        "i": user_data.token,
        "text": note_content + from_mizuna(),
        "visibility": visibility,
    };

    if (cw_content) {
        param["cw"] = cw_content;
    }

    if (fileIds_list && fileIds_list.length > 0) {
        param["fileIds"] = fileIds_list;
    }

    if (Number($('#charCount').text()) <= Number($('#max_charCount').text())) {
        $.ajax({
            type: 'POST',
            url: url,
            data: JSON.stringify(param),
            contentType: 'application/json',
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
