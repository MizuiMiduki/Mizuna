const generate_account_list = function () {
    db.account.orderBy('id').keys(function (account_list_array) {
        get_user_db_data(account_list_array).then(account_list => {
            for (let i = 0; i < account_list.length; i++) {
                $('.account_display_area').append
                    (`
                        <div class="account_card_area">
                        <div id="account_card" data-id="${account_list[i]['id']}">
                        <table>
                        <tr>
                        <td><img class="account_card_icon${account_list[i]['id']}" src="/icon.png"></td>
                        <td>&nbsp;</td>
                        <td class="user_card_name"><p>${account_list[i]['name']}<br><span class="user_card_user_name">${account_list[i]['username']}@${account_list[i]['address']}</span></p></td>
                        </tr>
                        </table>
                        </div>
                        <input type="checkbox" class="delete_select_checknox" data-id="${account_list[i]['id']}"/>
                        </div>
                        `);
                if (user_options.is_visible_icon == true) {
                    $('.account_card_icon' + account_list[i]['id']).attr('src', account_list[i]['avatarurl']);
                } else {
                    $('.account_card_icon' + account_list[i]['id']).attr('src', "/icon.png");
                }
            }
        });
    });
}
