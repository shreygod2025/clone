import { registerRootComponent } from 'expo';

// Polyfill AbortSignal.timeout if absent in Hermes / older JS engines
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = function (ms) {
    const controller = new AbortController();
    setTimeout(() => {
      try {
        controller.abort(new Error('TimeoutError'));
      } catch {}
    }, ms);
    return controller.signal;
  };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

