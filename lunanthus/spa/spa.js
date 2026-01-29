/**
 * @param {string} url - 遷移先のパスまたはURL
 */
export function navigateTo(url) {
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("popstate"));
}
