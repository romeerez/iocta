# TypeScript IoC Container Library

A lightweight, type-safe Inversion of Control (IoC) container for TypeScript that enables modular application architecture with dependency injection, automatic lifecycle management, and explicit dependency graphs.

## Idea, goals, what's included

The idea is the same as in NestJS: the app is organized in vertical slices, every slice has an explicit module file,
modules depend on each other, dependencies are injected via constructors. All the services are instantiated and
dependencies are injected by the framework, not manually.

**Goals**:

- no classes
- no decorators
- no tokens
- explicit dependencies (no "Service Locator" pattern)

**Not implemented**:

- circular dependencies: modules **can** import each other, but two services cannot inject each other. This is
  achievable and could be implemented if you need it and open issue.
- async: all factory functions, `run` and `stop` callbacks are synchronous. `stop` could support async easily though.
  It could be supported with additional syntax if needed - open issue.
- `importPick` and `injectPick` are only picking the TS type, but not the runtime object, the full object is
  injected for now.
- better syntax for re-exporting (you can see the current syntax in `example/src/infrastructure/infra.module.ts`).

**When it fits**:

- when you prefer a style of factory functions with explicit type declarations (examples below)
- modular "vertical slice" structure

## Installation

```bash
npm install iocta
```

## Full example

See the [example](./tree/main/example) for a complete example of server application using `iocta`.

## Module

All the components are optional, modules can have:

- `imports`: import from other modules;
- `internal`: services that are used withing the module, not exposed to others;
- `exports`: other modules can import it, and it is included in `runModules` result;
- `run`: a function that is called by `runModules`;
- `stop`: is called when you call `stop` returned by `runModules`.

```ts
export const authModule = defineModule({
  // A module can import functionality from other modules:
  imports: () => ({
    // `import` imports full services:
    ...userModule.import("userService", "userMiddleware"),
    // `importPick` imports dependencies granularly:
    ...infraModule.importPick({
      // app is the app router - needed for controller
      app: true, // true for importing the full object
      config: ["jwtSecret"], // providing explicit list of things we want to import from it
      db: true,
    }),
  }),
  // `internal` is for things that can only be injected within this module,
  // cannot be imported to other modules.
  internal: () => ({
    authService,
  }),
  // Exporting functionality other modules can use:
  exports: () => ({
    authMiddleware,
    // Re-exporting example:
    // `userService` is imported above and can be injected and exported here.
    userService: ({ userService } = authModule.inject("userService")) =>
      userService,
  }),
  // It is executed once all modules are resolved,
  // It's useful for controllers when they need to add routes to the app router.
  // Can be used for any custom logic that must run when the app starts.
  run: authController,
});
```

## Injectables

Injectables must be factory functions. It's basically a class, but a function.
`iocta` is designed so that all your services have to be factory functions.

Every injectable **requires** an explicit interface.
TypeScript cannot infer it because the function depends on the module recursively.
But this is a good practice anyway: you can see what functionality is provided by this service without looking at
the implementation.

```ts
// Explicit interface:
export interface AuthService {
  register(userData: CreateUserData): Promise<User>;
  login(email: string, password: string): Promise<User>;
  // ...
}

// Factory function:
export const authService = (
  // Injecting dependencies:
  // can only inject from the current module, cannot inject from others.
  // `inject` injects full services.
  deps = authModule.inject("config", "db"),
  // Alternatively, `injectPick` injects dependencies granularly:
  pickedDeps = authModule.injectPick({
    config: ["jwtSecret"],
    db: true, // true injects a full service
  }),
  // Explicit return type is required:
): AuthService => {
  const {
    config: { jwtSecret },
    db,
  } = deps;

  return {
    async register(userData) {
      // ...
    },
    async login(userData) {
      // ...
    },
  };
};
```

## Wiring and running modules

Use `runModules` to bundle all the modules, instantiate all dependencies.

It calls `run` on all modules in which it is present.

```ts
const {
  modules: {
    // Can extract any exported object:
    infraModule: { app },
  },
  stop, // call the stop function to call all modules' stop functions
} = runModules({
  // List all the modules:
  infraModule,
  authModule,
  // ...
});

app.listen(() => {
  /* ... */
});
```
