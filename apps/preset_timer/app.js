{
  g.clear();
  //VARIABLES

  // for graphics and touch
  let getMin10, getMin1, timeout, draw, timeLeft, finalTimeout, minutesSet;
  let buttonPressed = 0;
  let secondsTillTimerSet = 6;
  let presetTimes = [
    "start",
    "3",
    "5",
    "6",
    "10",
    "15",
    "20",
    "30",
    "45",
    "1h",
  ];
  // Timer
  function getTimer(bAsMin, counter) {
    // get Time values for two digit and single digit
    switch (true) {
      case counter === 1: // x0:00
        getMin10 = bAsMin;
        g.clear();
        onedigitLayout.setUI();
        onedigitLayout.forgetLazyState();
        onedigitLayout.render();
        Bangle.buzz(100, 0.1);
        return;

      case counter === 2: // 0x:00
        getMin1 = bAsMin;
        // calculate total value in min
        minutesSet = getMin10 * 10 + getMin1;
        console.log(`minutesSet: ${minutesSet}`);
        g.clear();
        finalCheck.setTime.label = minutesSet;
        finalCheck.setUI();
        finalCheck.forgetLazyState();
        finalCheck.render();
        Bangle.buzz(100, 0.1);
        return;

      case counter === 3: // set timer
        // set alarm wit sched libary
        require("sched").setAlarm("mytimer", {
          // as a timer
          msg: "",
          timer: minutesSet * 60 * 1000, // 10 minutes
          del: true,
          vibrate: ".-.---.  .-.-.---",
        });
        // back to clockface
        g.clear();
        Bangle.showClock();
        Bangle.buzz(100, 0.1);
        return;

      case counter === 4: // abort setting timer
        // back to clockface
        g.clear();
        Bangle.showClock();
        Bangle.buzz(100, 0.1);
        return;

      default: // something went wrong
        console.log(`getTimerCounter: ${counter} \n not expexted `);
        return;
    }
  }

  let Layout = require("Layout");
  let cycle = new Layout({
    type: "v",
    fillx: 1,
    filly: 1,
    c: [
      {
        type: "txt",
        id: "main",
        font: "30%",
        fillx: 1,
        filly: 1,
        label: presetTimes[0],
        pad: 10,
        wrap: true,
      },
      {
        type: "txt",
        id: "timeout",
        font: "6x8:3",
        fillx: 1,
        filly: 0,
        label: "00",
        pad: 10,
      },
    ],
  });

  function render() {
    g.clear();
    cycle.render();
    // render timeout
    if (timeout && timeLeft > 0) {
      timeLeft--;
      cycle.timeout.label = timeLeft < 10 ? "0" + timeLeft : timeLeft;
    } else {
      cycle.timeout.label = "";
    }

    if (draw) {
      clearTimeout(draw);
      draw = undefined;
    }
    draw = setTimeout(render, 1000 /*1 second*/);
  }

  function setNewTimeout() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    timeLeft = secondsTillTimerSet;
    timeout = setTimeout(startTimer, secondsTillTimerSet * 1000 /* seconds*/);
    render();
  }

  function startTimer() {
    if (buttonPressed == 0) {
      // Delete an alarm
      require("sched").setAlarm("mytimer", undefined);
      // Reload after deleting
      require("sched").reload();
    } else {
      minutesSet = parseInt(cycle.main.label);
      if (cycle.main.label.endsWith("h")) minutesSet *= 60;
      cycle.main.font = "6x8:4";
      cycle.main.label = "Timer set " + minutesSet;
      require("sched").setAlarm("mytimer", {
        // as a timer
        msg: "",
        timer: minutesSet * 60 * 1000, // 10 minutes
        del: true,
        vibrate: ".-.---.  .-.-.---",
      });

      require("sched").reload();
    }

    finalTimeout = setTimeout(() => {
      Bangle.buzz(100, 0.1);
      Bangle.showClock();
    }, 1000 /*2 seconds*/);
  }

  Bangle.setUI({
    mode: "custom",
    //    touch: function () {
    //      main("MainTouch");
    //    },
    btn: function () {
      Bangle.buzz(100, 0.1);
      buttonPressed++;
      g.clear();
      if (buttonPressed >= presetTimes.length) buttonPressed = 0;
      cycle.main.label = presetTimes[buttonPressed];
      cycle.render();
      setNewTimeout();
    },
  });

  cycle.render();
  presetTimes[0] = "delete Timer";
}
