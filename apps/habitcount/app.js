g.clear();
//variables
let data,
  backup = {};
//
// time: average time of day, when habits gets done. In milliseconds
// date: beginning of day when last done (midnight, 00:00) in milliseconds.
// OccurrencePerInt is only important if type is "perInterval". Like "take a walk 2 times" within "7 days"
let /*interval*/ increment = { name: "days", rate: 1, ratePerInterval: 1 };
let num = 0;
const day = 86400000;
let font = "Vector:18";
let settings = false;
let dataLength, screen, screenC, editing, dateTodayMs, dateYesterdayMs;
let timeoutBackup, timeoutBtn, memoryClean, dayOfWeek, dayOfMonth;
let category = {
  pending_every: [],
  weekly_perInt: [],
  monthly_perInt: [],
  lost: [],
  done: [],
};
let defaultStruc = {
  //habit: "..."
  interval: 0, // 0 = every day
  intType: "every",
  OccurrencePerInt: 1,
  OccurrenceLeft: 0,
  streak: 0,
  streakPreviousMax: 0,
  date: 0,
  time: day,
  //rank:[]
};
let c = Bangle.appRect;
// c gives back:
//x  & y   = 0
//x2 & y2  = 175
//w  & h   = 176
let y50p = c.h / 2;
let x50p = c.w / 2;
let location = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

// Layout
let I = require("Layout");
let L = new I(
  {
    type: "v",
    id: "main",
    c: [
      {
        type: "h",
        id: "top",
        c: [
          {
            type: "txt",
            font: font,
            id: "topLeft",
            fillx: 1,
            filly: 1,
            label: "",
            bgCol: "#fff",
            col: "#000",
            wrap: true,
          },
          {
            type: "txt",
            font: font,
            id: "topRight",
            fillx: 1,
            filly: 1,
            label: "",
            bgCol: "#fff",
            col: "#000",
            wrap: true,
          },
        ],
      },

      {
        type: "h",
        id: "bottom",
        c: [
          {
            type: "txt",
            font: font,
            id: "bottomLeft",
            fillx: 1,
            filly: 1,
            label: "",
            bgCol: "#fff",
            col: "#000",
            wrap: true,
          },
          {
            type: "txt",
            font: font,
            id: "bottomRight",
            fillx: 1,
            filly: 1,
            label: "",
            bgCol: "#fff",
            col: "#000",
            wrap: true,
          },
        ],
      },
    ],
  },
  { lazy: false },
);
L.update();

let file = {
  write: function () {
    // this halfs the number of habit u can do till RAM reaches its Hardware Limit. But i do not know a better solution
    data = [].concat.apply([], Object.values(category)); //https://stackoverflow.com/questions/54351817/what-exactly-is-concat-apply-doing-to-flatten-an-array
    category = {
      pending_every: [],
      weekly_perInt: [],
      monthly_perInt: [],
      lost: [],
      done: [],
    };

    require("Storage").writeJSON("habit.json", data);
    require("Storage").writeJSON("habitBackup.json", backup);

    this.read();
  },
  read: function () {
    data = {};
    memoryClean = process.memory().usage;

    backup = require("Storage").readJSON("habitBackup.json") || {};
    data = require("Storage").readJSON("habit.json") || {};
    data = Object.values(data); // transforms it to array
    dataLength = data.length;
    splitData();
  },
};

let Interface = {
  render: function () {
    L.render();
    g.setColor("#000"); // if this is not set, the lines sometimes become white, because of the Layout render, do not ask me why
    g.drawLine(x50p, 0, x50p, c.h);
    g.drawLine(0, y50p, c.w, y50p);
  },
  setUI: function () {
    Bangle.setUI({
      mode: "custom",
      touch: function (n, e) {
        console.log(e);
        console.log(`screen: ${screen}`);
        let i = (e.x < x50p ? 0 : 1) + (e.y < y50p ? 0 : 2);
        //top Left    = 0
        //top Right   = 1
        //bottomLeft  = 2
        //bottomRight = 3
        if (e.type == 2 || settings) {
          settings = true;
          touchSettings(num + i);
        } else touchHomescreen(num + i);
      },
      btn: function (n) {
        btn();
      },
    });
  },
  resetFont: function () {
    L.topLeft.font = font;
    L.topRight.font = font;
    L.bottomLeft.font = font;
    L.bottomRight.font = font;
  },
  resetColour: function () {
    for (let i = 0; i < 4; i++) {
      L[location[i]].bgCol = "#fff";
      L[location[i]].col = "#000";
    }
  },
};

function getDate() {
  const date = new Date();
  const dateNowMs = date.getTime();
  date.setHours(0, 0, 0, 0);

  dateTodayMs = date.getTime();
  dateYesterdayMs = dateTodayMs - day;
  dayOfWeek = (date.getDay() + 6) % 7;
  dayOfMonth = date.getDate();
  defaultStruc.date = dateYesterdayMs;

  return dateNowMs - dateTodayMs;
}
function setWeek(n) {
  // if n is 1, retruns monday 0:00 am next week in ms.
  let d = new Date(dateTodayMs);
  let sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday + 7 * n);
  return d.getTime();
}
function setMonth(n) {
  // if n is 1 returns, the date of the 1st next month 0:00 am ind ms
  let d = new Date(dateTodayMs);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

function splitData() {
  syncBackup();
  let h;
  while ((h = data.pop())) category[sortCategory(h)].push(h);
  data = undefined;
  sortTime();

  // pull in logic week
  let w = Math.min(
    3,
    7 - category.pending_every.length,
    category.weekly_perInt.length,
  );
  while (w-- > 0) {
    let found = -1;
    for (let i = 0; i < category.weekly_perInt.length; i++) {
      let cw = category.weekly_perInt[i];
      let l = cw.OccurrencePerInt - cw.OccurrenceLeft;
      let diff = Math.abs(cw.rank[l] - dayOfWeek);
      if (Math.min(diff, 7 - diff) <= 1) {
        found = i;
        break;
      }
    }
    if (found < 0) break; // no more matches, stop early
    category.pending_every.push(category.weekly_perInt.splice(found, 1)[0]);
  }
  // pull in logic month
  let m = Math.min(
    2,
    7 - category.pending_every.length,
    category.monthly_perInt.length,
  );
  while (m-- > 0) {
    let found = -1;
    for (let i = 0; i < category.monthly_perInt.length; i++) {
      let cw = category.monthly_perInt[i];
      let l = cw.OccurrencePerInt - cw.OccurrenceLeft;
      let diff = Math.abs(cw.rank[l] - dayOfWeek);
      if (cw.time != day && diff <= 7) {
        found = i;
        break;
      }
    }
    if (found < 0) break; // no more matches, stop early
    category.pending_every.push(category.monthly_perInt.splice(found, 1)[0]);
  }
}
function sortCategory(h) {
  if (h.intType == "every") {
    if (h.date >= dateTodayMs) {
      // every done
      return "done";
    } else if (
      h.date == dateYesterdayMs ||
      h.date >=
        dateYesterdayMs - Math.max(1, Math.round(h.interval * 0.3)) * day
    ) {
      // every pending
      return "pending_every";
    } else {
      // every lost
      return "lost";
    }
  } else if (h.intType == "perInterval") {
    if (h.OccurrenceLeft == 0 && h.date > dateTodayMs) {
      return "done";
    } else if (h.OccurrenceLeft == 0 && h.date <= dateTodayMs) {
      // set habit pending again
      if (h.interval % 7 == 0) {
        h.date = setWeek(h.interval / 7);
      } else if (h.interval % 30 == 0) {
        h.date = setMonth(h.interval / 30);
      } else {
        console.log("error sortCategory");
      }
      h.OccurrenceLeft = h.OccurrencePerInt;
      h.streak++;
      if (h.interval == 7) return "weekly_perInt";
      else return "monthly_perInt";
    } else if (h.OccurrenceLeft >= 0 && h.date > dateTodayMs) {
      if (h.interval == 7) return "weekly_perInt";
      else return "monthly_perInt";
    } else {
      return "lost";
    }
  }
}
function sortTime() {
  let timeMs = getDate();

  function standard(a, b) {
    return Math.abs(a.time - timeMs) - Math.abs(b.time - timeMs);
  }

  let sorters = {
    // insert special sort functions if u want, the key of the list in category and the key of the sort func must match

    weekly_perInt: function (a, b) {
      let ai = a.OccurrencePerInt - a.OccurrenceLeft;
      let bi = b.OccurrencePerInt - b.OccurrenceLeft;

      if (
        a.rank[ai] != undefined &&
        b.rank[bi] != undefined &&
        a.rank[ai] != b.rank[bi]
      )
        return (
          Math.abs(a.rank[ai] - dayOfWeek) - Math.abs(b.rank[bi] - dayOfWeek)
        );
      return Math.abs(a.time - timeMs) - Math.abs(b.time - timeMs);
    },
    monthly_perInt: function (a, b) {
      let ai = a.OccurrencePerInt - a.OccurrenceLeft;
      let bi = b.OccurrencePerInt - b.OccurrenceLeft;
      let aRank = Math.round(a.rank[ai]);
      let bRank = Math.round(b.rank[bi]);

      if (aRank != undefined && bRank != undefined && aRank != bRank)
        return Math.abs(aRank - dayOfMonth) - Math.abs(bRank - dayOfMonth);
      return Math.abs(a.time - timeMs) - Math.abs(b.time - timeMs);
    },
  };
  Object.keys(category).forEach(function (k) {
    category[k].sort(sorters[k] || standard);
  });
}
function syncBackup() {
  // delete backup of habits that dont exist anymore, may they rest in peace
  let habitNames = data.map(function (h) {
    return h.name;
  });
  Object.keys(backup).forEach(function (n) {
    if (habitNames.indexOf(n) < 0) delete backup[n];
  });
}

function touchHomescreen(h) {
  //   console.log("used " + process.memory().usage);
  // console.log("free " + process.memory().free);
  if (screen == "folders") {
    let touchBtnNum = h - num; // 0 topLeft, 1 topRight, 2 bottomLeft, 3 bottomRight
    let c = ["weekly_perInt", "monthly_perInt", "lost", "done"];
    if (screenC != c[touchBtnNum]) window.mp(c[touchBtnNum]);
    else window.mp("pending_every");
    return;
  }
  let d = category[screenC][h];
  if (!d) return;

  // time logic
  let weight = 0.02; // how much influence the new time has on the average. 0.1 are 10% new and 90% old.
  let time =
    d.time == day // if time is new (midnight), use the actual time. So it doesnt include midnight in the average
      ? getDate()
      : getDate() /*newTime*/ * weight + (1 - weight) * d.time; /*oldTime*/

  // average weekday or date logic
  let rank;
  let i = d.OccurrencePerInt - d.OccurrenceLeft;
  if (d.rank.length >= d.OccurrencePerInt)
    // if settings change, adapts array
    d.rank.splice(
      d.OccurrencePerInt - d.rank.length,
      d.rank.length - d.OccurrencePerInt,
    );
  if (d.intType == "perInterval") {
    if (!(d.OccurrenceLeft <= 0)) {
      if (d.interval < 30) {
        let weightW = 0.125;
        rank =
          d.rank[i] == undefined
            ? dayOfWeek
            : dayOfWeek * weightW + (1 - weightW) * d.rank[i];
      } else {
        let weightM = 0.166;
        rank =
          d.rank[i] == undefined
            ? dayOfMonth
            : dayOfMonth * weightM + (1 - weightM) * d.rank[i];
      }
    }
  } else rank = [];

  // habit, what to change when touched logic
  if (d.intType == "every") {
    switch (true) {
      case d.date >= dateTodayMs: // habit done
        // backup logic
        if (backup[d.name]) {
          let old = backup[d.name];
          backup[d.name] = Object.assign({}, d);
          category[screenC][h] = old;
        }
        break;
      case d.date >=
        dateYesterdayMs - Math.max(1, Math.round(d.interval * 0.3)) * day: // pending
        //
        backup[d.name] = Object.assign({}, d);
        d.streak++;
        d.date = dateTodayMs + d.interval * day;
        d.time = time;
        break;
      default: // habit lost
        //
        backup[d.name] = Object.assign({}, d);
        if (d.streak > d.streakPreviousMax) d.streakPreviousMax = d.streak;
        d.streak = 1;
        d.date = dateTodayMs + d.interval * day;
        d.time = time;
        break;
    }
  } else if (d.intType == "perInterval") {
    switch (true) {
      case d == editing:
      case d.OccurrenceLeft == 0:
        // backup logic
        if (backup[d.name]) {
          let old = backup[d.name];
          backup[d.name] = Object.assign({}, d);
          category[screenC][h] = old;
        } else {
          E.showMessage("no backup");
        }
        editing = undefined;
        if (timeoutBackup) clearTimeout(timeoutBackup);
        break;
      case d.date <= dateTodayMs: // habit lost
        backup[d.name] = Object.assign({}, d);
        // set habit pending again
        if (d.interval % 7 == 0) {
          d.date = setWeek(d.interval / 7);
        } else if (d.interval % 30 == 0) {
          d.date = setMonth(d.interval / 30);
        } else {
          d.date = dateTodayMs + d.interval * day;
        }
        d.OccurrenceLeft = d.OccurrencePerInt;
        if (d.streakPreviousMax < d.streak) d.streakPreviousMax = d.streak;
        d.streak = 0;
        d.time = time;

        break;
      default:
        // if u search for, how per Interval gets set pending again => sortCategor
        editing = d;
        timeoutBackup = setTimeout(function () {
          backup[d.name] = Object.assign({}, d);
          d.OccurrenceLeft--;
          d.time = time;
          if (i < d.OccurrencePerInt) d.rank[i] = rank;
          update();
        }, 500);
        return;
    }
  }
  update();
}
function touchSettings(habit) {
  console.log(`sC: ${screenC}, s: ${screen}`);
  if (screen == "folders") {
    settings = false;
    return;
  }
  let touchBtnNum = habit - num; // 0 topLeft, 1 topRight, 2 bottomLeft, 3 bottomRight
  if (settings == true) {
    switch (screen) {
      case "menu":
        switch (touchBtnNum) {
          case 0: // change Name
            g.clear();
            let name = category[screenC][editing].name
              ? category[screenC][editing].name
              : "";
            // keyboard input snippet
            require("textinput")
              .input({ text: name })
              .then((result) => {
                category[screenC][editing].name = result;
                L.forgetLazyState();
                Interface.setUI();
                window.menu();
              });
            break;
          case 1: // delete Habit
            E.showPrompt("delete habit?").then(function (v) {
              if (v) {
                category[screenC].splice(editing, 1); // removes it and shifts the rest down
                file.write();
                L.forgetLazyState();
                window.mp(screenC);
              } else {
                Interface.setUI();
                L.forgetLazyState();
                window.menu();
              }
            });
            break;
          case 2: // interval type
            window.intervalType();

            break;
          case 3: // change interval
            window.interval();
            break;
        }
        break;
      case "interval":
        switch (touchBtnNum) {
          case 3: // +
            if (
              category[screenC][editing].intType == "every" ||
              (category[screenC][editing].intType == "perInterval" &&
                increment.name != "days")
            ) {
              // if intType "perInterval" and increment days, falltrough
              category[screenC][editing].interval += 1 * increment.rate;
              break;
            }
          case 0: // add
            switch (increment.name) {
              case "days":
                increment.name = "weeks";
                increment.rate = 7;
                break;
              case "weeks":
                increment.name = "months";
                increment.rate = 30;
                if (category[screenC][editing].intType == "perInterval")
                  category[screenC][editing].interval = 30;

                break;
              case "months":
                if (category[screenC][editing].intType == "perInterval") {
                  increment.name = "weeks";
                  increment.rate = 7;
                  category[screenC][editing].interval = 7;
                } else {
                  increment.name = "days";
                  increment.rate = 1;
                }
                break;
            }
            break;
          case 2: // -
            if (category[screenC][editing].interval - 1 * increment.rate <= 0)
              category[screenC][editing].interval =
                category[screenC][editing].intType == "every"
                  ? 0
                  : increment.name == "weeks"
                    ? 7
                    : 30;
            else category[screenC][editing].interval -= 1 * increment.rate;
            break;
        }
        L.topLeft.label = "increment:\n" + increment.name;
        L.topRight.label = category[screenC][editing].interval;
        Interface.render();
        break;
      case "intervalType":
        switch (touchBtnNum) {
          case 0: // intentional fall through
          case 1:
            category[screenC][editing].intType = "every";
            category[screenC][editing].date = dateYesterdayMs;
            window.intervalType();
            break;
          case 2:
            Interface.resetColour();

            window.intervalTypeCounter();
            break;
          case 3:
            category[screenC][editing].intType = "perInterval";
            category[screenC][editing].date = dateTodayMs;
            category[screenC][editing].interval = 7;
            window.intervalType();
            break;
        }
        break;
      case "intervalTypeCounter":
        switch (touchBtnNum) {
          case 0: // increment
            switch (increment.ratePerInterval) {
              case 1:
                increment.ratePerInterval = 5;
                break;
              case 5:
                increment.ratePerInterval = 10;
                break;
              case 10:
                increment.ratePerInterval = 1;
                break;
            }
            break;
          case 3: // +
            category[screenC][editing].OccurrencePerInt +=
              1 * increment.ratePerInterval;
            break;
          case 2: // -
            if (
              category[screenC][editing].OccurrencePerInt -
                1 * increment.ratePerInterval <
              1
            )
              category[screenC][editing].OccurrencePerInt = 1;
            else
              category[screenC][editing].OccurrencePerInt -=
                1 * increment.ratePerInterval;
            break;
        }

        L.topLeft.label = "increment:\n" + increment.ratePerInterval;
        L.topRight.label = category[screenC][editing].OccurrencePerInt;
        Interface.render();
        break;
      default:
        console.log("default fired");
        // if habit undefined, create
        if (!category[screenC][habit]) {
          window.createNew();
          return;
        }
        //else, go to menu
        editing = habit;
        window.menu();
    }
  }
}
function btn() {
  switch (screen) {
    case "interval":
    case "intervalType":
      screen = "menu";
      Interface.resetColour();
      window.menu();
      break;
    case "intervalTypeCounter":
      screen = "intervalType";
      Interface.resetColour();
      window.intervalType();
      break;
    default:
      console.log(`screen: ${screen}, num: ${num}`);
      Interface.resetColour();
      if (settings) {
        file.write();
        settings = false;
      }
      if (timeoutBtn) {
        if (timeoutBtn) clearTimeout(timeoutBtn);
        timeoutBtn = undefined;
        window.folders();
        return;
      }

      num = num + 4;
      if ((!category[screenC][num - 1] && num != 0) || screen == "folders") {
        num = 0;
      }
      window.mp(screenC);

      timeoutBtn = setTimeout(function () {
        if (timeoutBtn) clearTimeout(timeoutBtn);
        timeoutBtn = undefined;
      }, 150);
  }
}
function update() {
  file.write();
  window.mp(screenC);
}

let window = {
  mp: function (list) {
    if (screenC != list || screen != list) {
      num = 0;
      screenC = list;
      screen = list;

      sortTime();
    }
    editing = false;
    Interface.setUI();
    Interface.resetColour();

    let d, l;
    for (let i = 0; i < 4; i++) {
      //varibales
      d = category[list][num + i];
      l = L[location[i]];
      // set name
      if (!d) {
        l.label = "~~~\n~~~~~\n~~~";
        continue;
      }
      let content = d.name;
      // set col and additional info
      let previousMax =
        +d.streakPreviousMax > d.streak ? ` | ${d.streakPreviousMax}` : "";

      let mins = Math.floor(d.time / 60000) % 60;
      let timeDisp =
        d.time == day
          ? "--:--"
          : ("0" + Math.floor(d.time / 3600000)).slice(-2) +
            ":" +
            ("0" + mins).slice(-2);
      let rankDisp = d.rank
        .map(function (r) {
          return Math.round(r * 10) / 10;
        })
        .join("|");

      //
      switch (list) {
        case "pending_every": // pending, missed one day
          l.label =
            content +
            "\n" +
            `s: ${d.streak}${previousMax}\nr:${rankDisp}\n${timeDisp}`;
          if (d.date < dateYesterdayMs) l.bgCol = "#9AE630";
          if (d.intType != "perInterval") break;
        case "weekly_perInt": // pending per Interval
        case "monthly_perInt":
          l.bgCol = "#42D3F2";
          l.label =
            content +
            "\n" +
            d.OccurrenceLeft +
            " left\\" +
            d.OccurrencePerInt +
            `\nr:${rankDisp}\n${timeDisp}`;
          // +"\ndo in " +
          // Math.round((d.date - dateTodayMs) / day) +
          // "d";
          break;
        case "lost": // lost habits
          l.bgCol = "#460809";
          l.col = "#fff";
          l.label =
            content +
            "\n" +
            //Math.round((d.date - dateTodayMs) / day) +
            //  " d ago lost\n" +
            `s: ${timeDisp}\nr:${rankDisp}`;
          break;
        case "done":
          if (d.intType == "perInterval") {
            // perInterval, done
            l.bgCol = "#192E03";
            l.col = "#fff";
            l.label =
              content +
              "\n" +
              //   Math.round((d.date - dateTodayMs) / day) +
              //   "d left\n" +
              `s: ${d.streak}${previousMax}\nr:${rankDisp}\n${timeDisp}`;
          } else {
            // every, done
            l.bgCol = "#000";
            l.col = "#fff";
            l.label =
              content +
              "\n" +
              `s: ${d.streak}${previousMax}\nr:${rankDisp}\n${timeDisp}`;
          }
      }
    }
    Interface.render();
  },
  folders: function () {
    screen = "folders";
    let habitMemoryLeft =
      process.memory().free /
      ((process.memory().usage - memoryClean) / dataLength);
    //                let percentUsed =
    //                (process.memory().usage / process.memory().total) * 100;
    //

    L.topLeft.label = "weekly";
    L.topRight.label = "monthly";
    L.bottomLeft.label =
      "lost\n" + Math.round(habitMemoryLeft) + " habits left";
    L.bottomRight.label = "done";

    let c = ["weekly_perInt", "monthly_perInt", "lost", "done"];
    for (let i = 0; i < 4; i++) {
      if (screenC != c[i]) {
        L[location[i]].bgCol = "#000";
        L[location[i]].col = "#fff";
      } else {
        L[location[i]].label = "go back";
      }
    }
    Interface.render();
  },
  menu: function () {
    screen = "menu";
    Interface.resetColour();
    let intType =
      category[screenC][editing].intType == "every"
        ? "every"
        : category[screenC][editing].OccurrencePerInt + "times per";
    L.topLeft.label = `change Name\n\n[${category[screenC][editing].name}]`;
    L.topRight.label = "delete";
    L.bottomLeft.label = `type:\n[${intType}]`;
    L.bottomRight.label = `interval\n\n[${category[screenC][editing].interval} days]`;

    Interface.render();
  },
  interval: function () {
    if (category[screenC][editing].intType == "every") {
      increment.name = "days";
      increment.rate = 1;
    } else {
      increment.name = "weeks";
      increment.rate = 7;
    }
    L.topLeft.label = "increment:\n" + increment.name;

    L.topRight.label = category[screenC][editing].interval;

    L.bottomLeft.label = "-";

    L.bottomRight.label = "+";
    screen = "interval";
    Interface.render();
  },
  intervalType: function () {
    screen = "intervalType";
    L.topLeft.label = "every";
    L.topRight.label = `Interval`;
    L.bottomLeft.label = `${category[screenC][editing].OccurrencePerInt} times\n\n`;
    L.bottomRight.label = "per Interval";
    Interface.resetColour();
    if (category[screenC][editing].intType == "every") {
      L.topLeft.bgCol = "#000";
      L.topLeft.col = "#fff";
      L.topRight.bgCol = "#000";
      L.topRight.col = "#fff";
    } else {
      L.bottomLeft.bgCol = "#000";
      L.bottomLeft.col = "#fff";
      L.bottomRight.bgCol = "#000";
      L.bottomRight.col = "#fff";
    }
    Interface.render();
  },
  intervalTypeCounter: function () {
    L.topLeft.label = "increment:\n" + increment.ratePerInterval;

    L.topRight.label = category[screenC][editing].OccurrencePerInt;

    L.bottomLeft.label = "-";

    L.bottomRight.label = "+";
    screen = "intervalTypeCounter";
    Interface.render();
  },
  createNew: function () {
    g.clear();
    // keyboard input snippet
    require("textinput")
      .input({ text: "" })
      .then((result) => {
        if (result != "") {
          category[screenC].push(
            Object.assign({ name: result }, defaultStruc, { rank: [] }),
          );
          file.write();
          L.forgetLazyState();
          Interface.setUI();
          window.mp("pending_every");
        } else {
          L.forgetLazyState();
          Interface.setUI();
          window.mp(screenC);
        }
      });
  },
};

getDate();
file.read();
window.mp("pending_every");
