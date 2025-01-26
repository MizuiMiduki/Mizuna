const newsContainer = document.querySelector('.news-container');
const newsContent = document.querySelector('.news-content');
const closeIcon = document.querySelector('.close-icon');

newsContainer.style.display = 'none';

if (mizuna_options.news_banner_title) {
    newsContent.textContent = mizuna_options.news_banner_title;
    newsContainer.style.display = 'block';
    newsContainer.style.opacity = 0;
    let opacity = 0;
    const fadeInInterval = setInterval(() => {
        if (opacity < 1) {
            opacity += 0.1;
            newsContainer.style.opacity = opacity;
        } else {
            clearInterval(fadeInInterval);
        }
    }, 30);
}

closeIcon.addEventListener('click', () => {
    let opacity = 1;
    const fadeOutInterval = setInterval(() => {
        if (opacity > 0) {
            opacity -= 0.1;
            newsContainer.style.opacity = opacity;
        } else {
            clearInterval(fadeOutInterval);
            newsContainer.style.display = 'none';
        }
    }, 30);
});

$(document).on('click', '.news-content-wrapper', function () {
    $.confirm({
        title: mizuna_options.news_banner_title,
        content: mizuna_options.news_banner_text,
        buttons: {
            "閉じる": function () {
            }
        }
    });
});
