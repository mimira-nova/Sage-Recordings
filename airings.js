/**
 * Run this using: SAGE_IP=your_ip SAGE_USER=your_user SAGE_PASS=your_pass node airings.js
 */

const fs = require('fs'); // Added for file saving

const SAGE_IP = process.env.SAGE_IP || '0.0.0.0';
const SAGE_PORT = '8080';
const SAGE_USER = process.env.SAGE_USER || 'admin';
const SAGE_PASS = process.env.SAGE_PASS || 'password';
const BASE_URL = `http://${SAGE_IP}:${SAGE_PORT}/sagex/api`;

const CACHE_FILE = 'airing_movies_cache.json';

async function getFutureMovies() {

    // FETCH FROM SAGE IF NO CACHE
    const auth = Buffer.from(`${SAGE_USER}:${SAGE_PASS}`).toString('base64');
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    let allMovies = [];

    for (let i = 0; i < 7; i++) {
        const startTime = now + (i * ONE_DAY_MS);
        const endTime = startTime + ONE_DAY_MS;
        console.log(`Checking Day ${i + 1} for movies...`);

        const params = new URLSearchParams({
            c: 'GetAiringsOnViewableChannelsAtTime',
            1: startTime,
            2: endTime,
            3: 'false',
            encoder: 'json',
            size: 10000,
        });

        try {
            const response = await fetch(`${BASE_URL}?${params.toString()}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const data = await response.json();
            const dayAirings = data.Result || [];

            const moviesToday = dayAirings.filter(airing =>
                airing.Show && airing.Show.IsMovie === true
            );

            allMovies = allMovies.concat(moviesToday);
        } catch (error) {
            console.error(`Error on Day ${i + 1}:`, error.message);
        }
    }

    const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.AiringID, m])).values());

    // --- 3. SAVE TO LOCAL STORAGE ---
    console.log(`Saving ${uniqueMovies.length} movies to ${CACHE_FILE}...`);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(uniqueMovies, null, 2));
}

getFutureMovies();