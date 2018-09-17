# glob-interceptor
Bring your own file system for globbing by proxying the cache

## Usage

This library uses some implementation detail of the `glob` package by adding Proxies to specific cache options.
Since the cache is always checked before executing a certain file system operation, this package completely bypasses the underlying `fs` module.

By its very nature a cache is synchronous. Therefore all proxied file system operations need to return synchronously.
That's why this package only makes sense for `glob.sync`. It also works for the async counterpart, but since file system access is sync behind the scenes, this is rather useless.

### Creating an interceptor

You can create an interceptor by calling `createGlobInterceptor(fs)` and providing an object that implements the following interface for file system access:

```ts
/** A minimal abstraction of FileSystem operations needed to provide a cache proxy for 'glob'. None of the methods are expected to throw. */
export interface GlobFileSystem {
    /** Returns `true` if the specified `path` is a directory, `undefined` if it doesn't exist and `false` otherwise. */
    isDirectory(path: string): boolean | undefined;
    /** Returns `true` if the specified `path` is a symlink, `false` in all other cases. */
    isSymbolicLink(path: string): boolean;
    /** Get the entries of a directory as string array. Will only be called on paths where `isDirectory` returns `true`*/
    readDirectory(dir: string): string[];
    /** Get the realpath of a given `path` by resolving all symlinks in the path. */
    realpath(path: string): string;
}
```

For convenience there is a utility function `fromNodeLikeFileSystem`, that returns an instance of `GlobFileSystem` for a given file system compatible with Node's `fs` module.

```ts
import {Volume} from "memfs";
import {fromNodeLikeFileSystem, createGlobInterceptor} from "glob-interceptor";

const interceptor = createGlobInterceptor(fromNodeLikeFileSystem(Volume.fromJSON({/* your in-memory files go here*/})));
```

### Using the interceptor

With the previously created `interceptor` you can now invoke `glob.sync` to intercept all file system interaction:

```ts
let result = glob.sync('**' /* any pattern you want */, {nodir: true /* any options you like */, ...interceptor});
// or if you are targeting a runtime without object spread, you can use `Object.assign` instead
result = glob.sync('**' /* any pattern you want */, Object.assign({nodir: true /* any options you like */}, interceptor));
```

You can reuse an interceptor as often as you want or need.

Note that `interceptor` contains the following properties: `cache`, `statCache`, `realpathCache`, `symlinks`.
If you add one of these properties to your options object, they will be overridden by the ones from `interceptor`.
If you explicitly override any of these properties with your own, the interceptor will not work as expected.

### Caching

Unless your implementation of `GlobFileSystem` does some caching, it will always
execute the underlying binding. There's a utility function `memoizeFileSystem` to add caching to your `GlobFileSystem`:

```ts
import {fromNodeLikeFileSystem, createGlobInterceptor, memoizeFileSystem} from "glob-interceptor";
import fs from "fs";

const interceptor = createGlobInterceptor(memoizeFileSystem(fromNodeLikeFileSystem(fs)));
```

## License

MIT © [Klaus Meinhardt](https://github.com/ajafff)