/**
 * Run this using: SAGE_IP=your_ip SAGE_USER=your_user SAGE_PASS=your_pass node main.js
 */

const SAGE_IP = process.env.SAGE_IP || '0.0.0.0';
const SAGE_PORT = '8080';
const SAGE_USER = process.env.SAGE_USER || 'admin';
const SAGE_PASS = process.env.SAGE_PASS || 'password';

const BASE_URL = `http://${SAGE_IP}:${SAGE_PORT}/sagex/api`;

async function getFutureMovies() {
    const auth = Buffer.from(`${SAGE_USER}:${SAGE_PASS}`).toString('base64');
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    let allMovies = []; // To store the movie objects
    let movieCount = 0;

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

            // FILTER LOGIC: Check the nested Show.IsMovie property
            const moviesToday = dayAirings.filter(airing =>
                airing.Show && airing.Show.IsMovie === true
            );

            allMovies = allMovies.concat(moviesToday);
            movieCount += moviesToday.length;

            console.log(`Found ${moviesToday.length} movies out of ${dayAirings.length} total airings.`);

        } catch (error) {
            console.error(`Error on Day ${i + 1}:`, error.message);
        }
    }

    // Deduplicate (Movies often air multiple times a week)
    const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.AiringID, m])).values());

    console.log(`\n--- Final Results ---`);
    console.log(`Total Movie Airings: ${movieCount}`);
    console.log(`Unique Movies Found: ${uniqueMovies.length}`);

    uniqueMovies.forEach((movie, index) => {
        console.log(`${index + 1}. ${movie.AiringTitle} (${movie.Show.ShowYear || 'N/A'})`);
        console.log(`   Genre: ${movie.Show.ShowCategoriesString}`);
        console.log(`   Time: ${new Date(parseInt(movie.AiringStartTime)).toLocaleString()}`);
    });
}

getFutureMovies();