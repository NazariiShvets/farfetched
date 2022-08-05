# Server side rendering (SSR)

One of the most important and difficult to implement part of SSR is data-fetching. Farfetched aims to make it smooth and easy.

Farfetched is based on [Effector](https://effector.dev), that have an [excellent support of SSR](https://dev.to/effector/the-best-part-of-effector-4c27), so you can handle data-fetching easily if you follow some simple rules:

- **do not** start fetching in render-cycle (watch ["Goodbuy, useEffect" by David Khourshid](https://www.youtube.com/watch?v=HPoC-k7Rxwo))
- **do** use [Fork API in Effector](https://effector.dev/docs/api/effector/fork) and set up [babel-plugin](https://effector.dev/docs/api/effector/babel-plugin) for it
- **do** use [Effector](https://effector.dev) operators to express your control flow

That is it, just start your application on server and wait for all computation finished:

```ts
async function renderApp() {
  const scope = fork();

  await allSettled(appStarted, { scope });

  const html = renderUI(scope);

  return html;
}
```

## UI framework specific

### React

Stay tuned...

### Solid

Stay tuned...