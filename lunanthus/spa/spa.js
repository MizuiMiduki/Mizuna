/**
 * @param {string} url
 */
export function navigateTo(url) {
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("popstate"));
}
