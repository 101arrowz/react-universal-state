# react-universal-state

Global state for your React app, simplified.

## Usage
```jsx
import React, { Fragment } from 'react';
import createState from 'react-universal-state';

// The default values for each key for the global state
const defaults = {
  theme: 'light',
  firstLogin: true
};

const {
  hook: useGlobalData,
  hoc: withGlobalData
} = createState(defaults, true); // Using true persists state to Local Storage

// Instead of a hook, this creates a higher-order component
// The state is separate from the above call!
const withGlobalSession = createState({
  sessionID: null,
  currentlyOnline: true
}).hoc; // <-- Since we didn't specify true for persistence, state is not saved


const MyFunctionalComponent = () => {
  // Since this is a hook, this component will automatically rerender
  // when the theme changes!
  const [theme, setTheme] = useGlobalData.theme();

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
  } = useGlobalData(['theme', 'firstLogin']);
  
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
const MyWrappedClassComponent = withGlobalSession(MyClassComponent);
```

## Purpose
The goal of this package is to provide a clean, versatile, and easy way to manipulate and persist inter-component and/or global state. It is meant as a direct replacement for other tools that offer similar functionality (e.g. Redux). It is also incredibly small (1kb minzipped) and reasonably efficient.

Like other global state managers, you will still likely need to use a centralized file (i.e. containing all of the global hooks and HOCs) but due to the simplicity of the API, most changes will be much faster with `react-universal-state` than with other packages.

## Documentation
Detailed documentation will be added in a future update. For now, see the comments in the usage section for information.

Note that when using the Local Storage persistence backend, all values in the state must be JSON-serializable. Additionally, if you change the order of calls to `createState` that use the Local Storage backend, they will load incorrect data; therefore, it's recommended to manually create your own backend.
```js
import createState from 'react-universal-state';

// Specifying a key in the local storage to use removes all order issues
// Note that reusing this for multiple calls will mean that the global state is
// shared between each call.
const backend = new LocalStorageBackend('globalState');

// Second parameter is the backend object instead of a boolean
const useGlobal = createState({ hello: 'world' }, backend).hook;
```

## Advanced: TypeScript
`react-universal-state` is written in TypeScript and ships with types by default.
```tsx
import React, { useEffect } from 'react';
import createState from 'react-universal-state';

const { hook: useGlobalState } = createState({
  a: 'hello',
  b: null as string // Need to specify type manually when it cannot be inferred
});

const MyComponent = () => {
  const [a, setA] = useGlobalState('a') // Autocomplete for the parameter names
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

All of these custom backends should extend the exported `StateBackend` class.

```js
import createGlobalState, { StateBackend } from 'react-universal-state';
class CustomBackend extends StateBackend {
  constructor() {
    super();
    this.state = {};
  }

  get(k) {
    const val = this.state[k];
    console.log('Got value of', k+':', val);
    return val;
  }

  set(k, v) {
    console.log('Setting value of', k, 'to', v);
    this.state[k] = v;
  }
}

const myBackend = new CustomBackend();
createGlobalState({ some: 'data' }, myBackend);
```