/* @refresh reload */
import { render } from 'solid-js/web';
import 'material-symbols/outlined.css';
import App from './App';
import './styles/app.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

// タッチ端末でタップ後にボタンのフォーカスやホバー擬似クラスが残留するのを防止
if (typeof window !== 'undefined') {
  window.addEventListener(
    'touchend',
    (e) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        'button, [role="button"], .button, .mizuna-btn, .mizuna-tool-chip, .mizuna-tool-icon-btn, .mizuna-media-edit, .mizuna-media-remove, .mizuna-floating-back-btn'
      );
      if (target && target instanceof HTMLElement) {
        setTimeout(() => {
          target.blur();
        }, 50);
      }
    },
    { passive: true }
  );
}

render(() => <App />, root);
