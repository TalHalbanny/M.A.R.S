//require necceserry

const fs = require('fs');
const path = require('path');
const bodyparser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

const port = 3000; 
const app = express(); //create app express

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname)));

mongoose.connect('mongodb://localhost:27017/equipmentReports')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

const genericSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

function getmodel(equipmentType) {
  return mongoose.model(equipmentType, genericSchema, equipmentType);
}

function createUTCDate(dateString) {
  if (!dateString) return new Date(); 
  const date = new Date(dateString);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const collectionMap = {
  Shuttle: "Shuttle",
  AGV: "AGV",
  RGV: "RGV",
  Lift: "Lift"
};




app.post('/submit-form', async (req, res) => {
  try {
    const { equipment, ...data } = req.body;
    if (!equipment) return res.status(400).send("Missing Equipment Type!");

    const collectionName = collectionMap[equipment];
    if (!collectionName) return res.status(400).send("Invalid equipment type!");

    const equipmentModel = getmodel(collectionName);

    let mappedData = { equipment }; 

    switch (equipment) {
      case "Shuttle":
        mappedData = {
          equipment,
          shuttleNum: data.shuttleNum,
          reportedAt: data.reportedAt,
          hour: data.hour,
          date: createUTCDate(data.date), // USE HELPER
          notes: data.notes,
          fixedBy: data.fixedBy,
          solution: data.solution
        };
        break;

      case "AGV":
        mappedData = {
          equipment,
          agvNum: data.agvNum,
          hour: data.hour,
          agvDate: createUTCDate(data.date), // USE HELPER
          notes: data.notes,
          fixedBy: data.fixedBy,
          solution: data.solution
        };
        break;

      case "RGV":
        mappedData = {
          equipment,
          rgvNum: data.rgvNum,
          hour: data.hour,
          rgvDate: createUTCDate(data.date), // USE HELPER
          notes: data.notes,
          fixedBy: data.fixedBy,
          solution: data.solution
        };
        break;

      case "Lift":
        mappedData = {
          equipment,
          liftNum: data.liftNum,
          hour: data.hour,
          liftDate: createUTCDate(data.date), // USE HELPER
          notes: data.notes,
          fixedBy: data.fixedBy,
          solution: data.solution
        };
        break;

      default:
        return res.status(400).send("Unknown equipment type");
    }

    const doc = new equipmentModel(mappedData);
    await doc.save();

    console.log(`Inserted into ${collectionName} collection:`, mappedData);
    res.send(`Data was successfully inserted into ${collectionName} collection`);
  } catch (err) {
    console.error("Error Detected:", err);
    res.status(500).send("Process Error! Save Was Unsuccessful");
  }
});



app.post('/get-history', async (req, res) => {
  try {
    const { equipment, month } = req.body;
    console.log("Request body:", req.body);

    if (!equipment) return res.status(400).send("Must choose equipment type");

    const collectionName = collectionMap[equipment];
    if (!collectionName) return res.status(400).send("Invalid equipment type");

    const equipmentModel = getmodel(collectionName);

    let query = {};

    // Determine the correct date field for the selected equipment
    let dateField = "";
    switch (equipment) {
      case "Shuttle": dateField = "date"; break;
      case "AGV": dateField = "agvDate"; break;
      case "RGV": dateField = "rgvDate"; break;
      case "Lift": dateField = "liftDate"; break;
      default: dateField = "createdAt"; break;
    }

    if (month) {
      const [year, mon] = month.split("-");
      const monthIndex = parseInt(mon, 10) - 1; // JS months are 0-11

      const start = new Date(Date.UTC(year, monthIndex, 1));
      
      const end = new Date(Date.UTC(year, monthIndex + 1, 1));

      query[dateField] = { $gte: start, $lt: end };
    }

 

    console.log("Mongo query:", query); // Good for debugging

    const docs = await equipmentModel.find(query).sort({ [dateField]: -1 }).lean();
    console.log("Fetched docs:", docs); // Good for debugging

    res.json(docs);
    

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch history");
  }
});



app.get('/history', (req, res) => { 
  res.sendFile(path.join(__dirname, 'history.html'));
});

app.get('/report', (req,res) =>{
  res.sendFile(path.join(__dirname,'report.html'));
});


app.get('/get_shuttles', async (req,res) => {
  try { 

    const shudata = getmodel("shuttleList");

    const shuttles = await shudata.find({}, {shuttleNum: 1, _id: 0}).lean();

    res.json(shuttles);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve Data.");
  }
});

app.get('/get_AGVS', async (req, res) => {

  try {
    const AGdata = getmodel("AGVList");
    const AGshutles = await AGdata.find({}, {AGVnum: 1 , _id: 0}).lean();
    res.json(AGshutles);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve Data");
  }

});

app.listen(port, () => {
  console.log("Server Running on 3000");
});

