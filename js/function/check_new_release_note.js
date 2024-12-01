const check_new_release_note = function () {
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

                    }
                }
            });
        })
        .catch(error => {
            console.error('ReleaseNote Check error:', error);
        });
}
