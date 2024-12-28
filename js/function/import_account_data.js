function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

const import_account_data = async function () {
    const fileInput = document.getElementById("import_userdata_input");
    if (fileInput.files.length === 0) {
        toastr["warning"]('インポートするファイルを選択してください');
        return;
    }

    $.confirm({
        title: '⚠注意⚠',
        content: 'Mizunaからエクスポートしたアカウントファイル以外をインポートしないでください。<br>悪意のあるファイルをインポートすると第三者にデータが漏洩する可能性があります。<br>本当にインポートしますか？',
        buttons: {
            "はい": async function () {
                const file = fileInput.files[0];
                try {
                    const fileContent = await readFile(file);
                    let jsonData = JSON.parse(fileContent);

                    jsonData = jsonData.map(item => {
                        const { id, ...rest } = item;
                        return rest;
                    });

                    const recordCount = await db.account.count();
                    if (recordCount === 0) {
                        var isEmpty = true;
                    }

                    const recordsToInsert = [];

                    for (const record of jsonData) {
                        const exists = await db.account.where({
                            username: record.username,
                            address: record.address
                        }).count();

                        if (exists === 0) {
                            recordsToInsert.push(record);
                        }
                    }

                    if (recordsToInsert.length > 0) {
                        await db.account.bulkPut(recordsToInsert);
                    }

                    if (true === isEmpty) {
                        db.table('account').orderBy('id').first().then(record => {

                            db.setting.bulkUpdate([
                                {
                                    key: 1,
                                    changes: {
                                        select_user: record.id,
                                    }
                                },
                            ]).then(function () {
                                get_user_db_data([record.id])
                                    .then(get_db_result => {
                                        user_data = get_db_result[0];
                                        set_user_text(user_data);
                                        if (typeof inputform_service === "undefined") {
                                            $.getScript("/js/service/inputform_service.js").then(() => {
                                                inputform_service();
                                            });
                                        } else {
                                            inputform_service();
                                        }
                                        toggle_menu_input = 0;
                                    })
                            })

                        });
                    }

                    toastr["success"]('アカウント情報をインポートしました');
                } catch (error) {
                    toastr["error"]('インポートに失敗しました');
                }
            },
            "いいえ": function () {
                return;
            }
        }
    });
}
