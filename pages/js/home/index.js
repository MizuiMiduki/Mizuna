window.cw_switch = function () {
    document.getElementById("cw_switch").classList.toggle("border");

    const el = document.getElementById("cw_textarea_container");
    const icon = document.querySelector("#cw_switch i");
    if (!el || !icon) return;

    el.classList.toggle("display_none");
    icon.textContent = el.classList.contains("display_none")
        ? "visibility"
        : "visibility_off";
};

window.visibility_switch = function (icon_name) {
    const visibility_icon = document.querySelector("#visibility_icon");
    visibility_icon.innerText = icon_name;

    const btn = visibility_icon.closest("button");
    btn.blur();
};

// フォームクリア(クリアボタン)
window.clear_input = function () {
    textarea_crear();

    const btn = document.querySelector("#more_vert_icon").closest("button");
    btn.blur();
};

// フォームクリア関数(送信後、クリアボタン共用)
const textarea_crear = function () {
    $('#main_textarea').val("");
    $('#cw_textarea').val("");
};
