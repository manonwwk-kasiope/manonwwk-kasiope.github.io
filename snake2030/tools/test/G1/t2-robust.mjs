// G1 test 2 — ennemi dont update lève à chaque image : quarantaine de frame() (bureau 1440×900).
import { run } from '../rp-robust2.mjs';
import { finish, deadline } from '../lib.mjs';
deadline(150, 2);
finish(2, await run());
