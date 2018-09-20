import test from 'ava';
import {Volume} from 'memfs';
import * as glob from 'glob';
import { createGlobInterceptor, fromNodeLikeFileSystem } from '..';

test('non-existent cwd', (t) => {
    const fs = Volume.fromJSON({}, '/');
    t.deepEqual(
        glob.sync('**', {cwd: '/foo', ...createGlobInterceptor(fromNodeLikeFileSystem(fs))}),
        [],
    );
});
