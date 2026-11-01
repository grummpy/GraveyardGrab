// Lets `node --test tests/` run every suite. This Node build executes a
// directory argument as a module instead of walking it, so the directory
// entry re-exports the real test files.
import "./arcade.test.js";
import "./elimination.test.js";
import "./inputmap.test.js";
import "./maze.test.js";
import "./movement.test.js";
import "./powerups.test.js";
import "./rng.test.js";
import "./scoring.test.js";
