const fs = require('fs');

const AIRINGS_FILE = 'airing_movies_cache.json';
const RECORDINGS_FILE = 'recorded_movies_cache.json';

function compareLibrary() {
    // Load files
    const airings = JSON.parse(fs.readFileSync(AIRINGS_FILE, 'utf8'));
    const recordings = JSON.parse(fs.readFileSync(RECORDINGS_FILE, 'utf8'));

    // 1. Map recorded ExternalIDs for fast lookup
    const recordedIds = new Set();
    recordings.forEach(rec => {
        const id = rec.Airing?.Show?.ShowExternalID;
        if (id) recordedIds.add(id);
    });

    const report = {
        alreadyOwned: [],
        newContent: []
    };

    // 2. Check airings against the recorded set
    airings.forEach(airing => {
        const id = airing.Show?.ShowExternalID;
        const title = airing.Show?.ShowTitle || airing.AiringTitle;

        if (recordedIds.has(id)) {
            report.alreadyOwned.push(title);
        } else {
            report.newContent.push({
                title: title,
                channel: airing.AiringChannelName,
                time: new Date(airing.AiringStartTime).toLocaleString()
            });
        }
    });

    // 3. Display summary
    console.log(`\n======================================`);
    console.log(`SAGE TV MOVIE COMPARISON`);
    console.log(`======================================`);
    console.log(`Total Upcoming:    ${airings.length}`);
    console.log(`Already Recorded:  ${report.alreadyOwned.length}`);
    console.log(`New to Library:    ${report.newContent.length}`);
    console.log(`--------------------------------------\n`);

    if (report.newContent.length > 0) {
        console.log(`TOP NEW MOVIES COMING UP:`);
        report.newContent.slice(0, 15).forEach(m => {
            console.log(`[ ] ${m.title.padEnd(30)} | ${m.channel.padEnd(8)} | ${m.time}`);
        });
    } else {
        console.log(`Everything airing in the next 7 days is already in your library!`);
    }
}

compareLibrary();