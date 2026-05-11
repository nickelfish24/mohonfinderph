import { registerRootComponent } from 'expo';

if (typeof global.WeakRef !== 'function') {
  global.WeakRef = class WeakRef {
    constructor(target) {
      this._target = target;
    }

    deref() {
      return this._target;
    }
  };
}

if (typeof global.FinalizationRegistry !== 'function') {
  global.FinalizationRegistry = class FinalizationRegistry {
    constructor() {}

    register() {}

    unregister() {
      return true;
    }
  };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
