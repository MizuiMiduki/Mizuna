async function fetchData(page_num = 1) {
    const response = await fetch('https://blossomsarchive.com/wp-json/wp/v2/posts?categories=162&per_page=10&page=' + page_num);
    const posts = await response.json();
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);

    $('#news_list').empty();
    posts.forEach((/** @type {{ title: { rendered: string }, date: string, link: string }} */ post) => {
        const title = post.title?.rendered || '';
        const date = post.date ? post.date.substring(0, 10).replaceAll('-', '/') : '';
        const url = post.link || '';
        $('#news_list').append(`
            <li>
                <div class="max">
                    <h6 class="small">${title}</h6>
                    <div>${date}</div>
                </div>
                <button onclick="window.open('${encodeURI(url)}', '_blank')" class="circle"><i>open_in_new</i></button>
            </li>
        `);
    });

    const data = {
        current_page: page_num,
        total_pages: totalPages
    };
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

    // 中間ページボタン (多すぎるときの省略処理)
    const createPageButton = (/** @type {number} */ i) => {
        const $btn = $(`<button class="border no-round vertical"><i>page_control</i><span>${i}</span></button>`);
        if (i === data.current_page) $btn.addClass('active');
        $btn.on('click', () => fetchData(i));
        $nav.append($btn);
    };

    const createEllipsis = () => {
        const $dots = $('<button class="border no-round vertical" disabled><i>more_horiz</i><span>...</span></button>');
        $nav.append($dots);
    };

    if (data.total_pages <= 7) {
        for (let i = 1; i <= data.total_pages; i++) {
            createPageButton(i);
        }
    } else {
        createPageButton(1);

        const start = Math.max(2, data.current_page - 1);
        const end = Math.min(data.total_pages - 1, data.current_page + 1);

        if (start > 2) {
            createEllipsis();
        }

        for (let i = start; i <= end; i++) {
            createPageButton(i);
        }

        if (end < data.total_pages - 1) {
            createEllipsis();
        }

        createPageButton(data.total_pages);
    }

    // 次のページボタン
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
$(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPage = parseInt(params.get("page") || "1") || 1;
    fetchData(initialPage);
});
