let shareOpts = {
    title: 'Mizuna - ノート専用Misskeyクライアント',
    text: 'Mizunaは機能をノート送信のみにすることで通信量削減に重点を置いたMisskeyクライアントです',
    url: 'https://mizuna.blossomsarchvive.com/',
};

const webshare = function () {
    navigator.share(shareOpts);
}