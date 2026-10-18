{
  let d = JSON.parse(require("Storage").read("budget.json"));

  // Layout
  let interface = require("Layout");
  let Layout = new interface({
    type: "h",
    id: "main",
    c: [
      {
        type: "v",
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
            bgCol: "#FFBF00",
            col: "#000",
            wrap: false,
          },
          {
            type: "txt",
            font: "10%",
            id: "bottomLeft",
            fillx: 1,
            filly: 1,
            label: "",
            bgCol: "#93C572",
            col: "#fff",
            wrap: false,
          },
        ],
      },

      {
        type: "txt",
        font: "10%",
        id: "Right",
        fillx: 1,
        filly: 1,
        label: "",
        bgCol: "#00FFFF",
        col: "#000",
        wrap: false,
      },
    ],
  });
  Layout.update();
  // Variabeln
  let surplus =
    d.income -
    50 -
    Math.max(300, d.essen.amount) -
    Math.max(100, d.essen.amount) -
    Math.max(409.55, d.monthly.amount);
  if (surplus > 200) {
    // money for liabilities and 100 for safety
  }

  console.log(surplus);
  let timeLeftMain = Math.floor((d.liabilities - 7900) / surplus) + 1; //months
  if (timeLeftMain > 12) {
    timeLeftMain =
      Math.floor(timeLeftMain / 12) + "y " + (timeLeftMain % 12) + "m";
  } else {
    timeLeftMain = timeLeftMain + "m";
  }
  Layout.topLeft.label = "Konto:\n" + d.konto + "\n\n+: " + surplus; // could substract the budget and it would become safety, when budget go <0 it becomes konto
  Layout.bottomLeft.label = "Schulden\nin " + timeLeftMain + "\nabbezahlt\n";
  Layout.Right.label =
    //non-food
    "non-food:\n" +
    Math.floor(d["non-food"].amount) +
    " paid\n" +
    Math.floor(d.kontosubs["non-food"]) +
    " left\n\n" +
    // food
    "essen:\n" +
    Math.floor(d.essen.amount) +
    " paid\n" +
    Math.floor(d.kontosubs.essen) +
    " left\n\n" +
    // fun
    "fun:" +
    Math.floor(d.kontosubs.fun);

  g.clear();
  Layout.render();
}
