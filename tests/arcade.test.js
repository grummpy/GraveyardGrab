import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PORT } from "../src/core/constants.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("arcade.json matches the manifest and points at real files", () => {
  const arcade = JSON.parse(fs.readFileSync(path.join(root, "arcade.json"), "utf8"));
  assert.equal(arcade.name, "Graveyard Grab");
  assert.equal(arcade.id, "graveyardgrab");
  assert.equal(arcade.icon, "assets/icon.jpg");
  assert.equal(arcade.cover, "assets/cover.jpg");
  assert.deepEqual(arcade.launch, {
    mac: "./launch-mac.command",
    windows: "launch-windows.bat",
    linux: "./launch-linux.sh",
    web: "index.html",
  });
  assert.equal(arcade.players, 4);
  assert.equal(arcade.port, 8808);
  assert.equal(arcade.port, PORT);
  assert.equal(arcade.minPlayers, 1);
  assert.deepEqual(arcade.input, ["keyboard", "gamepad"]);
  assert.equal(arcade.version, "1.0.0");

  for (const rel of [arcade.icon, arcade.cover, arcade.launch.mac, arcade.launch.windows, arcade.launch.linux, arcade.launch.web]) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
  }

  const server = fs.readFileSync(path.join(root, "server.py"), "utf8");
  assert.match(server, /arcade\.json/);
  assert.match(server, /127\.0\.0\.1/);

  for (const launcher of ["launch-mac.command", "launch-linux.sh", "launch-windows.bat"]) {
    const text = fs.readFileSync(path.join(root, launcher), "utf8");
    assert.match(text, /server\.py/);
    assert.match(text, /Python 3/);
  }

  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<canvas/);
  assert.match(html, /src\/main\.js/);
  assert.equal(/https?:\/\//.test(html), false);
});

test("core modules stay free of DOM and canvas", () => {
  const dir = path.join(root, "src", "core");
  for (const name of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    assert.equal(/\b(document|window|localStorage|HTMLCanvasElement|navigator)\b/.test(text), false, name);
  }
});
