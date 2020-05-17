# react-universal-state

Global state for your React app, simplified.

## Usage
```jsx
import React, { Fragment } from 'react';
import {
  createGlobalStateHook,
  createGlobalStateHOC
} from 'react-universal-state';

// The default values for each key for the global state
const defaults = {
  theme: 'light',
  firstLogin: true
};

// Using true automatically persists the state to Local Storage
const useGlobal = createGlobalStateHook(defaults, true);

// Instead of a hook, this creates a higher-order component
// The state is separate from useGlobal!
const withGlobal = createGlobalStateHOC({
  sessionID: null,
  currentlyOnline: true
}); // <-- Since we didn't specify true for persistence, state is not saved


const MyFunctionalComponent = () => {
  // Since this is a hook, this component will automatically rerender
  // when the theme changes!
  const [theme, setTheme] = useGlobal.theme();

  // You can also call useGlobal directly with the name of the global parameter
  const [firstLogin] = useGlobal('firstLogin');

  return (
    <Fragment>
      <div>Theme is: {theme}</div>
      {firstLogin && <div>Welcome, new user!</div>}
    </Fragment>
  );
}

const MyOtherComponent = () => {
  // You can use an array of global keys to get multiple hooks in one call!
  const {
    theme: [theme, setTheme],
    firstLogin: [, setFirstLogin]
  } = useGlobal(['theme', 'firstLogin']);
  
  // Note that if you specify nothing, i.e. with useGlobal() alone, it defaults
  // to using all parameters at once, so the above call could have simply been
  // useGlobal()
  
  return (
    <Fragment>

      {/* Clicking either button will update MyFunctionalComponent as well */}
      <button onClick={() => setTheme('dark')}>Dark theme!</button>

      {firstLogin && (
        <button onClick={() => setFirstLogin(false)}>
          I'm ready to go!
        </button>
      )}
      
    </Fragment>
  );
};

class MyClassComponent extends React.Component {
  render() {
    const {
      globalState: { sessionID, currentlyOnline },
      setGlobalState
    } = this.props;
    
    return (
      <Fragment>
        <div>Your session ID is {sessionID}</div>
        <button
          onClick={() => {
            // Can update only some keys - no need to specify entire new state
            setGlobalState({ sessionID: 'keyboard cat' });
          }}
          disabled={!currentlyOnline}
        >
          Click here to refresh
        </button>
      </Fragment>
    );
  }
};

// Like with the hook, you can use array of keys, a single string key, or no
// second parameter (meaning all global keys) to have access to.
const MyWrappedClassComponent = withGlobal(MyClassComponent);
```

## Purpose
The goal of this package is to provide a clean, versatile, and easy way to manipulate and persist global state. It is meant as a direct replacement for other tools that offer similar functionality (e.g. Redux). It is also has an incredibly tiny impact on bundle size when minified.

Like other global state managers, you will still likely need to use a centralized file (i.e. containing all of the global hooks and HOCs) but due to the simplicity of the API, most changes will be much faster with `react-universal-state` than with other packages.

## Documentation
Detailed documentation will be added in a future update. For now, see the comments in the usage section for information.

Note that when using the Local Storage persistence backend, all values in the state must be JSON-serializable. Additionally, if you change the order of calls to `createGlobalStateHook` or `createGlobalStateHOC` that use the Local Storage backend, they will load incorrect data; therefore, it's recommended to manually create your own backend.
```js
import { createGlobalStateHook, createLocalStorageBackend } from 'react-universal-state';

// Specifying a key in the local storage to use removes all order issues
// Note that reusing this for multiple calls will mean that the global state is
// shared between each call.
const backend = createLocalStorageBackend('globalState');

// Second parameter is the backend object instead of a boolean
const useGlobal = createGlobalStateHook({ hello: 'world' }, backend);
```

## Advanced: TypeScript
`react-universal-state` is written in TypeScript and ships with types by default.
```tsx
import React, { useEffect } from 'react';
import { createGlobalStateHook } from 'react-universal-state';

const useGlobal = createGlobalStateHook({
  a: 'hello',
  b: null as string // Need to specify type manually when it cannot be inferred
});

const MyComponent = () => {
  const [a, setA] = useGlobal('a') // Autocomplete for the parameter names
  useEffect(() => {
    setA(false); // Error: invalid type
  }, []);
  return (
    <div>{a}</div>
  );
};
```
## Advanced: Custom State Backends
You can create your own state holder if you have some custom logic or want to persist the data in another way. It must support synchronous `.get(k)` and `.set(k, v)` operations. If you have to use an asynchronous API (like Indexed DB) for persistence, the best option is to run the necessary operations in the background and hope your user doesn't close their browser while they are running.

```js
import { createGlobalStateHook } from 'react-universal-state';
class CustomBackend {
  constructor() {
    this.globalState = {};
  }

  get(k) {
    const val = this.globalState[k];
    console.log('Got value of', k+':', v);
  }

  set(k, v) {
    console.log('Setting value of', k, 'to', v);
    this.globalState[k] = v;
  }
}

const myBackend = new CustomBackend();
createGlobalStateHook({ some: 'data' }, myBackend);
```