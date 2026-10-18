{
  let drawTimeout, showPercent, revertTimeout;
  let reload = 600000;

  function getTime(date) {
    let timeStr;
    if (reload === 600000) {
      timeStr = new Date(Math.ceil(Date.now() / reload) * reload);
      let hh = String(timeStr.getHours()).padStart(2, "0");
      let mm = String(timeStr.getMinutes()).padStart(2, "0");
      timeStr = `${hh}:${mm}`; // "15:30"
    } else {
      timeStr = require("locale").time(date, 1); // Hour and minute
    }

    return timeStr;
  }

  function batteryText() {
    let batt = E.getBattery();
    let data = require("smartbatt").get();
    let hrsLeft = data.hrsLeft;
    let days = hrsLeft / 24;
    let txt =
      days >= 1
        ? Math.round(Math.min(days, 99)) + "d"
        : Math.round(hrsLeft) + "h";
    txt = txt + "|" + batt + "%";
    switch (true) {
      case batt < 25:
        clockface.battery.font = "6x8:2";
        txt = "need\nENERGY";
        break;
    }

    if (Bangle.isCharging()) txt = "";
    return txt;
  }

  // get remaining time till next timer to show on watch face
  function getRemainTime() {
    let timeToNext = require("sched").getTimeToAlarm(
      require("sched").getAlarm("mytimer"),
    );

    let totalSeconds = Math.floor(timeToNext / 1000); // miliseconds -> seconds
    let minutesDisp = Math.floor(totalSeconds / 60); // seconds -> minutes
    let secondsDisp = totalSeconds % 60; // only seconds of this minute, not entire human historz since 1970
    let secondsDispPretty = (secondsDisp < 10 ? "0" : "") + secondsDisp; // seconds always 2 digit
    let digitCwdwn =
      minutesDisp + ":" + (secondsDisp < 10 ? "0" : "") + secondsDisp; // this format 00:00

    // clockface changes
    if (minutesDisp <= 5) {
      clockface.dateDay.label = minutesDisp;
      clockface.month.label = secondsDispPretty;
      return 1000;
    } else {
      if (minutesDisp >= 60) {
        minutesDisp =
          Math.floor(minutesDisp / 60) + "h " + (minutesDisp % 60) + "min";

        clockface.month.font = "6x8:2";
        clockface.battery.label = "";
      } else {
        clockface.month.font = "6x8:3";
      }

      clockface.month.label = minutesDisp;
      return 60000;
    }
  }

  // main watch layout
  let Layout = require("Layout");
  let clockface = new Layout(
    {
      type: "v",
      c: [
        {
          type: "txt",
          font: "Anton",
          id: "time",
          label: "00:00",
          valign: "-1",
          fillx: "1",
          filly: "1",
          pad: 15,
        },
        {
          type: "h",
          c: [
            {
              type: "h",
              fillx: "1",
              filly: "1",
              c: [
                {
                  type: "txt",
                  font: "Anton",
                  label: "01",
                  id: "dateDay",
                  col: "#0aa",
                  valign: "-1",
                  fillx: "1",
                  filly: "1",
                  pad: 5,
                },
                {
                  type: "v",
                  valign: "-1",
                  fillx: "0",
                  filly: "0",
                  c: [
                    {
                      type: "txt",
                      font: "6x8:3",
                      label: "Jan",
                      pad: 20,
                      id: "month",
                      filly: "1",
                      fillx: 1,
                      wrap: true,
                    },
                    {
                      type: "txt",
                      label: "12d",
                      font: "6x8",
                      pad: 5,
                      id: "battery",
                      fillx: "1",
                    },
                    {
                      type: "txt",
                      font: "6x8:3",
                      id: "weekday",
                      pad: 10,
                      label: "Mon",
                      filly: "1",
                    },
                  ],
                },
              ],
            },
            {
              type: "txt",
              font: "6x8:2",
              r: "3",
              label: "10000",
              id: "right",
              halign: "1",
              fillx: "0",
              filly: "1",
              pad: 2,
            },
          ],
          valign: "1",
        },
      ],
    },
    { lazy: true },
  );

  g.clear();

  // main execution
  // its in brackets so nothing outside can reference it.
  // if something would, garbarge collection wouldnt find this and it could keep on existing somewhere
  // so in short: it can read, modify and execute outside of the brackets. But nothing outside can read,modify and execute anything within

  //draw watchface
  let draw = function () {
    // update Time
    let date = new Date();
    let timeStr = getTime(date);

    clockface.time.label = timeStr;

    // update battery
    clockface.battery.label = batteryText();
    // sike
    if (require("sched").getTimeToAlarm(require("sched").getAlarm("mytimer"))) {
      clockface.dateDay.label = date.getDate();
      reload = getRemainTime();
    } else {
      Bangle.isCharging()
        ? (clockface.dateDay.label = batteryText())
        : (clockface.dateDay.label = date.getDate());
      clockface.month.label = require("locale").month(date, 1);
    }

    clockface.weekday.label = require("locale").dow(date, 1).toUpperCase();

    // update Steps
    clockface.right.label = Bangle.getHealthStatus("day").steps;

    //g.clear();
    clockface.render();

    // queue next draw
    if (drawTimeout) clearTimeout(drawTimeout); // if some loop is already running clear it, so no duplicate
    // schedule next timeout
    drawTimeout = setTimeout(
      function () {
        // wrap in function so u can execute the things on the side below
        drawTimeout = undefined; // set undefined, so timer already run out cant appear like they are still running
        draw(); // after time run out execute this
      },
      reload - (Date.now() % reload), // callculate time till end of minute, so time updates exactly when the minute changes and not inbetween
    );
  };

  function timerRunning() {
    let s = require("sched");
    return !!s.getTimeToAlarm(s.getAlarm("mytimer"));
  }

  // back to the 10 min mode
  function slowMode() {
    if (revertTimeout) {
      clearTimeout(revertTimeout);
      revertTimeout = undefined;
    }
    if (!timerRunning()) reload = 600000; // don't break the countdown display
    clockface.dateDay.col = "#0aa";
    draw();
  }

  // screen turned on/off
  function onLcd(on) {
    if (on) {
      reload = 60000; // makes getTime() show the real time
      draw();
      if (revertTimeout) clearTimeout(revertTimeout);
      revertTimeout = setTimeout(slowMode, 5000); // 5 seconds, change as you like
    } else {
      slowMode(); // screen off: go straight back to 10 min
    }
  }

  function resetWatch() {
    //Font
    Graphics.prototype.setFontAnton = function (scale) {
      // Actual height 69 (68 - 0)
      g.setFontCustom(
        atob(
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAA/gAAAAAAAAAAP/gAAAAAAAAAH//gAAAAAAAAB///gAAAAAAAAf///gAAAAAAAP////gAAAAAAD/////gAAAAAA//////gAAAAAP//////gAAAAH///////gAAAB////////gAAAf////////gAAP/////////gAD//////////AA//////////gAA/////////4AAA////////+AAAA////////gAAAA///////wAAAAA//////8AAAAAA//////AAAAAAA/////gAAAAAAA////4AAAAAAAA///+AAAAAAAAA///gAAAAAAAAA//wAAAAAAAAAA/8AAAAAAAAAAA/AAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////AAAAAB///////8AAAAH////////AAAAf////////wAAA/////////4AAB/////////8AAD/////////+AAH//////////AAP//////////gAP//////////gAP//////////gAf//////////wAf//////////wAf//////////wAf//////////wA//8AAAAAB//4A//wAAAAAAf/4A//gAAAAAAP/4A//gAAAAAAP/4A//gAAAAAAP/4A//wAAAAAAf/4A///////////4Af//////////wAf//////////wAf//////////wAf//////////wAP//////////gAP//////////gAH//////////AAH//////////AAD/////////+AAB/////////8AAA/////////4AAAP////////gAAAD///////+AAAAAf//////4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/gAAAAAAAAAAP/gAAAAAAAAAAf/gAAAAAAAAAAf/gAAAAAAAAAAf/AAAAAAAAAAA//AAAAAAAAAAA/+AAAAAAAAAAB/8AAAAAAAAAAD//////////gAH//////////gAP//////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/4AAAAB/gAAD//4AAAAf/gAAP//4AAAB//gAA///4AAAH//gAB///4AAAf//gAD///4AAA///gAH///4AAD///gAP///4AAH///gAP///4AAP///gAf///4AAf///gAf///4AB////gAf///4AD////gA////4AH////gA////4Af////gA////4A/////gA//wAAB/////gA//gAAH/////gA//gAAP/////gA//gAA///8//gA//gAD///w//gA//wA////g//gA////////A//gA///////8A//gA///////4A//gAf//////wA//gAf//////gA//gAf/////+AA//gAP/////8AA//gAP/////4AA//gAH/////gAA//gAD/////AAA//gAB////8AAA//gAA////wAAA//gAAP///AAAA//gAAD//8AAAA//gAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/+AAAAAD/wAAB//8AAAAP/wAAB///AAAA//wAAB///wAAB//wAAB///4AAD//wAAB///8AAH//wAAB///+AAP//wAAB///+AAP//wAAB////AAf//wAAB////AAf//wAAB////gAf//wAAB////gA///wAAB////gA///wAAB////gA///w//AAf//wA//4A//AAA//wA//gA//AAAf/wA//gB//gAAf/wA//gB//gAAf/wA//gD//wAA//wA//wH//8AB//wA///////////gA///////////gA///////////gA///////////gAf//////////AAf//////////AAP//////////AAP/////////+AAH/////////8AAH///+/////4AAD///+f////wAAA///8P////gAAAf//4H///+AAAAH//gB///wAAAAAP4AAH/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAA//wAAAAAAAAAP//wAAAAAAAAB///wAAAAAAAAf///wAAAAAAAH////wAAAAAAA/////wAAAAAAP/////wAAAAAB//////wAAAAAf//////wAAAAH///////wAAAA////////wAAAP////////wAAA///////H/wAAA//////wH/wAAA/////8AH/wAAA/////AAH/wAAA////gAAH/wAAA///4AAAH/wAAA//+AAAAH/wAAA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gA///////////gAAAAAAAAH/4AAAAAAAAAAH/wAAAAAAAAAAH/wAAAAAAAAAAH/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//8AAA/////+B///AAA/////+B///wAA/////+B///4AA/////+B///8AA/////+B///8AA/////+B///+AA/////+B////AA/////+B////AA/////+B////AA/////+B////gA/////+B////gA/////+B////gA/////+A////gA//gP/gAAB//wA//gf/AAAA//wA//gf/AAAAf/wA//g//AAAAf/wA//g//AAAA//wA//g//gAAA//wA//g//+AAP//wA//g////////gA//g////////gA//g////////gA//g////////gA//g////////AA//gf///////AA//gf//////+AA//gP//////+AA//gH//////8AA//gD//////4AA//gB//////wAA//gA//////AAAAAAAH////8AAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////gAAAAB///////+AAAAH////////gAAAf////////4AAB/////////8AAD/////////+AAH//////////AAH//////////gAP//////////gAP//////////gAf//////////wAf//////////wAf//////////wAf//////////wAf//////////4A//wAD/4AAf/4A//gAH/wAAP/4A//gAH/wAAP/4A//gAP/wAAP/4A//gAP/4AAf/4A//wAP/+AD//4A///wP//////4Af//4P//////wAf//4P//////wAf//4P//////wAf//4P//////wAP//4P//////gAP//4H//////gAH//4H//////AAH//4D/////+AAD//4D/////8AAB//4B/////4AAA//4A/////wAAAP/4AP////AAAAB/4AD///4AAAAAAAAAH/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAA//gAAAAAAAAAA//gAAAAAAAAAA//gAAAAAAADgA//gAAAAAAP/gA//gAAAAAH//gA//gAAAAB///gA//gAAAAP///gA//gAAAD////gA//gAAAf////gA//gAAB/////gA//gAAP/////gA//gAB//////gA//gAH//////gA//gA///////gA//gD///////gA//gf///////gA//h////////gA//n////////gA//////////gAA/////////AAAA////////wAAAA///////4AAAAA///////AAAAAA//////4AAAAAA//////AAAAAAA/////4AAAAAAA/////AAAAAAAA////8AAAAAAAA////gAAAAAAAA///+AAAAAAAAA///4AAAAAAAAA///AAAAAAAAAA//4AAAAAAAAAA/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//gB///wAAAAP//4H///+AAAA///8P////gAAB///+f////4AAD///+/////8AAH/////////+AAH//////////AAP//////////gAP//////////gAf//////////gAf//////////wAf//////////wAf//////////wA///////////wA//4D//wAB//4A//wB//gAA//4A//gA//gAAf/4A//gA//AAAf/4A//gA//gAAf/4A//wB//gAA//4A///P//8AH//4Af//////////wAf//////////wAf//////////wAf//////////wAf//////////gAP//////////gAP//////////AAH//////////AAD/////////+AAD///+/////8AAB///8f////wAAAf//4P////AAAAH//wD///8AAAAA/+AAf//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//gAAAAAAAAB///+AA/+AAAAP////gA//wAAAf////wA//4AAB/////4A//8AAD/////8A//+AAD/////+A///AAH/////+A///AAP//////A///gAP//////A///gAf//////A///wAf//////A///wAf//////A///wAf//////A///wA///////AB//4A//4AD//AAP/4A//gAB//AAP/4A//gAA//AAP/4A//gAA/+AAP/4A//gAB/8AAP/4A//wAB/8AAf/4Af//////////wAf//////////wAf//////////wAf//////////wAf//////////wAP//////////gAP//////////gAH//////////AAH/////////+AAD/////////8AAB/////////4AAAf////////wAAAP////////AAAAB///////4AAAAAD/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/AAB/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAA//AAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
        ),
        46,
        atob("EiAnGicnJycnJycnEw=="),
        78 + (scale << 8) + (1 << 16),
      );
    };

    // Show launcher when middle button pressed
    Bangle.setUI({
      mode: "clock",
      remove: function () {
        if (drawTimeout) clearTimeout(drawTimeout);
        drawTimeout = undefined;
        if (revertTimeout) clearTimeout(revertTimeout);
        revertTimeout = undefined;
        Bangle.removeListener("lcdPower", onLcd);
        delete Graphics.prototype.setFontAnton;
      },
      redraw: () => {
        resetWatch();
        clockface.forgetLazyState();
        clockface.update();
        draw();
      },
    });

    Bangle.on("backlight", onLcd);
  }

  resetWatch();
  clockface.update();
  draw();
  // clockface.debug();
}
