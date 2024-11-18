// アイコンの色を取得してカスタムプロパティに設定する
const img = document.getElementById('menu_icon');

const get_icon_key_color = function () {
    if (img.src.endsWith('/icon.png')) {
        document.documentElement.style.setProperty('--main_color', 'lightblue');
        document.documentElement.style.setProperty('--button_text_color', 'black');
        return;
    }

    Vibrant.from(img).getPalette()
        .then((palette) => {
            document.documentElement.style.setProperty('--main_color', `rgb(${palette.LightVibrant.rgb.join(', ')})`);
            document.documentElement.style.setProperty('--button_text_color', `rgb(${palette.DarkVibrant.rgb.join(', ')})`);
        })
        .catch((error) => {
            console.error(error);
        });
}

img.onload = function () {
    if (true == user_options.is_pick_theme_color) {
        get_icon_key_color();
    }
}
