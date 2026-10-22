import gsap from 'gsap';
import { createSignal, For, onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';
import {
  fetchAnnouncements,
  formatAnnouncementDate,
  type AnnouncementItem,
} from '../services/misskeyApi';

export function AnnouncementsView() {
  const { accounts, setCurrentView } = useApp();
  const [announcements, setAnnouncements] = createSignal<AnnouncementItem[]>([]);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [totalPages, setTotalPages] = createSignal(1);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isError, setIsError] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let listRef: HTMLDivElement | undefined;

  const loadPage = async (page: number) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetchAnnouncements(page, 10);
      setAnnouncements(res.items);
      setCurrentPage(res.currentPage);
      setTotalPages(res.totalPages);

      if (listRef) {
        gsap.fromTo(
          listRef,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
        );
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    if (containerRef) {
      gsap.fromTo(
        containerRef,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
      );
    }
    loadPage(1);
  });

  const handleBack = () => {
    setCurrentView(accounts().length > 0 ? 'note' : 'add_account');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages() || newPage === currentPage() || isLoading()) {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPage(newPage);
  };

  const getPageNumbers = () => {
    const total = totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  };

  return (
    <div ref={containerRef} class="mizuna-announcements-view">
      {/* セクションヘッダー */}
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">お知らせ</h2>
          <p class="mizuna-section-desc">Mizuna のアップデート情報・リリースノート</p>
        </div>
        <button
          type="button"
          class="mizuna-btn mizuna-btn-outline"
          onClick={handleBack}
        >
          <i>arrow_back</i>
          <span>もどる</span>
        </button>
      </div>

      {/* ローディング表示 */}
      <Show when={isLoading() && announcements().length === 0}>
        <div class="mizuna-loading-center center-align middle-align">
          <progress class="circle large" />
        </div>
      </Show>

      {/* エラー表示 */}
      <Show when={isError() && announcements().length === 0}>
        <div class="mizuna-empty-card center-align">
          <i class="mizuna-empty-icon">cloud_off</i>
          <p class="mizuna-empty-title">お知らせの取得に失敗しました</p>
          <p class="mizuna-empty-desc">通信環境を確認の上、再試行してください。</p>
          <div class="mizuna-empty-actions">
            <button
              type="button"
              class="mizuna-btn mizuna-btn-primary"
              onClick={() => loadPage(currentPage())}
            >
              <i>refresh</i>
              <span>再読み込み</span>
            </button>
            <a
              href="https://blossomsarchive.com/blog/category/mizuna/"
              target="_blank"
              rel="noopener noreferrer"
              class="mizuna-btn mizuna-btn-outline"
            >
              <i>open_in_new</i>
              <span>ブラウザで開く</span>
            </a>
          </div>
        </div>
      </Show>

      {/* お知らせ一覧 */}
      <Show when={announcements().length > 0}>
        <div ref={listRef} class="mizuna-announcements-list">
          <For each={announcements()}>
            {(item) => (
              <article class="mizuna-announcement-card">
                <div class="mizuna-announcement-header">
                  <span class="mizuna-announcement-date">
                    <i>calendar_today</i>
                    <span>{formatAnnouncementDate(item.date)}</span>
                  </span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mizuna-announcement-ext-btn"
                    title="記事を読む"
                    aria-label="記事を読む"
                  >
                    <span>記事を読む</span>
                    <i>open_in_new</i>
                  </a>
                </div>

                <h3 class="mizuna-announcement-title">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h3>

                <Show when={item.snippet}>
                  <p class="mizuna-announcement-snippet">{item.snippet}</p>
                </Show>
              </article>
            )}
          </For>
        </div>

        {/* ページネーションバー */}
        <Show when={totalPages() > 1}>
          <div class="mizuna-pagination-bar" role="navigation" aria-label="お知らせページネーション">
            <button
              type="button"
              class="mizuna-btn mizuna-btn-outline mizuna-pagination-nav-btn"
              disabled={currentPage() <= 1 || isLoading()}
              onClick={() => handlePageChange(currentPage() - 1)}
              aria-label="前のページ"
            >
              <i>chevron_left</i>
              <span>前へ</span>
            </button>

            <div class="mizuna-pagination-pages">
              <For each={getPageNumbers()}>
                {(pageNum) => (
                  <button
                    type="button"
                    class={`mizuna-page-number-btn ${pageNum === currentPage() ? 'is-active' : ''}`}
                    disabled={isLoading()}
                    onClick={() => handlePageChange(pageNum)}
                    aria-label={`ページ ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                )}
              </For>
            </div>

            <button
              type="button"
              class="mizuna-btn mizuna-btn-outline mizuna-pagination-nav-btn"
              disabled={currentPage() >= totalPages() || isLoading()}
              onClick={() => handlePageChange(currentPage() + 1)}
              aria-label="次のページ"
            >
              <span>次へ</span>
              <i>chevron_right</i>
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
