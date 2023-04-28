const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//app.use(express.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializingDBWithServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializingDBWithServer();

//User Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "SECRET_CODE");

      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//middleware Function

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRET_CODE", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//All states
app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `SELECT 
  state_id AS stateId,
  state_name AS stateName,
  population
  FROM state;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray);
});

//State By Id

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;

  const getStatesQuery = `SELECT 
   state_id AS stateId,
  state_name AS stateName,
  population
   FROM 
   state 
   WHERE 
   state_id = ${stateId};`;
  const state = await db.get(getStatesQuery);
  response.send(state);
});

//Adding New District
app.post("/districts/", authenticateToken, async (request, response) => {
  const data = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = data;
  console.log(stateId);
  const addDistrictQuery = `INSERT INTO 
      district(district_name,state_id,cases,cured,active,deaths)
     VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//District By Id

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const getStatesQuery = `SELECT 
    district_id AS districtId,
   district_name AS districtName,
  state_id AS stateId,
  cases,
  cured,
  active,
  deaths  
   FROM 
   district 
   WHERE 
   district_id = ${districtId};`;
    const state = await db.get(getStatesQuery);
    response.send(state);
  }
);

//Delete District By Id

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const getStatesQuery = `
    DELETE FROM 
    district 
    WHERE 
    district_id = ${districtId};`;
    await db.run(getStatesQuery);
    response.send("District Removed");
  }
);

//Update District By Id

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    console.log(districtId);
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    console.log(deaths);
    const getStatesQuery = `
    UPDATE district 
    SET 
     district_name = '${districtName}',
     state_id = ${stateId},
     cases = ${cases},
     cured = ${cured},
     active = ${active},
     deaths = ${deaths}
    WHERE 
    district_id = ${districtId};`;
    await db.run(getStatesQuery);
    response.send("District Details Updated");
  }
);

//State By Id

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;

    const { Lives } = request.body;
    console.log(request.body);

    const getStatesQuery = `SELECT 
   sum(cases) AS totalCases,
   sum(cured) AS totalCured,
   sum(active) AS totalActive,
   sum(deaths) AS totalDeaths
   FROM 
   district 
   WHERE 
   state_id = ${stateId};`;
    const state = await db.get(getStatesQuery);
    response.send(state);
  }
);

module.exports = app;
