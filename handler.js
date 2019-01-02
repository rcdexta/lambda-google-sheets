const fs = require('fs');
const pgClient = require('./pgClient')
const readline = require('readline');
const {google} = require('googleapis');
const config = require('./config.json')
const { promisify } = require('es6-promisify');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

let dbClient;

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  const token = fs.readFileSync(TOKEN_PATH)
  if (!token) return getNewToken(oAuth2Client, callback)
  oAuth2Client.setCredentials(JSON.parse(token))

  console.log('OAuth Authentication successful!')
  await callback(oAuth2Client)
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function processTables(auth) {
  console.log(`processDataconfig started!`);
  dbClient = await pgClient.init();
  console.log('Initialised Postgress Client');
    for (const task of config.tables) {
      console.log(`Processing table and sheet: ${task.tableName} ${task.sheetName}`)
      await queryDatabase(auth, config.spreadsheetId, task.tableName, task.sheetName)    
    }
}

async function lambdaCheckIn(auth, spreadsheetId) {
  const resource = {
    values: [['LastTriggeredAt:', new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})]]
  }
  await upsertSheet(auth, spreadsheetId, resource, 'RunLog')
}

async function queryDatabase(auth, spreadsheetId, tableName, sheetName) {
  let sData = [];
  const data = await dbClient.query(`select * from ${tableName}`);    
  
  sData.push(Object.keys(data.rows[0]));
  for (let i = 0; i < data.rows.length; i++) {
    sData.push(Object.values(data.rows[i]));
  }
  const resource = {
    values: sData
  };

  console.log(`[${sheetName}] Rows from Redshift: ${sData.length}`);
  await upsertSheet(auth, spreadsheetId, resource, sheetName);    
}

async function upsertSheet(auth, spreadsheetId, resource, sheetName) {
  const sheets = google.sheets({ version: "v4", auth });
  const range = sheetName;

  const getValues = promisify(sheets.spreadsheets.values.get);

  const res = await getValues({
    spreadsheetId: spreadsheetId,
    range: range
  }) 

  if (res) {
    await writeToSheet(sheets, range, spreadsheetId, resource, sheetName);
  } else {
    console.log(`Sheet: ${sheetName} not found. Creating sheet!`);
    const batchUpdate = promisify(sheets.spreadsheets.batchUpdate);
    await batchUpdate(
      {
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
      }
    )
  }
}

async function writeToSheet(sheets, range, spreadsheetId, resource, sheetName, retryCount = 0) {
  const valueInputOption = "RAW";

  const spreadSheetClear = promisify(sheets.spreadsheets.values.clear);

  await spreadSheetClear({
    spreadsheetId,
    range
  });

  const updateSheet = promisify(sheets.spreadsheets.values.update)

  const res = await updateSheet({
    spreadsheetId,
    range,
    valueInputOption,
    resource
  })

  console.log(`[${sheetName}] Rows updated to sheet: ${res.data.updatedRows}`);
}

module.exports.run = async (event, context) => {
  console.log('Google Lambda-Sheets handler triggered')

  try {
    // Load client secrets from a local file.
    const content = fs.readFileSync('credentials.json')
    if (!content) return console.log('Error loading client secret file')
    // Authorize a client with credentials, then call the Google Sheets API.  
    await authorize(JSON.parse(content), processTables)
  } catch (e) {
    console.log(e)
  }
  
  console.log("Google Lambda-Sheets handler ended");
};