const websharetarget = function (retryCount = 0) {
    const maxRetries = 5;

    const title = localStorage.getItem("wst_title");
    const text = localStorage.getItem("wst_text");
    const url = localStorage.getItem("wst_url");

    if (title !== null || text !== null || url !== null) {
        let oldValue = $(".note_content").val() || "";

        if (title) {
            oldValue += (oldValue ? "\n" : "") + title;
        }

        if (text) {
            oldValue += (oldValue ? "\n" : "") + text;
        }

        if (url) {
            oldValue += (oldValue ? "\n" : "") + url;
        }

        $('.note_content').val(oldValue);

        setTimeout(() => {
            if ($('.note_content').val().trim() === "" && retryCount < maxRetries) {
                websharetarget(retryCount + 1);
            }
        }, 100)
    }
    return;
}
