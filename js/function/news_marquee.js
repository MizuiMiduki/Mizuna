const marqueeContainer = document.querySelector('.marquee-container');
const marqueeContent = document.querySelector('.marquee-content');
const closeIcon = document.querySelector('.close-icon');

marqueeContainer.style.display = 'none';

if (mizuna_options.marquee_text) {
    marqueeContent.textContent = mizuna_options.marquee_text;
    marqueeContainer.style.display = 'block';
    marqueeContainer.style.opacity = 0;
    let opacity = 0;
    const fadeInInterval = setInterval(() => {
        if (opacity < 1) {
            opacity += 0.1;
            marqueeContainer.style.opacity = opacity;
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
            marqueeContainer.style.opacity = opacity;
        } else {
            clearInterval(fadeOutInterval);
            marqueeContainer.style.display = 'none';
        }
    }, 30);
});
