# Plugin market index

`index.json` is a [format-1 DSH plugin market index](https://github.com/deepseek-ai/deepseek-harness) that points at this repository.

It is generated, not hand-written:

```sh
node market/make-index.mjs <owner> <repo>
```

Regenerate it **after** each release commit so `source.commit` pins the exact published tree instead of a moving branch. Users add this index under **Plugins → Discover → Index sources**, or install the plugin directly with its Git install target.
