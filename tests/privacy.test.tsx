import { render, screen, fireEvent } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../src/store/appStore';
import { PrivacyPolicyView } from '../src/components/PrivacyPolicyView';
import { DialogHost } from '../src/components/DialogHost';

describe('PrivacyPolicyView & Dialog Privacy Link', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('プライバシーポリシーの主要セクションがレンダリングされること', () => {
    render(() => (
      <AppProvider>
        <PrivacyPolicyView />
      </AppProvider>
    ));

    expect(screen.getByText('プライバシーポリシー')).toBeInTheDocument();
    expect(screen.getByText('1. 運営について')).toBeInTheDocument();
    expect(screen.getByText('2. データの取り扱いについて')).toBeInTheDocument();
    expect(screen.getByText('3. アクセス解析ツールについて')).toBeInTheDocument();
    expect(screen.getByText('4. 免責事項')).toBeInTheDocument();
    expect(screen.getByText('5. お問い合わせ')).toBeInTheDocument();
    expect(screen.getAllByText(/Google アナリティクス/).length).toBeGreaterThan(0);
  });

  it('戻るボタンをクリックするとビューが切り替わること', () => {
    let currentViewVal = '';
    function TestConsumer() {
      const { currentView } = useApp();
      currentViewVal = currentView();
      return <PrivacyPolicyView />;
    }

    render(() => (
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    ));

    const backButtons = screen.getAllByRole('button', { name: /もどる/ });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(backButtons[0]);

    // アカウントが0件の場合は add_account、ある場合は note
    expect(['add_account', 'note']).toContain(currentViewVal);
  });

  it('DialogHost で showPrivacyPolicy が有効な場合にプライバシーポリシーリンクが表示され遷移すること', () => {
    function TestHost() {
      const { openDialog, currentView } = useApp();

      return (
        <div>
          <button
            type="button"
            data-testid="trigger-dialog"
            onClick={() => {
              openDialog({
                title: 'ウェルカムポップアップ',
                showPrivacyPolicy: true,
                buttons: [{ label: 'OK' }],
              });
            }}
          >
            開く
          </button>
          <div data-testid="current-view">{currentView()}</div>
          <DialogHost />
        </div>
      );
    }

    render(() => (
      <AppProvider>
        <TestHost />
      </AppProvider>
    ));

    // ダイアログを開く
    fireEvent.click(screen.getByTestId('trigger-dialog'));

    // プライバシーポリシーリンク（カード）が表示されていること
    const privacyBtn = screen.getByRole('button', { name: /PRIVACY POLICY/ });
    expect(privacyBtn).toBeInTheDocument();

    // クリックするとダイアログが閉じ、privacy ビューへ切り替わること
    fireEvent.click(privacyBtn);
    expect(screen.getByTestId('current-view').textContent).toBe('privacy');
  });
});
