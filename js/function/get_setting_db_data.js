const get_setting_db_data = function () {
    return db.setting.bulkGet([1]);
};

const user_setting = function () {
    get_setting_db_data()
        .then(get_db_result => {
            var setting_data = get_db_result[0] ?? null;
            if (setting_data) {
                user_options = {
                    // 表示するユーザーのID(初期値:1)
                    "select_user": setting_data.select_user ?? 1,
                    // デフォルトの投稿範囲(初期値:1 / 1:public, 2:home, 3:followers)
                    "default_visibility": setting_data.default_visibility ?? 1,
                    // ノートの最後に"from Mizuna"をデフォルトで付けるか(初期値:false)
                    "is_note_end_mizuna": setting_data.is_note_end_mizuna ?? false,
                    // 自分のアイコンを表示するか(初期値:true)
                    "is_visible_icon": setting_data.is_visible_icon ?? true,
                    // UIモード(初期値:1)
                    "ui_mode": setting_data.ui_mode ?? 1,
                    // ダークモードを有効にするか(初期値:1)
                    "is_darkmode": setting_data.is_darkmode ?? 1,
                    // アイコンカラーを元にUIカラーを変更するか(初期値:false)
                    "is_pick_theme_color": setting_data.is_pick_theme_color ?? false,
                }
            } else {
                // ユーザー設定が存在しなかった場合に全て初期値で新規作成して再試行
                db.setting.add({ select_user: 1, default_visibility: 1, is_note_end_mizuna: false, is_visible_icon: true, ui_mode: 1, is_darkmode: 1, is_pick_theme_color: false }).then(() => {
                    user_setting();
                })
            }
        })
};
