
//--REQUIRE NEEDED LIBRARIES--

const fs = require('fs');
const path = require('path');
const bodyparser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const multer = require('multer');

//--EXPRESS APP--

const port = 3000; 
const app = express(); 

//--EXTRACT DATA FROM PYTHON SCRAPPER SHUTTLE DATA JSON--


const shuttleJsonPath = path.join(__dirname, 'shuttle_data.json'); 
const shuttleLinkPath = path.join(__dirname, 'shuttle_links.json');
let shuttleData = [];


//--CREATE MULTER UPLOAD PICTURE DIRECTORY (OVERWEIGHT FORM POST)--


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = path.join(__dirname, 'overweightUploads');
    fs.mkdirSync(folder, { recursive: true }); // make folder if missing
    cb(null, folder); // important!
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
app.use('/overweightUploads', express.static(path.join(__dirname, 'overweightUploads')));


// --PRELOAD SHUTTLE DATA IF EXISTS--

try {
  if (fs.existsSync(shuttleJsonPath)) {
    const json = fs.readFileSync(shuttleJsonPath, 'utf8');
    shuttleData = JSON.parse(json);
    console.log(`Preloaded shuttleData: ${shuttleData.length} records`);
  }
} catch (err) {
  console.error("Failed to preload shuttle_data.json:", err.message);
}

// -- FUNCTION: UPDATE SHUTTLE DATA JSON VIA SCRAPPER--

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
    
    // --READ JSON FILE AFTER THE SCRAPPER FINISHED UPDATING--

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


//--MIDDLEWARE: USE BODY PARSER FOR PATH DECLARATIONS--

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname)));

//CONNECT TO MONGODB USING LIBRARY.--

mongoose.connect('mongodb://localhost:27017/equipmentReports')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));


//--SCHEMAS FOR DATA RETRIVAL FROM COLLECTIONS WITHIN MONGO DB--

const genericSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const messageSchema = new mongoose.Schema({
  message: String,
  technician: String,
  importance: String
}, { timestamps: true });

const Message = mongoose.model("messages", messageSchema, "messages")

//--FUNCTION: SHORTCUT FOR RETRIEVING CARDS, VIA SCHEMAS.--

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
  Lift: "Lift",
  Overweight: "Overweight"
};

//--ROUTE POST: APP ROUTES FOR RETRIEVING DATA, MAPPING OF DATA RETRIEVAL, WHAT EACH DATA RECIEVED FROM THE JSON FILE IS--


app.post('/submit-form', upload.array('image', 5), async (req, res) => {
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
        case "Overweight":
          mappedData = {
            equipment,
            overweightHour: data.overweightHour,
            overweightDate: data.overweightDate,
            ovWeight: data.ovWeight,
            boxNumber: data.boxNumber,
            ovImage: req.files ? req.files.map(f => `overweightUploads/${f.filename}`) : []
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

//--ROUTE POST: UPDATE HISTORY HOUR AND DATE--

app.post('/update-history', async (req, res) => {
  const { id, field, value, equipment } = req.body;

  const collectionName = collectionMap[equipment];
  const Model = getmodel(collectionName);

  let updateValue = value;

  // Convert date fields to Date objects
  if (field.toLowerCase().includes('date')) {
    updateValue = new Date(value);  // <-- This is the key
  }

  await Model.updateOne({ _id: id }, { [field]: updateValue });
  res.send('Updated successfully');
});

//--ROUTE POST: DELETE A ROW IN HISTORY--

app.post('/delete-history', async (req,res) => {

  const {id, equipment} = req.body;

  const collectionName = collectionMap[equipment];
  const Model = getmodel(collectionName);
  const result = await Model.deleteOne({_id: id});

  if (result.deletedCount === 1) {
    res.status(200).send('Delete Succesful');
  } else {
    res.status(404).send('Row Not Found! Couldnt Delete')
  }
});



//--ROUTE POST: GET HISTORY FROM THE DATABASE TO SHOW IN FRONT END, SENT REQUEST BY FORM, GET DATA BACK.--

app.post('/get-history', async (req, res) => {
  try {
    
    const { equipment, month, equipmentNum } = req.body;

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
      case "Overweight": dateField = "overweightDate"; break;
      default: dateField = "createdAt"; break;
    }

    if (month) {
      const [year, mon] = month.split("-");
      const monthIndex = parseInt(mon, 10) - 1; 

      const start = new Date(Date.UTC(year, monthIndex, 1));
      
      const end = new Date(Date.UTC(year, monthIndex + 1, 1));

      query[dateField] = { $gte: start, $lt: end };
    }

        if (equipmentNum && equipmentNum !== "All") {
      switch (equipment) {
        case "Shuttle": query.shuttleNum = equipmentNum; break;
        case "AGV": query.AGVnum = equipmentNum; break;
        case "RGV": query.rgvNum = equipmentNum; break;
        case "Lift": query.liftNum = equipmentNum; break;
      }
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

//--ROUTE GET: GET HISTORY PAGE--


app.get('/history', (req, res) => { 
  res.sendFile(path.join(__dirname, 'history.html'));
});


//--ROUTE GET: GET REPORT PAGE--


app.get('/report', (req,res) =>{
  res.sendFile(path.join(__dirname,'report.html'));
});

//--ROUTE GET: GET TASK PAGE--

app.get('/createtask', (req,res) => {
  res.sendFile(path.join(__dirname, 'createtask.html'));
});

//--ROUTE GET: GET_SHUTTLES PAGE JSON--

app.get('/get_shuttles', async (req,res) => {
  try { 

    const shudata = getmodel("shuttleList");

    const query = {};
    if (req.query.shuttleNum) {
      query.shuttleNum = req.query.shuttleNum; 
    }

    const shuttles = await shudata.find({}, {shuttleNum: 1, _id: 0}).lean();

    res.json(shuttles);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve Data.");
  }
});

//--ROUTE GET: GET_AGVS PAGE JSON--


app.get('/get_AGVS', async (req, res) => {

  try {
    const AGdata = getmodel("AGVList");
    const query = {};
    if (req.query.AGVnum) query.AGVnum = req.query.AGVnum;
    const AGshutles = await AGdata.find({}, {AGVnum: 1 , _id: 0}).lean();
    res.json(AGshutles);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve Data");
  }

});

//--ROUTE GET: GET RGVS PAGE JSON--

app.get('/get_RGVS', async (req, res) => {
  try {
    const RGVdata = getmodel("RGVlist"); 
    const query = {};
    if (req.query.rgvNum) query.rgvNum = req.query.rgvNum;
    const rgvs = await RGVdata.find({}, { rgvNum: 1, _id: 0 }).lean();
    res.json(rgvs);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve RGV Data");
  }
});

//--ROUTE GET: GET_LIFTS PAGE JSON--

app.get('/get_LIFTS', async (req, res) => {
  try {
    const Liftdata = getmodel("LiftList"); 
    const query = {};
    if (req.query.liftNum) query.liftNum = req.query.liftNum;
    const lifts = await Liftdata.find({}, { liftNum: 1, _id: 0 }).lean();
    res.json(lifts);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to Retrieve Lift Data");
  }
});


//--ROUTE POST: INSERT MESSAGE TO DATABASE--


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

    res.redirect('/createtask');

  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).send("Failed to save message");
  }
});


//--ROUTE GET: GET MESSAGES FROM DATA BASE--


app.get('/get-messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(4).lean();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Failed to fetch messages");
  }
});


//--ROUTE GET: GET SHUTTLE MONITORING PAGE--


app.get('/shuttles', (req, res) => {
  res.sendFile(path.join(__dirname, 'shuttle_stat.html'));
});


//--ROUTE GET: SHUTTLE DATA RETRIVAL FROM JSON SHUTTLE DATA--

app.get('/api/shuttles', (req, res) => {
  
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

//--ROUTE GET: GET CONTENT OF SHUTTLE LINKS JSON.--

app.get('/api/shuttlelinkdata', (req, res) => {
  fs.readFile(shuttleLinkPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error retrieving JSON data of Links:', err);
      return res.status(500).json({ error: 'Failed to retrieve data!' });
    }

    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData); // <- now sends data correctly
    } catch (parseErr) {
      console.error('Error parsing shuttle links JSON:', parseErr);
      res.status(500).json({ error: 'Invalid JSON format!' });
    }
  });
});


//--ROUTE DELETE: DELETE MESSAGE AS AKNOLOEDGMEN BUTTON PRESSED.--


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

//--ROUTE GET: MOST REPEATABLE ISSUES--

app.get('/top-issues', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const start = new Date(Date.UTC(currentYear, 0, 1));
    const end = new Date(Date.UTC(currentYear + 1, 0, 1));

    const collections = ['Shuttle', 'AGV', 'RGV', 'Lift'];
    const results = {};

    for (const type of collections) {
      const Model = getmodel(type);
      let groupField = '';

      switch (type) {
        case 'Shuttle': groupField = '$shuttleNum'; break;
        case 'AGV': groupField = '$agvNum'; break;
        case 'RGV': groupField = '$rgvNum'; break;
        case 'Lift': groupField = '$liftNum'; break;
      }

      let dateField = '';
      switch (type) {
        case 'Shuttle': dateField = 'date'; break;
        case 'AGV': dateField = 'agvDate'; break;
        case 'RGV': dateField = 'rgvDate'; break;
        case 'Lift': dateField = 'liftDate'; break;
      }

      const data = await Model.aggregate([
        { $match: { [dateField]: { $gte: start, $lt: end } } },
        { $group: { _id: groupField, totalIssues: { $sum: 1 } } },
        { $sort: { totalIssues: -1 } },
        { $limit: 10 }
      ]);

      results[type] = data;
    }

    res.json(results);
  } catch (err) {
    console.error('Error loading top issues:', err);
    res.status(500).send('Failed to load top issues');
  }
});


//--APPLICACTION EXEC--

updateShuttleData()

//--SERVER PORT LISTENING--

app.listen(port, () => {
  console.log("Server Running on 3000");
});

