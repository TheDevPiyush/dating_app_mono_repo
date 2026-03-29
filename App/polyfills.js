if (typeof WeakRef === 'undefined') {
  globalThis.WeakRef = class WeakRef {
    #target;
    constructor(target) {
      if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
        throw new TypeError('WeakRef target must be an object or function');
      }
      this.#target = target;
    }
    deref() {
      return this.#target;
    }
  };
}

if (typeof FinalizationRegistry === 'undefined') {
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    constructor(_callback) {}
    register(_target, _heldValue, _unregisterToken) {}
    unregister(_unregisterToken) {}
  };
}
