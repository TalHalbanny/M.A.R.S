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

app.post('/submit-form', async (req, res) => {
  try {
    const { equipment, ...data } = req.body;

    if (!equipment) {
      return res.status(400).send("Missing Equipment Type!");
    }

    const equipmentModel = getmodel(equipment);
    const doc = new equipmentModel(data);
    await doc.save();

    console.log(`Inserted into ${equipment} collection:`, data);
    res.send(`Data was successfully inserted into ${equipment} collection`);
  } catch (err) {
    console.error("Error Detected:", err);
    res.status(500).send("Process Error! Save Was Unsuccessful");
  }
});

app.post('/get-history', async (req, res) => {
  try {
    const { equipment, month } = req.body;

    if (!equipment) {
      return res.status(400).send("Must choose equipment type for history");
    }

    const equipmentModel = getmodel(equipment);
    let query = {};

    if (month) {
      const [year, mon] = month.split("-");
      const monthIndex = parseInt(mon, 10) - 1;

      const start = new Date(year, monthIndex, 1, 0, 0, 0);
      const end = new Date(year, monthIndex + 1, 0, 23, 59, 59);

      query = {
        $or: [
          { createdAt: { $gte: start, $lte: end } },
          { date: { $regex: `^${year}-${String(mon).padStart(2, '0')}` } } 
        ]
      };
    }

    const docs = await equipmentModel.find(query).sort({ createdAt: -1 }).lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch history");
  }
});

app.get('/history', (req, res) => { 
  res.sendFile(path.join(__dirname, 'history.html'));
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

