/* @refresh reload */
import 'beercss/dist/cdn/beer.min.css';
import 'beercss';
import 'material-dynamic-colors';
import { render } from '@solidjs/web';
import App from './App';
import './styles/app.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

render(() => <App />, root);
