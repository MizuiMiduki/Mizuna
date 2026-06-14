const Dexie = /** @type {any} */(window).Dexie;

// indexed DB接続
const db = new Dexie("MizunaDatabase");

db.version(1).stores({
    account: "++id, token, name, username, address, avatarurl, add_mizuna_versinon",
    setting: "++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color"
});

db.version(2).stores({
    setting: "++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color, latest_theme_color, is_check_releasenote"
});

db.version(3).stores({
    setting: "++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color, latest_theme_color, is_check_releasenote, language"
});

db.open().catch(err => {
    console.error("Failed to open db:", err);
});
