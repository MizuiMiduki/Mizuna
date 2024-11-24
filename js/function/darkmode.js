function darkmode() {
    switch (user_options.is_darkmode) {
        case 1:
            // ダークモード無効
            document.documentElement.style.setProperty('--main_color', 'lightblue');
            document.documentElement.style.setProperty('--background_color', 'white');
            document.documentElement.style.setProperty('--text_color: black;', 'black');
            document.documentElement.style.setProperty('--button_text_color', 'black');
            break;
        case 2:
            // ダークモード自動
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.style.setProperty('--main_color', 'darkblue');
                document.documentElement.style.setProperty('--background_color', 'black');
                document.documentElement.style.setProperty('--text_color: black;', 'white');
                document.documentElement.style.setProperty('--button_text_color', 'white');
            } else {
                document.documentElement.style.setProperty('--main_color', 'lightblue');
                document.documentElement.style.setProperty('--background_color', 'white');
                document.documentElement.style.setProperty('--text_color: black;', 'black');
                document.documentElement.style.setProperty('--button_text_color', 'black');
                get_icon_key_color();
            }
            break;
        case 3:
            // ダークモード有効
            document.documentElement.style.setProperty('--main_color', 'darkblue');
            document.documentElement.style.setProperty('--background_color', 'black');
            document.documentElement.style.setProperty('--text_color: black;', 'white');
            document.documentElement.style.setProperty('--button_text_color', 'white');
            break;
    }
}

darkmode();
