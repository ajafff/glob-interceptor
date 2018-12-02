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

export interface NodeLikeFileSystem {
    statSync(path: string): { isDirectory(): boolean; };
    lstatSync(path: string): { isSymbolicLink(): boolean; isDirectory(): boolean; };
    readdirSync(dir: string): Array<string | Uint8Array | {name: string | Uint8Array}>;
    realpathSync(path: string): string | Uint8Array;
}

export function fromNodeLikeFileSystem(fs: NodeLikeFileSystem): GlobFileSystem {
    return {
        isDirectory(path) {
            let stats;
            try {
                stats = fs.lstatSync(path);
            } catch {
                return;
            }
            if (stats.isSymbolicLink()) {
                try {
                    stats = fs.statSync(path);
                } catch {}
            }
            return stats.isDirectory();
        },
        isSymbolicLink(path) {
            try {
                return fs.lstatSync(path).isSymbolicLink();
            } catch {
                return false;
            }
        },
        readDirectory(dir) {
            const dirents = fs.readdirSync(dir);
            if (dirents.length === 0)
                return [];
            const first = dirents[0];
            return typeof first === 'string'
                ? <string[]>dirents
                : 'name' in first
                    ? (<Array<{name: string | Uint8Array}>>dirents).map((dirent) => String(dirent.name))
                    : dirents.map(String);
        },
        realpath(path) {
            return String(fs.realpathSync(path));
        },
    };
}

export function memoizeFileSystem(fs: GlobFileSystem): GlobFileSystem {
    const isDirectoryCache = new Map<string, boolean | undefined>();
    const isSymbolicLinkCache = new Map<string, boolean>();
    const readDirectoryCache = new Map<string, string[]>();
    const realpathCache = new Map<string, string>();

    return {
        isDirectory(path) {
            let result = isDirectoryCache.get(path);
            if (result === undefined && !isDirectoryCache.has(path)) {
                result = fs.isDirectory(path);
                isDirectoryCache.set(path, result);
            }
            return result;
        },
        isSymbolicLink(path) {
            let result = isSymbolicLinkCache.get(path);
            if (result === undefined) {
                result = fs.isSymbolicLink(path);
                isSymbolicLinkCache.set(path, result);
            }
            return result;
        },
        readDirectory(dir) {
            let result = readDirectoryCache.get(dir);
            if (result === undefined) {
                result = fs.readDirectory(dir);
                readDirectoryCache.set(dir, result);
            }
            return result;
        },
        realpath(path) {
            let result = realpathCache.get(path);
            if (result === undefined) {
                result = fs.realpath(path);
                realpathCache.set(path, result);
            }
            return result;
        },
    };
}

const directoryStats = {
    isDirectory() { return true; },
};
const otherStats = {
    isDirectory() { return false; },
};

const propertyDescriptor = { writable: true, configurable: true };

class FallbackToOldRealpathError extends Error {
    public syscall = 'realpath';
    public code = 'ENOMEM';
}

export function createGlobInterceptor(fs: GlobFileSystem) {
    const cache = new Proxy<Record<string, false | 'FILE' | string[]>>({}, {
        getOwnPropertyDescriptor() {
            return propertyDescriptor;
        },
        get(_, path: string) {
            switch (fs.isDirectory(path)) {
                case true:
                    return fs.readDirectory(path);
                case false:
                    return 'FILE';
                default:
                    return false;
            }
        },
        set() {
            // ignore cache write
            return true;
        },
    });
    const statCache = new Proxy<Record<string, { isDirectory(): boolean; } | false>>({}, {
        get(_, path: string) {
            switch (fs.isDirectory(path)) {
                case true:
                    return directoryStats;
                case false:
                    return otherStats;
                default:
                    return false;
            }

        },
        set() {
            // ignore cache write
            return true;
        },
    });
    const realpathCache = new Proxy<Record<string, string>>({}, {
        getOwnPropertyDescriptor() {
            return propertyDescriptor;
        },
        get(_, path) {
            // enforce the use of the old realpath algorithm by throwing an error here
            // 'fs.realpath' will think this is an error caused by the newer implementation of `realpathSync`
            // and falls back to the old impl.
            // fortunately 'glob' only passes absolute paths to 'realpath',
            // therefore we can easily detect uses from Node's realpath implementation
            if (typeof path !== 'string' || !/[/\\]/.test(path))
                throw new FallbackToOldRealpathError();
            return fs.realpath(path);
        },
    });
    const symlinks = new Proxy<Record<string, boolean>>({}, {
        getOwnPropertyDescriptor() {
            return propertyDescriptor;
        },
        get(_, path: string) {
            return fs.isSymbolicLink(path);
        },
    });
    return {
        cache,
        realpathCache,
        statCache,
        symlinks,
    };
}
