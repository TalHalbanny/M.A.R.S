
//connect relevant libreries.

const fs = require('fs');
const path = require('path');
const bodyparser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const { spawn } = require('child_process');

//connect and declare port number

const port = 3000; 
const app = express(); 

//extract data from JSON that is updated from python script

const shuttleJsonPath = path.join(__dirname, 'shuttle_data.json'); 
let shuttleData = [];

// Preload shuttleData at startup if file exists
try {
  if (fs.existsSync(shuttleJsonPath)) {
    const json = fs.readFileSync(shuttleJsonPath, 'utf8');
    shuttleData = JSON.parse(json);
    console.log(`Preloaded shuttleData: ${shuttleData.length} records`);
  }
} catch (err) {
  console.error("Failed to preload shuttle_data.json:", err.message);
}

// Function to update shuttleData by running the Python scraper
function updateShuttleData() {
  const pythonScript = path.join(__dirname, 'scarpper_v1.py'); 

  console.log("Running Python scraper...");

  const python = spawn('python', [pythonScript]);

  python.stdout.on('data', (data) => {
    console.log(`Python output: ${data.toString()}`);
  });

  python.stderr.on('data', (data) => {
    console.error(`Python error: ${data.toString()}`);
  });

  python.on('close', (code) => {
    console.log(`Python exited with code ${code}`);
    
    // Read JSON after Python script finishes
    fs.readFile(shuttleJsonPath, 'utf8', (err, json) => {
      if (err) {
        console.error("Error reading shuttle_data.json:", err.message);
        return;
      }

      try {
        const parsed = JSON.parse(json);

        if (!Array.isArray(parsed)) {
          console.error("shuttle_data.json does not contain an array:", parsed);
          return;
        }

        shuttleData = parsed;
        console.log(`shuttleData updated: ${shuttleData.length} records`);
      } catch (parseErr) {
        console.error("Error parsing shuttle_data.json:", parseErr.message);
      }
    });
  });
}

// API endpoint to always serve latest shuttleData
app.get('/api/shuttles', (req, res) => {
  // Optionally, read directly from file every time
  fs.readFile(shuttleJsonPath, 'utf8', (err, json) => {
    if (err) {
      console.error("Failed to read shuttle data:", err.message);
      return res.status(500).send("Failed to read shuttle data");
    }

    try {
      const data = JSON.parse(json);
      res.json(data);
    } catch (e) {
      console.error("Invalid JSON:", e.message);
      res.status(500).send("Invalid shuttle data JSON");
    }
  });
});



//use body parser for requests and app.use for path declaration.

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname)));

//connect to mongoDB Database.

mongoose.connect('mongodb://localhost:27017/equipmentReports')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

//Schemas for data retrivals from collections.

const genericSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const messageSchema = new mongoose.Schema({
  message: String,
  technician: String,
  importance: String
}, { timestamps: true });

const Message = mongoose.model("messages", messageSchema, "messages")

//getmodel Function for getting schema and quering the database acts as a short-cut.

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
          date: createUTCDate(data.date), 
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
          agvDate: createUTCDate(data.date), 
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
          rgvDate: createUTCDate(data.date), 
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
          liftDate: createUTCDate(data.date), 
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

 

    console.log("Mongo query:", query); 

    const docs = await equipmentModel.find(query).sort({ [dateField]: -1 }).lean();
    console.log("Fetched docs:", docs); 

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

app.get('/createtask', (req,res) => {
  res.sendFile(path.join(__dirname, 'createtask.html'));
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

app.post('/submit-message', async (req, res) => {
  try {
    const { message, technician, importance } = req.body;

    if (!message || !technician || !importance) {
      return res.status(400).send("Missing required fields");
    }

    const newMessage = new Message({
      message,
      technician,
      importance
    });

    await newMessage.save();

    res.json({ success: true, msg: "Message saved" });
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).send("Failed to save message");
  }
});

app.get('/get-messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(4).lean();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Failed to fetch messages");
  }
});

app.get('/shuttles', (req, res) => {
  res.sendFile(path.join(__dirname, 'shuttle_stat.html'));
});

app.get('/api/shuttles', (req, res) => {
  res.json(shuttleData); 
});

app.delete('/delete-message/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to delete message");
  }
});

//run scrapper on a timer interval

updateShuttleData();
setInterval(updateShuttleData, 30000);


app.listen(port, () => {
  console.log("Server Running on 3000");
});

