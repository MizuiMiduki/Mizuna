import { Portal } from 'solid-js/web';

interface FloatingBackButtonProps {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
}

export function FloatingBackButton(props: FloatingBackButtonProps) {
  return (
    <Portal>
      <button
        type="button"
        class="mizuna-floating-back-btn"
        onClick={props.onClick}
        aria-label={props.ariaLabel ?? props.label ?? 'もどる'}
      >
        <i>arrow_back</i>
        <span>{props.label ?? 'もどる'}</span>
      </button>
    </Portal>
  );
}
