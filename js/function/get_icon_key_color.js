// アイコンの色を取得してカスタムプロパティに設定する
const img = document.getElementById('menu_icon');

const get_icon_key_color = function () {
    if (false === user_options.is_visible_icon) {
        document.documentElement.style.setProperty('--main_color', 'lightblue');
        document.documentElement.style.setProperty('--text_color', 'black');
        document.documentElement.style.setProperty('--button_text_color', 'black');

        db.setting.bulkUpdate([
            {
                key: 1,
                changes: {
                    latest_theme_color: [
                        'lightblue',
                        'black',
                        'black'
                    ],
                }
            },
        ]);

        user_options.latest_theme_color = [
            'lightblue',
            'black',
            'black'
        ];

        return;
    }

    if (img.src.endsWith('/icon.png')) {
        return;
    }

    Vibrant.from(img).getPalette()
        .then((palette) => {
            document.documentElement.style.setProperty('--main_color', `rgb(${palette.LightVibrant.rgb.join(', ')})`);
            document.documentElement.style.setProperty('--text_color', `rgb(${palette.DarkVibrant.rgb.join(', ')})`);
            document.documentElement.style.setProperty('--button_text_color', `rgb(${palette.DarkVibrant.rgb.join(', ')})`);

            db.setting.bulkUpdate([
                {
                    key: 1,
                    changes: {
                        latest_theme_color: [
                            `rgb(${palette.LightVibrant.rgb.join(', ')})`,
                            `rgb(${palette.DarkVibrant.rgb.join(', ')})`,
                            `rgb(${palette.DarkVibrant.rgb.join(', ')})`
                        ],
                    }
                },
            ]);

            user_options.latest_theme_color = [
                `rgb(${palette.LightVibrant.rgb.join(', ')})`,
                `rgb(${palette.DarkVibrant.rgb.join(', ')})`,
                `rgb(${palette.DarkVibrant.rgb.join(', ')})`
            ];
        })
        .catch((error) => {
            console.error(error);
        });
}

img.onload = function () {
    darkmode();
}

const error_get_icon_key_color = function () {
    if (true === user_options.is_pick_theme_color) {
        document.documentElement.style.setProperty('--main_color', 'lightblue');
        document.documentElement.style.setProperty('--text_color', 'black');
        document.documentElement.style.setProperty('--button_text_color', 'black');

        db.setting.bulkUpdate([
            {
                key: 1,
                changes: {
                    latest_theme_color: [
                        'lightblue',
                        'black',
                        'black'
                    ],
                }
            },
        ]);

        user_options.latest_theme_color = [
            'lightblue',
            'black',
            'black'
        ];
    }
}