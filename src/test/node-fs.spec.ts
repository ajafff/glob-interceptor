import { test } from 'ava';
import { convertNodeLikeFileSystem, createGlobInterceptor, memoizeFileSystem } from '..';
import * as fs from 'fs';
import * as glob from 'glob';

test('convertNodeLikeFileSystem', (t) => {
    t.deepEqual(
        glob.sync('**', <any>{cwd: 'fixtures', nodir: true, ...createGlobInterceptor(convertNodeLikeFileSystem(fs))}),
        [
            'a/a.txt',
            'a/b/b.txt',
            'a/b/x/x.txt',
            'a/d/d.txt',
        ],
    );
});

test('memoize returns consistent results', (t) => {
    const interceptor = createGlobInterceptor(memoizeFileSystem(convertNodeLikeFileSystem(fs)));
    const expected = [
        'a/a.txt',
        'a/b/b.txt',
        'a/b/x/x.txt',
        'a/d/d.txt',
    ];
    t.deepEqual(
        glob.sync('**', <any>{cwd: 'fixtures', nodir: true, ...interceptor}),
        expected,
    );
    t.deepEqual(
        glob.sync('**', <any>{cwd: 'fixtures', nodir: true, ...interceptor}),
        expected,
    );

    t.deepEqual(
        glob.sync('**', <any>{cwd: 'fixtures', nodir: true, dot: true, ...interceptor}),
        [
            'a/a.txt',
            'a/b/b.txt',
            'a/b/x/x.txt',
            'a/c/.gitkeep',
            'a/d/d.txt',
        ],
    );
});
