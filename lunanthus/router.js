document.addEventListener("DOMContentLoaded", async () => {
    const routes = await import("/lunanthus/routes.js");
    const app = document.getElementById("app");

    const renderPage = async () => {
        const path = location.pathname;
        const route = routes.default.find(r => r.path === path);
        if (route) {
            const response = await fetch(route.file);
            const html = await response.text();
            app.innerHTML = html;

            if (route.style) {
                const existingStyle = document.querySelector('link[data-page-style]');
                if (existingStyle) {
                    existingStyle.remove();
                }

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = route.style + `?t=${Date.now()}`; // キャッシュ防止
                link.dataset.pageStyle = true;
                document.head.appendChild(link);
            }

            if (route.script) {
                const existingScript = document.querySelector(`script[src="${route.script}"]`);
                if (existingScript) {
                    existingScript.remove();
                }

                const script = document.createElement("script");
                script.src = route.script + `?t=${Date.now()}`; // キャッシュ防止にゃ
                script.type = "module";
                document.body.appendChild(script);
            }
        } else {
            app.innerHTML = "<h1>404<br>Not Found</h1>";
        }
    };

    // ブラウザ戻る・進む対応
    window.addEventListener("popstate", renderPage);

    // リンククリックでルーティング対応
    document.body.addEventListener("click", (event) => {
        const target = event.target.closest("a");
        if (target && target.href && target.origin === location.origin) {
            const pathname = new URL(target.href).pathname;
            if (routes.default.some(r => r.path === pathname)) {
                event.preventDefault();
                history.pushState(null, "", pathname);
                renderPage();
            }
        }
    });

    // 初回表示
    renderPage();
});
