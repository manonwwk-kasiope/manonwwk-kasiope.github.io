// G1 test 3 — partie « dieu » de 10 min bureau 1440×900, niveaux 1→6 : 0 pageerror, __ERR.count === 0.
import { run } from '../god10.mjs';
import { finish, deadline } from '../lib.mjs';
deadline(600 + 150, 3);
finish(3, await run());
