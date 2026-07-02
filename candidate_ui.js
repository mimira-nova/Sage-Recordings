/**
 * Run this using: SAGE_IP=your_ip SAGE_USER=your_user SAGE_PASS=your_pass node candidate_ui.js
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SAGE_IP = process.env.SAGE_IP || '0.0.0.0';
const SAGE_PORT = '8080';
const SAGE_USER = process.env.SAGE_USER || 'admin';
const SAGE_PASS = process.env.SAGE_PASS || 'password';
const BASE_URL = `http://${SAGE_IP}:${SAGE_PORT}/sagex/api`;

const auth = Buffer.from(`${SAGE_USER}:${SAGE_PASS}`).toString('base64');


const FILE_NAME = 'candidates_list.json';
const FILE_PATH = path.join(__dirname, FILE_NAME);
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let shouldRunScripts = false;

// Run helper function
function runScript(command) {
    return new Promise((resolve, reject) => {
        const child = exec(command, { stdio: 'inherit' });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed: ${command}`));
        });
    });
}

// Runs data collection/management files
async function start() {
    try {
        console.log('Starting parallel scripts...');

        // This is allowed because it is INSIDE an async function
        await Promise.all([
            runScript(`SAGE_USER=${SAGE_USER} SAGE_PASS=${SAGE_PASS} node recordings.js`),
            runScript(`SAGE_IP=${SAGE_IP} SAGE_USER=${SAGE_USER} SAGE_PASS=${SAGE_PASS} node airings.js`)
        ]);

        console.log('Running compare.js...');
        execSync(`node compare.js`, { stdio: 'inherit' });

    } catch (error) {
        console.error(error);
    }
}

// File Age Check & Execution Logic
try {
    if (fs.existsSync(FILE_PATH)) {
        const stats = fs.statSync(FILE_PATH);
        const fileAgeMs = Date.now() - stats.mtimeMs; // mtimeMs is the last modified time

        if (fileAgeMs > TWENTY_FOUR_HOURS_MS) {
            console.log(`${FILE_NAME} is older than 24 hours. Refreshing data...`);
            shouldRunScripts = true;
        } else {
            console.log(`${FILE_NAME} is up to date (less than 24 hours old).`);
        }
    } else {
        console.log(`${FILE_NAME} does not exist. Running scripts to generate it...`);
        shouldRunScripts = true;
    }
} catch (err) {
    console.error(`Error checking file status: ${err.message}`);
}

if (shouldRunScripts) {
    try {
        start();
    } catch (error) {
        console.error('An error occurred while executing the scripts:', error.message);
        process.exit(1);
    }
}



