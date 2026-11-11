// 斜爸（第四个，第 18 天 07:10）。照 ~/碰/斜爸/爸.py v2 一句一句搬；随机数换成 mulberry32（rnd.random / rnd.choice）。
var W = 9, H = 5, NIGHTS = 7, TURNS = 8;
var CRACKS = [[0, 4], [8, 4], [4, 0]], DOOR = [8, 1], START = [4, 2];
var COLS = "ABCDEFGHI";
var DIRS = { "上": [0, -1], "下": [0, 1], "左": [-1, 0], "右": [1, 0],
  "左上": [-1, -1], "右上": [1, -1], "左下": [-1, 1], "右下": [1, 1] };
var DIRNAMES = ["上", "下", "左", "右", "左上", "右上", "左下", "右下"];
var DIAG_AT = 2, STRAIGHT_GONE = 5, HIDE_AT = 8, ZIG_AT = 10;

function Rnd(seed) {
  var a = seed >>> 0;
  this.random = function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  this.choice = function (arr) { return arr[Math.floor(this.random() * arr.length)]; };
}

function inb(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }
function arrowOf(d) {
  var k = d[0] + "," + d[1];
  return { "0,-1": "↑", "0,1": "↓", "-1,0": "←", "1,0": "→", "-1,-1": "↖", "1,-1": "↗", "-1,1": "↙", "1,1": "↘", "0,0": "·" }[k];
}
function sees(r, f) {
  return (r.x === f[0] && Math.abs(r.y - f[1]) <= 3) || (r.y === f[1] && Math.abs(r.x - f[0]) <= 3);
}
function sgn(v, rnd) { return v ? (v > 0 ? 1 : -1) : rnd.choice([-1, 1]); }

function roachStep(st, rnd, r) {
  var f = st.inside ? st.pos : null;
  if (f && sees(r, f)) {
    var dx = sgn(r.x - f[0], rnd), dy = sgn(r.y - f[1], rnd);
    var tries = [[dx, dy], [dx, -dy], [-dx, dy]];
    for (var i = 0; i < tries.length; i++) {
      var nx = r.x + tries[i][0], ny = r.y + tries[i][1];
      if (inb(nx, ny) && !(nx === f[0] && ny === f[1])) {
        r.x = nx; r.y = ny; r.trail.push([tries[i][0], tries[i][1]]); return true;
      }
    }
    r.trail.push([0, 0]); return true;
  }
  var ddx = r.p ? 1 : -1, ddy = r.dy;
  if (!inb(r.x + ddx, r.y)) ddx = -ddx;
  if (!inb(r.x, r.y + ddy)) { ddy = -ddy; r.dy = ddy; }
  if (rnd.random() < 0.2) {
    ddy = -ddy; r.dy = ddy;
    if (!inb(r.x, r.y + ddy)) { ddy = -ddy; r.dy = ddy; }
  }
  var mx = r.x + ddx, my = r.y + ddy;
  if (f && mx === f[0] && my === f[1]) { r.trail.push([0, 0]); return false; }
  r.x = mx; r.y = my; r.p = !r.p; r.trail.push([ddx, ddy]);
  return false;
}

function boardText(st) {
  var grid = [];
  for (var y = 0; y < H; y++) { grid.push([]); for (var x = 0; x < W; x++) grid[y].push("．"); }
  CRACKS.forEach(function (c) { grid[c[1]][c[0]] = "缝"; });
  grid[DOOR[1]][DOOR[0]] = "门";
  var cnt = {};
  st.roaches.forEach(function (r) { var k = r.x + "," + r.y; cnt[k] = (cnt[k] || 0) + 1; });
  Object.keys(cnt).forEach(function (k) {
    var p = k.split(",").map(Number), c = cnt[k];
    grid[p[1]][p[0]] = c === 1 ? "蟑" : "０１２３４５６７８９"[Math.min(c, 9)];
  });
  if (st.inside) grid[st.pos[1]][st.pos[0]] = "爸";
  var out = ["　　" + COLS.split("").map(function (c) { return " " + c; }).join("")];
  for (var y2 = 0; y2 < H; y2++) out.push(" " + (y2 + 1) + "　" + grid[y2].join(""));
  return out.join("\n");
}

function can(st) {
  var s = st.s, moves = [];
  if (s < STRAIGHT_GONE) moves = moves.concat(["上", "下", "左", "右"]);
  if (s >= DIAG_AT) {
    if (s >= ZIG_AT && st.lastdx) {
      var want = -st.lastdx, f = st.pos;
      var z = DIRNAMES.filter(function (k) { var d = DIRS[k]; return d[0] === want && d[1] !== 0 && inb(f[0] + d[0], f[1] + d[1]); });
      moves = moves.concat(z.length ? z : ["左上", "右上", "左下", "右下"]);
    } else moves = moves.concat(["左上", "右上", "左下", "右下"]);
  }
  var stabs = ["上", "下", "左", "右"].concat(s >= DIAG_AT ? ["左上", "右上", "左下", "右下"] : []);
  return [moves, stabs];
}

function statusText(st) {
  if (st.over) return "";
  var s = ["第 " + st.night + " 夜，还有 " + (TURNS - st.t) + " 下。地上 " + st.roaches.length + " 只蟑螂。"];
  if (!st.inside) s.push("  你不在屋里。");   // 网页上图另画在上面（#board），这里只写字
  return s.join("\n");
}

function newNight(st, rnd) {
  st.night += 1; st.t = 0; st.inside = true; st.pos = START.slice(); st.mytrail = []; st.still = 0;
  var alive = st.roaches.length, n = alive + 2 + (alive >= 3 ? 1 : 0);
  st.roaches = [];
  for (var i = 0; i < n; i++) {
    var c = CRACKS[(i + st.night) % CRACKS.length];
    st.roaches.push({ x: c[0], y: c[1], p: rnd.random() < 0.5, dy: rnd.choice([-1, 1]), trail: [] });
  }
}

var MORNING_ME = ["", "我早上起来，爸爸坐在桌边喝茶。", "爸爸早上没吃饭。", "爸爸早上在看自己的手。",
  "爸爸早上不在桌边。阿黛拉说他在被窝里。"];

function morning(st) {
  var s = st.s, n = st.roaches.length, lines = ["—— 天亮了 ——"];
  if (st.killedTonight) lines.push("阿黛拉把你的标枪接过去，连上面的一起按进水桶，按了 " + st.killedTonight + " 回。");
  if (!st.wasIn) lines.push("妈妈跟阿黛拉说：他出去了，夜里不在家。");
  if (n >= 10) lines.push("阿黛拉说：缝里满了，夜里地上全是。");
  else if (n >= 5) lines.push("阿黛拉说：夜里越来越多。");
  else if (n) lines.push("回缝里去了 " + n + " 只。");
  else lines.push("一只都没回缝。");
  var k = 1;
  if (s >= DIAG_AT) k = 2;
  if (s >= STRAIGHT_GONE) k = 3;
  if (s >= HIDE_AT) k = 4;
  lines.push(MORNING_ME[k]);
  if (s >= STRAIGHT_GONE && !st.told5) { lines.push("你低头看手，指甲上起了一个黑点，硬的。"); st.told5 = true; }
  if (s >= ZIG_AT && !st.told10) { lines.push("夜里你发现自己往左斜了一步，下一步腿就往右斜。"); st.told10 = true; }
  return lines.join("\n");
}

function arrows(tr) { return tr.map(arrowOf).join(""); }

function endText(st) {
  var o = ["—— 七夜过去了 ——", "", "后来我问妈妈：架子上那只秃鹫，是不是他？", ""];
  var b = st.bestStill;
  if (b.n >= 3) o.push("我：他站着一动不动，第 " + b.night + " 夜在 " + COLS[b.x] + (b.y + 1) + " 站了 " + b.n + " 下，像架子上那只，一条腿，什么都不看。是他。");
  else if (b.n >= 1) o.push("我：他站过，第 " + b.night + " 夜在 " + COLS[b.x] + (b.y + 1) + " 站了 " + b.n + " 下，就又动了。不像架子上那只。");
  else o.push("我：……我想不起他站着不动的样子。他一夜都没停过。");
  o.push("阿黛拉：他是那个。你看他最后一夜在地上是怎么走的：");
  o.push("    他：　" + (st.lastMine.length ? arrows(st.lastMine) : "（不在屋里）"));
  o.push("    它们里的一只：" + (st.lastRoach.length ? arrows(st.lastRoach) : "（没有）"));
  if (st.diagMoves) o.push("  他斜着走了 " + st.diagMoves + " 步，扎了 " + st.s + " 下。");
  else o.push("  他一步都没斜着走过，扎了 " + st.s + " 下。");
  if (st.outNights.length) o.push("妈妈：别折磨我了。我跟你说过，他在外面跑推销，有时候夜里回来，天不亮又走。（第 " + st.outNights.join("、") + " 夜他从门出去了）");
  else { o.push("妈妈：别折磨我了。我跟你说过，他在外面跑推销。"); o.push("  她说这话的时候，没看我。七夜里他一夜都没出过门。"); }
  o.push("");
  o.push("  屋里还剩 " + st.roaches.length + " 只。扎中 " + st.kills + " 只。");
  var fs = st.firstStab || ["—", "—"], fd = st.firstDiag || ["—", "—"];
  o.push("  他第一次扎是第 " + fs[0] + " 夜第 " + fs[1] + " 下；第一次斜着走是第 " + fd[0] + " 夜第 " + fd[1] + " 下。");
  return o.join("\n");
}

function act(st, rnd, cmd, arg) {
  if (!st.inside) return "你不在屋里。";
  var c = can(st), moves = c[0], stabs = c[1], f = st.pos, msg = "";
  if (cmd === "扎") {
    if (stabs.indexOf(arg) < 0) return "这个方向扎不了。";
    var d = DIRS[arg], tx = f[0] + d[0], ty = f[1] + d[1];
    st.s += 1;
    if (!st.firstStab) st.firstStab = [st.night, st.t + 1];
    var hit = null;
    for (var i = 0; i < st.roaches.length; i++) if (st.roaches[i].x === tx && st.roaches[i].y === ty) { hit = i; break; }
    if (hit !== null) {
      st.deadTrail = st.roaches[hit].trail;
      st.roaches.splice(hit, 1); st.kills += 1; st.killedTonight += 1;
      msg = "你扎下去，标枪上穿着一只，腿还在动。";
    } else msg = "你扎下去，扎在地板上。";
    st.mytrail.push([0, 0]); st.still = 0;
    if (st.s === DIAG_AT) msg += "\n  你忽然会斜着过去了。";
    if (st.s === STRAIGHT_GONE) msg += "\n  你想直着走一步，腿往斜里拐。";
  } else if (cmd === "等") {
    st.mytrail.push([0, 0]); st.still += 1;
    if (st.still > st.bestStill.n) st.bestStill = { n: st.still, night: st.night, x: f[0], y: f[1] };
    msg = "你站着没动。";
  } else if (DIRS[cmd]) {
    if (moves.indexOf(cmd) < 0) return "这一步走不了。";
    var dd = DIRS[cmd], nx = f[0] + dd[0], ny = f[1] + dd[1];
    if (!inb(nx, ny)) return "那边是墙。";
    st.pos = [nx, ny]; st.mytrail.push([dd[0], dd[1]]); st.still = 0;
    if (dd[0] && dd[1]) {
      st.diagMoves += 1; st.lastdx = dd[0];
      if (!st.firstDiag) st.firstDiag = [st.night, st.t + 1];
    }
    if (nx === DOOR[0] && ny === DOOR[1]) {
      st.inside = false; st.wasIn = false; st.outNights.push(st.night); msg = "你从门出去了。";
    }
  } else return "不认得：" + cmd;
  var seen = 0;
  st.roaches.forEach(function (r) { if (roachStep(st, rnd, r)) seen += 1; });
  if (seen && st.inside) msg += "\n  " + seen + " 只看见了你，斜着跑开。";
  st.t += 1;
  return msg;
}

function advance(st, rnd) {
  var out = [];
  while (st.t >= TURNS || !st.inside) {
    if (!st.inside) {
      while (st.t < TURNS) { st.roaches.forEach(function (r) { roachStep(st, rnd, r); }); st.t += 1; }
    }
    if (st.night === NIGHTS) {
      st.lastMine = st.mytrail;
      st.lastRoach = st.roaches.length ? st.roaches[0].trail : (st.deadTrail || []);
      st.over = true;
      out.push(morning(st));
      return out.join("\n");
    }
    out.push(morning(st));
    st.killedTonight = 0; st.wasIn = true;
    newNight(st, rnd);
  }
  return out.join("\n");
}

function newGame(seed) {
  var rnd = new Rnd(seed);
  var st = { seed: seed, night: 0, t: 0, roaches: [], pos: START.slice(), s: 0, kills: 0, killedTonight: 0, inside: true,
    mytrail: [], still: 0, bestStill: { n: 0, night: 0, x: 0, y: 0 }, diagMoves: 0, outNights: [], firstStab: null,
    firstDiag: null, wasIn: true, over: false, lastdx: 0, lastMine: [], lastRoach: [] };
  newNight(st, rnd);
  st.rnd = rnd;
  return st;
}

function step(st, cmd, arg) {
  var msg = act(st, st.rnd, cmd, arg);
  if (msg.indexOf("这一步走不了") === 0 || msg.indexOf("这个方向扎不了") === 0 || msg === "那边是墙。" || msg.indexOf("不认得") === 0) return { text: msg, moved: false };
  var m2 = advance(st, st.rnd);
  if (m2) msg += "\n\n" + m2;
  if (st.over) msg += "\n\n" + endText(st);
  return { text: msg, moved: true };
}

if (typeof module !== "undefined") module.exports = { newGame: newGame, step: step, can: can, statusText: statusText, Rnd: Rnd, DIRS: DIRS, DOOR: DOOR, inb: inb };
