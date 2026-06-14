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
        // 新しいAPIのエンドポイントに差し替えたにゃ
        const apiUrl = 'https://blossomsarchive.com/wp-json/wp/v2/posts?categories=162';

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // WordPress標準APIは配列がそのまま返ってくるので、data[0] で最新記事を取得するにゃ
                const latestPost = data[0];

                if (latestPost) {
                    // タイトルは latestPost.title.rendered、URLは latestPost.link に変わるにゃ
                    $.confirm({
                        title: `🎉Mizunaアップデート🎉`,
                        content: `バージョン${mizuna_options.mizuna_version}に更新されました<br>
更新内容 : <a href="${latestPost.link}" rel="noopener noreferrer" target="_blank">${latestPost.title.rendered}</a>`,
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
                }
            })
            .catch(error => {
                console.error("リリースノートの取得に失敗しましたにゃ:", error);
            });
    }
}
