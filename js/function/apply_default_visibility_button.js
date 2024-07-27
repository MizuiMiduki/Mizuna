// 公開範囲をユーザー設定に合わせて変更

const apply_default_visibility_button = function () {

    switch (user_options.default_visibility) {
        case 1:
            // public
            $("#visibility_public").prop('checked', true);
            break;
        case 2:
            // home
            $("#visibility_home").prop('checked', true);
            break;
        case 3:
            // followers
            $("#visibility_followers").prop('checked', true);
            break;
        default:
            $("#visibility_public").prop('checked', true);
            break;
    }
}

// 適用
apply_default_visibility_button();
