const $marqueeContainer = $('.marquee-container');
const $marqueeContent = $('.marquee-content');
const $closeIcon = $('.close-icon');

if (mizuna_options.marquee_text) {
    $marqueeContent.text(mizuna_options.marquee_text);
    $marqueeContainer.slideToggle();
}

$closeIcon.on('click', () => {
    $marqueeContainer.slideToggle();
});
