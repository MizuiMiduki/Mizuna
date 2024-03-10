const import_userdata = function () {
    const fileInput = $("#import_userdata_input")[0];
    const file = fileInput.files[0];
    let form_data = `
    <div class="modal_back">
        <section class="import_form">
        <p>下記のアカウントをインポートします</p>
        <div id="import_account_list"></div>
        </section>
    <div>
    `    
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const contents = e.target.result;
            const contents_array = JSON.parse(contents)
            $(".modal_back").remove()
            $("#menu_display_area").append(form_data)
            for (let i = 0; i <= contents_array.length - 1; i++) {
                $("#import_account_list").append(`<div class="import_account_card"><p>${contents_array[i].name}<br>@${contents_array[i].username_address}</p></div>`)
            }
            $(".import_form").append(`<button onclick='add_account_area()'>戻る</button><button onclick='add_indexeddb_import(${JSON.stringify(contents_array)})'>確定</button>`)
        };
        reader.readAsText(file);
    } else {
        alert("ファイルを選択してください")
    }
}
