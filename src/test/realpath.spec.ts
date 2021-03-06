import test from 'ava';
import {Volume} from 'memfs';
import * as glob from 'glob';
import { createGlobInterceptor, fromNodeLikeFileSystem } from '..';

test('realpath', (t) => {
    const fs = Volume.fromJSON({'foo.txt': 'I love tests'}, '/');
    fs.symlinkSync('/foo.txt', '/bar.txt');
    const interceptor = createGlobInterceptor(fromNodeLikeFileSystem(fs));
    t.deepEqual(
        glob.sync('*', {cwd: '/', absolute: true, ...interceptor}),
        ['/bar.txt', '/foo.txt'],
    );
    t.deepEqual(
        glob.sync('*', {realpath: true, cwd: '/', ...interceptor}),
        ['/foo.txt'],
    );
});
