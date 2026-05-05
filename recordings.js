/**
 * Practice: SageTV API Interaction via index.js (with Auth)
 * Run this using: SAGE_USER=your_user SAGE_PASS=your_pass node recordings.js
 */

const fs = require('fs');

const SAGE_IP = process.env.SAGE_IP || '0.0.0.0';
const SAGE_PORT = '8080';
const SAGE_USER = process.env.SAGE_USER || 'admin';
const SAGE_PASS = process.env.SAGE_PASS || 'password';
const BASE_URL = `http://${SAGE_IP}:${SAGE_PORT}/sagex/api`;

const MOVIE_CACHE = 'recorded_movies_cache.json';

async function cacheRecordedMovies() {
    const auth = Buffer.from(`${SAGE_USER}:${SAGE_PASS}`).toString('base64');
    let allMovies = [];
    let page = 0;
    const pageSize = 100;
    let keepFetching = true;

    console.log("--- Scanning Library for Recorded Movies ---");

    while (keepFetching) {
        const params = new URLSearchParams({
            c: 'GetMediaFiles',
            arg0: 'MV', // 'MV' stands for Movies (Works better than 'T' for this)
            start: page * pageSize,
            size: pageSize,
            encoder: 'json',
        });

        try {
            const response = await fetch(`${BASE_URL}?${params.toString()}`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'X-SageX-Serialize': 'All' // Tells Sage to include Show/Airing details
                }
            });

            const data = await response.json();
            const batch = data.Result || [];

            if (batch.length === 0) {
                keepFetching = false;
            } else {
                // More aggressive check for the Movie tag
                const moviesInBatch = batch.filter(file => {
                    const isMovie = file.IsMovie === true ||
                        (file.Show && file.Show.IsMovie === true) ||
                        (file.Airing && file.Airing.Show && file.Airing.Show.IsMovie === true);
                    return isMovie;
                });

                allMovies = allMovies.concat(moviesInBatch);
                console.log(`Page ${page + 1}: Found ${moviesInBatch.length} movies out of ${batch.length} items.`);
                page++;
            }
        } catch (error) {
            console.error(`Error on page ${page}:`, error.message);
            keepFetching = false;
        }
    }

    fs.writeFileSync(MOVIE_CACHE, JSON.stringify(allMovies, null, 2));

    console.log(`\n--- Done! ---`);
    console.log(`Total Movies Cached: ${allMovies.length}`);
}

cacheRecordedMovies();