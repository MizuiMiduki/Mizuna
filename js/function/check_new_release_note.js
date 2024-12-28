const check_new_release_note = function () {
    if (null === user_options.is_check_releasenote) {
        db.setting.bulkUpdate([
            {
                key: 1,
                changes: {
                    is_check_releasenote: mizuna_options.mizuna_version,
                }
            },
        ]);
        return;
    }

    if (mizuna_options.mizuna_version !== user_options.is_check_releasenote) {
        const apiUrl = 'https://blossomsarchive.com/wp-json/api/v1/mizuna-latest-release_note/';

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                $.confirm({
                    title: `🎉Mizunaアップデート🎉`,
                    content: `バージョン${mizuna_options.mizuna_version}に更新されました<br>
                        更新内容 : <a href="${data.url}" rel="noopener noreferrer"target="_blank">${data.title}</a>`,
                    buttons: {
                        "わかった": function () {
                            db.setting.bulkUpdate([
                                {
                                    key: 1,
                                    changes: {
                                        is_check_releasenote: mizuna_options.mizuna_version,
                                    }
                                },
                            ]);
                        }
                    }
                });
            })
    }
}
