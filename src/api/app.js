const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
var weather = require('openweather-apis');
const { urlencoded } = require("body-parser");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());


const messages = [
  {
    id: 1,
    name: "Ishan",
    message: "Hello I am Ishan",
  },
  {
    id: 2,
    name: "Kasun",
    message: "Hello I am Kasun",

  },
  {
    id: 3,
    name: "Ashan",
    message: "Hello I am Ashan",
	},
	{
    id: 4,
    name: "Tilanga",
    message: "Hello I am Tilanga",
	}

]


app.get("/", (req, res) => {
  res.send(messages);
});



app.listen(8081, () => {
  console.log("App's running on port 8081");
});

