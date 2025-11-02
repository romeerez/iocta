## e-commerce API example

This example is adapted from [Moro-JS/examples](https://github.com/Moro-JS/examples/tree/main) by M-Chris, licensed under the MIT License.

It features product catalog, shopping cart, payment processing with Stripe, and order management.

## How the iocta library is used

There are many modules in `src/modules`, let's consider the order module file:

```ts
export const orderModule = defineModule({
  imports: () => ({
    ...infraModule.import("app", "db"),
    ...authModule.importPick({ authMiddleware: ["authenticate"] }),
    ...cartModule.importPick({
      cartService: ["getCart", "validateCartInventory", "clearCart"],
    }),
    ...paymentModule.importPick({ paymentService: ["processPayment"] }),
  }),
  internal: () => ({
    orderService,
  }),
  run: orderController,
});
```

This file allows us to see that this module requires `app` and `db` from infrastructure,
it uses authentication, and depends on certain functionality of the cart service and payment service.

`orderService` is internal to the order module: other modules cannot import it in the iocta library way.

`run` is used here to let the controller add new routes to the app router.

In `src/infrastructure` you can see there are `infra.module.ts`, `config.module`, `db.module`:
generally, there is no need to have a module per file, so initially all infrastructure-related files were included
in a single `infra` module. But then `config` was needed for the script that migrates the database, and `db` was
needed for seeds, so it made sense for them to have their own modules, so the db script didn't had to load the whole
infrastructure.

All modules are wired in the `src/server`:

```ts
const {
  modules: {
    infraModule: { app },
  },
} = runModules({
  infraModule,
  authModule,
  cartModule,
  orderModule,
  paymentModule,
  productModule,
});

app.listen(() => {
  // ...
});
```

As you can see, the main `server` file is minimalistic, because every module takes care of itself, rather than
everything being bootstrapped in the main file. `app.listen` could be moved to the `run` callback of infrastructure,
but it is easier to find it when it's in the main file.

## To run this example locally

Install dependencies, enter Postgres database URL to the .env file, create, migrate, seed the database:

```sh
cd example
pnpm i
cp .env.example .env
vim .env # edit db credentials
pnpm db create # create database if it's local postgres
pnpm db up # run migrations
pnpm db seed # apply seeds
```

Start the dev server:

```sh
pnpm dev
```

Refer to the [original readme](https://github.com/Moro-JS/examples/tree/main) for querying http endpoints.
