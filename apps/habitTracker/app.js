{
  g.clear();

  //VARIABLES

  // for graphics and touch
  let c = Bangle.appRect;
  // c gives back:
  //x  & y   = 0
  //x2 & y2  = 175
  //w  & h   = 176
  let y50percent = c.y2 / 2;
  let x50percent = c.x2 / 2;

  let habits = [
    "Anki",
    "hledger",
    "clean 10 min",
    "stretch",
    "read at home",
    "eat clean",
    "feed fish",
    "workout or take walk",
    "brush teeth",
    "prep next day",
  ];
  let file = [];
  let backup = {};
  let dateToday, dateYesterday;
  let number = 0;
  const BACKUP_FILE = "habitBackup.txt";

  let interface = require("Layout");
  let Layout = new interface({
    type: "v",
    id: "main",
    c: [
      {
        type: "h",
        id: "top",
        fillx: 1,
        filly: 1,
        c: [
          {
            type: "txt",
            font: "10%",
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
            font: "10%",
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
        font: "20%",
        id: "bottom",
        fillx: 1,
        c: [
          {
            type: "txt",
            font: "10%",
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
            font: "10%",
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
  });
  Layout.update();

  function setLayout() {
    // need to change
    //   console.log("set layout before sort:\n" + file);
    // stored string: habit | storage line |  interval (0 = everyDay, 1 every second) | streak | Max streak Ever | date last updated | time on the day last updated
    file.sort((a, b) => {
      let aDate = new Date(a.split("|")[5]).getTime();
      let bDate = new Date(b.split("|")[5]).getTime();

      // sort things marked as done today last
      if (aDate == new Date(dateToday).getTime()) aDate = 0;
      if (bDate == new Date(dateToday).getTime()) bDate = 0;

      // sort after date closesd to today
      if (aDate != bDate) {
        return bDate - aDate;
      } else {
        let aTime = Number(a.split("|")[6]);
        let bTime = Number(b.split("|")[6]);
        // sort after earliest time
        return aTime - bTime;
      }
    });

    // console.log("set layout after sort:\n" + file);

    //set Label content

    let locations = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

    for (let i = 0, line = number; i < 4; i++, line++) {
      if (file[line]) {
        // parse content from File
        let parts = file[line].split("|");
        let lastDate = parts[5];
        let streak = Number(parts[3]);
        let streakPreviousMax = Number(parts[4]);

        if (streakPreviousMax <= streak) {
          streakPreviousMax = "";
        } else {
          streakPreviousMax = " | " + streakPreviousMax;
        }
        // set label
        Layout[locations[i]].label =
          parts[0] + "\n" + streak + streakPreviousMax;
        // set color
        let DayDiff = calculateDays(lastDate, dateToday);
        if (DayDiff === 2) {
          Layout[locations[i]].bgCol = "#0f0";
          Layout[locations[i]].col = "#fff";
        } else if (DayDiff > 2) {
          Layout[locations[i]].bgCol = "#f00";
          Layout[locations[i]].col = "#fff";
          Layout[locations[i]].label = parts[0] + "\n" + DayDiff + "d";
        } else if (DayDiff === 0) {
          Layout[locations[i]].bgCol = "#000";
          Layout[locations[i]].col = "#fff";
        } else if (DayDiff === 1) {
          Layout[locations[i]].bgCol = "#fff";
          Layout[locations[i]].col = "#000";
        } else {
          console.log("setLayout color logic broke");
        }
      } else {
        Layout[locations[i]].label = "^_^";
        Layout[locations[i]].bgCol = "#753F00";
        Layout[locations[i]].col = "#fff";
      }
    }

    g.clear();
    Layout.render();
    //console.log("used " + process.memory().usage);
    //console.log("free " + process.memory().free);
  }

  function getDate() {
    const date = new Date();
    let year = date.getFullYear();
    let month = (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1);
    let day = (date.getDate() < 10 ? "0" : "") + date.getDate();

    dateToday = `${year}-${month}-${day}`;

    const yesterday = new Date(date.getTime() - 86400000); // minus 1 day in ms
    let yYear = yesterday.getFullYear();
    let yMonth =
      (yesterday.getMonth() + 1 < 10 ? "0" : "") + (yesterday.getMonth() + 1);
    let yDay = (yesterday.getDate() < 10 ? "0" : "") + yesterday.getDate();

    dateYesterday = `${yYear}-${yMonth}-${yDay}`;

    const midnight = new Date(dateToday);
    return date.getTime() - midnight.getTime();
  }

  function calculateDays(startDate, endDate) {
    let start = new Date(startDate);
    let end = new Date(endDate);
    let timeDifference = end - start;
    let daysDifference = timeDifference / (1000 * 3600 * 24);
    return daysDifference;
  }

  function saveBackup() {
    let fw = require("Storage").open(BACKUP_FILE, "w");
    for (let habit in backup) {
      fw.write(backup[habit]); // each entry already ends with "|\n"
    }
  }

  function loadBackup() {
    backup = {};
    let f = require("Storage").open(BACKUP_FILE, "r");
    let line;
    while ((line = f.readLine()) !== undefined) {
      let parts = line.split("|");
      if (parts[0]) backup[parts[0]] = line;
    }
  }

  function loadFile() {
    // need to change
    let fileName = "habitv2.txt"; // default
    // stored string: habit | storage line |  interval (0 = everyDay, 1 every second) | streak | Max streak Ever | date last updated | time on the day last updated

    file = []; // reset file array
    let FillFileLater = false;

    let f = require("Storage").open(fileName, "r");
    //   console.log("loadFile");
    for (let i = 0; i < habits.length; i++) {
      let line = f.readLine();
      file.push(line);
      if (!line || line.split("|")[0] != habits[i]) {
        FillFileLater = true;
      }
    }
    // console.log(file);

    if (FillFileLater) {
      // dont want anything to be undefined, but write deltes the file. So we first gotta read the whole thing replace the undefined and then reread.
      let fw = require("Storage").open(fileName, "w");
      for (let i = 0; i < file.length; i++) {
        if (!file[i] || file[i].split("|")[0] != habits[i]) {
          fw.write(habits[i] + "|" + i + "|0|0|0|" + dateYesterday + "|0|\n");
        } else {
          fw.write(file[i]);
        }
      }

      loadFile();
      return;
    }
    setLayout();
  }

  function changeFile(linenumber, update) {
    // need to change
    let fileName = "habitv2.txt"; //default
    //console.log("changefile before file:\n" + file);
    file.sort((a, b) => {
      a = a.split("|")[1];
      b = b.split("|")[1];
      return a - b;
    });

    // console.log("change file after:\n" + file);
    let fw = require("Storage").open(fileName, "w");
    for (let i = 0; i < file.length; i++) {
      if (i == linenumber) {
        fw.write(update);
      } else {
        fw.write(file[i]);
      }
    }
    //console.log("updated file");

    loadFile();
  }

  function toggle(locationID) {
    //   console.log("used " + process.memory().usage);
    // console.log("free " + process.memory().free);
    // stored string: habit | storage line |  interval (0 = everyDay, 1 every second) | streak | Max streak Ever | date last updated | time on the day last updated
    // need to change
    let saveLocation = number + locationID;

    if (!file[saveLocation]) return;
    let parts = file[saveLocation].split("|");
    let lastDate = parts[5];
    let streak = Number(parts[3]);
    let streakPreviousMax = Number(parts[4]);
    let weight = 0.1; // how much influence the new time has on the average. 0.1 are 10% new and 90% old
    let time =
      getDate() /*newTime*/ * weight + (1 - weight) * parts[6]; /*oldTime*/ // its basically 10% newTime + 90% oldtime = 100%
    let DayDiff = calculateDays(lastDate, dateToday);

    // safe logic
    if (lastDate != dateToday && DayDiff <= 2) {
      backup[parts[0]] = file[saveLocation];
      saveBackup();
      // continue streak
      streak++;
      changeFile(
        parts[1],
        parts[0] +
          "|" +
          parts[1] +
          "|" +
          parts[2] +
          "|" +
          streak +
          "|" +
          streakPreviousMax +
          "|" +
          dateToday +
          "|" +
          time +
          "|\n",
      );
      // console.log("continoue streak");
    } else if (DayDiff > 2) {
      backup[parts[0]] = file[saveLocation];
      saveBackup();
      //reset streak
      if (streakPreviousMax < streak) streakPreviousMax = streak;
      changeFile(
        parts[1],
        parts[0] +
          "|" +
          parts[1] +
          "|" +
          parts[2] +
          "|0|" /*streak*/ +
          streakPreviousMax +
          "|" +
          dateToday +
          "|" +
          getDate() /*Time*/ +
          "|\n",
      );
      //console.log("reset");
    } else if (lastDate === dateToday) {
      // reverse change
      let old = backup[parts[0]];
      if (old) {
        backup[parts[0]] = file[saveLocation];
        saveBackup();
        changeFile(old.split("|")[1], old);
      } else {
        console.log("no backup");
      }
    }
  }

  Bangle.setUI({
    mode: "custom",
    touch: function (n, e) {
      //    // I leave this here if someone wants to understand touch
      if (e.x < x50percent && e.y < y50percent) {
        console.log("button 0 pressed");
        toggle(0);
      } else if (e.x > x50percent && e.y < y50percent) {
        console.log("button 1 pressed");
        toggle(1);
      } else if (e.x < x50percent && e.y > y50percent) {
        console.log("button 2 pressed");
        toggle(2);
      } else if (e.x > x50percent && e.y > y50percent) {
        console.log("button 3 pressed");
        toggle(3);
      } else {
        console.log(
          "Touch event noticed, but nothing allocated\nn: " +
            n +
            " |  e.x:" +
            e.x +
            " | e.y:" +
            e.y,
        );
      }
    },
    btn: function (n) {
      number = number + 4;
      if (!habits[number]) number = 0;
      setLayout();
    },
  });

  getDate(); // must run first
  loadFile(); // must be run at least once before setLayout()
  loadBackup();
}
