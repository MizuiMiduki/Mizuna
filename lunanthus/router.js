$(async function () {
    const routes = await import("./routes.js");
    const $app = $("#app");

    const renderPage = async () => {
        const path = location.pathname;
        const route = routes.default.find(r => r.path === path);

        if (route) {
            const pathName = route.path.slice(1);

            /**
             * Last-Modified を取得する関数
             *
             * @param {{ file: string }} route
             */
            const getLastModifiedDate = async (route) => {
                try {
                    const response = await fetch(route.file, { method: 'HEAD' });
                    const lastModified = response.headers.get('Last-Modified');

                    if (lastModified) {
                        const date = new Date(lastModified);
                        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
                    }
                } catch (error) {
                    // エラー時は現在時刻を返す
                }

                const now = new Date();
                return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            };

            const lastModifiedDate = await getLastModifiedDate(route);

            // HTMLの取得と挿入
            const html = await fetch(route.file + `?t=${lastModifiedDate}`).then(res => res.text());
            $app.html(html);

            // スクリプトの動的読み込み（type="module" 対応）
            $("script[type='module']").remove();

            if (route.script) {
                const $script = $("<script>").attr({
                    src: route.script + `?t=${Date.now()}`,
                    type: "module",
                    charset: "UTF-8"
                });
                $("body").append($script);
            }

            // スタイルシートの動的読み込み
            // title="Style" で識別
            $("link[rel='stylesheet'][title='Style']").remove();

            if (route.style === null) {
                // 明示的にスタイルシートが無い場合は何もしない
            } else if (route.style) {
                const $style = $("<link>").attr({
                    rel: "stylesheet",
                    href: `${route.style}?t=${Date.now()}`,
                    type: "text/css",
                    title: "Style"
                });
                $("head").append($style);
            } else {
                // route.style が無い場合はすべてのstylesheetを削除
                $("link[rel='stylesheet']").remove();
            }

        } else {
            $app.html("<h1>404<br>Not Found</h1>");
        }
    };

    // popstate（ブラウザの戻る・進む）で再描画
    $(window).on("popstate", renderPage);

    // 内部リンクのクリックをインターセプト（SPA風ナビゲーション）
    $("body").on("click", "a", function (event) {
        const $target = $(this);
        const href = $target.attr("href");

        if (href && $target.prop("origin") === location.origin) {
            const pathname = new URL(href, location.origin).pathname;

            if (routes.default.some(r => r.path === pathname)) {
                event.preventDefault();
                history.pushState(null, "", pathname);
                renderPage();
            }
        }
    });

    // 初回描画
    renderPage();
});
