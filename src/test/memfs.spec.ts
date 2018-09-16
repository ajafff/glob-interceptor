import test from 'ava';
import {Volume} from 'memfs';
import * as glob from 'glob';
import { createGlobInterceptor, convertNodeLikeFileSystem } from '..';

test('memfs', (t) => {
    const content = 'i love tests';
    const json = {
        'a/b/x/x.txt': content,
        'a/b/b.txt': content,
        'a/c/.gitkeep': content,
        'a/d/d.txt': content,
        'a/a.txt': content,
    };
    const expected = [
        'a/a.txt',
        'a/b/b.txt',
        'a/b/x/x.txt',
        'a/d/d.txt',
    ];
    let fs = Volume.fromJSON(json, process.cwd());
    t.deepEqual(
        glob.sync('**', <any>{nodir: true, ...createGlobInterceptor(convertNodeLikeFileSystem(fs))}),
        expected,
    );

    fs = Volume.fromJSON(json, '/foobar');
    t.deepEqual(
        glob.sync('**', <any>{cwd: '/foobar', nodir: true, ...createGlobInterceptor(convertNodeLikeFileSystem(fs))}),
        expected,
    );
});
