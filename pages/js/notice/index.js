async function fetchData(page_num = 1) {
    const response = await fetch('https://blossomsarchive.com/wp-json/api/v1/mizuna-latest-release_note/?page=' + page_num);
    const data = await response.json();

$('#news_list').empty();
    data['posts'].forEach((/** @type {{ title: string, date: string, url: string }} */ post) => {
        $('#news_list').append(`
            <li>
                <div class="max">
                    <h6 class="small">${post['title']}</h6>
                    <div>${post['date']}</div>
                </div>
                <button onclick="window.open('${encodeURI(post["url"])}', '_blank')" class="circle"><i>open_in_new</i></button>
            </li>
        `);
    });

renderPagination(data);

    const url = new URL(window.location.href);
    url.searchParams.set("page", String(data.current_page));
    history.pushState(null, "", url.toString());
}

/**
 * @param {{ current_page: number, total_pages: number }} data
 */
function renderPagination(data) {
    const $pagination = $('#news_pagination');
    $pagination.empty();

    const $nav = $('<nav class="group connected"></nav>');

    // 前のページボタン
    const prevPage = Math.max(1, data.current_page - 1);
    const $prev = $('<button class="border left-round vertical"><i>chevron_left</i><span>Prev</span></button>');
    if (data.current_page === 1) {
        $prev.prop('disabled', true);
    } else {
        $prev.on('click', () => fetchData(prevPage));
    }
    $nav.append($prev);

    // 中間ページボタン
    for (let i = 1; i <= data.total_pages; i++) {
        const $btn = $(`<button class="border no-round vertical"><i>page_control</i><span>${i}</span></button>`);
        if (i === data.current_page) $btn.addClass('active');
        $btn.on('click', () => fetchData(i));
        $nav.append($btn);
    }

    // 次のページボタン
    // TODO: 多すぎるときの省略処理
    const nextPage = Math.min(data.total_pages, data.current_page + 1);
    const $next = $('<button class="border right-round vertical"><i>chevron_right</i><span>Next</span></button>');
    if (data.current_page === data.total_pages) {
        $next.prop('disabled', true);
    } else {
        $next.on('click', () => fetchData(nextPage));
    }
    $nav.append($next);

    $pagination.append($nav);
}

// 初期ページをURLから読み取って表示
$(document).ready(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPage = parseInt(params.get("page") || "1") || 1;
    fetchData(initialPage);
});
