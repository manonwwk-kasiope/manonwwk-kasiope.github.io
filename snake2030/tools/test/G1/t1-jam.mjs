// G1 test 1 — brouilleur + traqueur collés à la tête (bureau 1440×900 et iPhone 13 paysage), tailLaser 0 puis 2.
import { run } from '../jam.mjs';
import { finish, deadline } from '../lib.mjs';
deadline(420, 1);
finish(1, await run());
