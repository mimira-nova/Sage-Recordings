/**
 * Run this using: node compare.js (run other .js files to get data)
 */

const fs = require('fs');

const AIRINGS_FILE = 'airing_movies_cache.json';
const RECORDINGS_FILE = 'recorded_movies_cache.json';

const CANDIDATES_CACHE = 'candidates_list.json'

// Configuration: Lower number = Higher priority (1 is best, 4 is "not on list")
const CHANNEL_PRIORITIES = {
    "1": ["895", "896", "865", "866", "869", "870", "868", "867", "873", "874", "730", "885", "887"],
    "2": ["908", "909", "905", "904", "906", "907", "899", "901", "903", "902", "911", "910"],
    "3": ["731", "689", "690", "780", "781", "696", "699", "553", "732", "691", "734", "786", "554", "735", "552", "551", "550", "20-1", "50-1", "26-1", "7-1", "4-1", "5-1", "9-1"]
};

// Helper to determine rank. Returns 4 if the channel isn't in your priority list.
function getPriority(channel) {
    const chanStr = String(channel);
    for (const [priority, list] of Object.entries(CHANNEL_PRIORITIES)) {
        if (list.includes(chanStr)) return parseInt(priority);
    }
    return 4;
}


function compareLibrary() {
    const airingsData = JSON.parse(fs.readFileSync(AIRINGS_FILE, 'utf8'));
    const recordings = JSON.parse(fs.readFileSync(RECORDINGS_FILE, 'utf8'));

    // 1. Map recorded ExternalIDs to their priority rank
    const recordedLibrary = {};
    recordings.forEach(rec => {
        const id = rec.Airing.Show.ShowExternalID;
        const chan = rec.Airing.AiringChannelNumber;
        if (id) {
            const priority = getPriority(chan);
            if (!recordedLibrary[id] || priority < recordedLibrary[id].priority) {
                recordedLibrary[id] = { channel: chan, priority: priority };
            }
        }
    });

    // 2. Consolidate upcoming airings
    // This ensures if a movie is on twice, we only pick the best instance.
    const bestUpcomingAirings = {};
    airingsData.forEach(airing => {
        const id = airing.Show.ShowExternalID;
        const chan = airing.Channel.ChannelNumber;
        const priority = getPriority(chan);

        if (id) {
            if (!bestUpcomingAirings[id] || priority < bestUpcomingAirings[id].priority) {
                bestUpcomingAirings[id] = {
                    ...airing,
                    priority: priority // Attach priority for easier comparison later
                };
            }
        }
    });

    const report = { alreadyOwned: [], newContent: [], upgrades: [] };

    // 3. Check the consolidated "best" airings against the library
    Object.values(bestUpcomingAirings).forEach(airing => {
        const externalId = airing.Show.ShowExternalID;
        const airingId = airing.AiringID;
        const title = airing.AiringTitle;
        const currentAiringChan = airing.AiringChannelNumber;
        const currentAiringName = airing.Channel.ChannelName;
        const currentPriority = airing.priority;
        const time = new Date(airing.AiringStartTime).toLocaleString();

        const existingRecord = recordedLibrary[externalId];

        if (!existingRecord) {
            // Case A: Don't have it at all
            report.newContent.push({
                title, externalId, airingId, currentAiringChan, currentAiringName, time, reason: "New"
            });
        } else if (currentPriority < existingRecord.priority) {
            // Case B: Have it, but this is an upgrade
            report.newContent.push({
                title, externalId, airingId, currentAiringChan, currentAiringName, time,
                reason: `Upgrade (Group ${currentPriority} vs Group ${existingRecord.priority})`
            });
            report.upgrades.push(`${title} (Better quality available)`);
        } else {
            // Case C: Already owned at equal or better quality
            report.alreadyOwned.push(title);
        }
    });

    // Sort the list using time of recording
    report.newContent.sort((a, b) => new Date(a.time) - new Date(b.time));

    // 4. Display summary
    console.log(`\n======================================`);
    console.log(`SAGE TV MOVIE COMPARISON`);
    console.log(`======================================`);

    // airingsData.length is the total rows in the JSON
    // Object.keys(bestUpcomingAirings).length is the number of unique movies
    console.log(`Total Airings Found: ${airingsData.length}`);
    console.log(`Unique Movies:       ${Object.keys(bestUpcomingAirings).length}`);
    console.log(`Already Recorded:    ${report.alreadyOwned.length}`);
    console.log(`New/Upgrades:        ${report.newContent.length} (${report.upgrades.length} upgrades)`);
    console.log(`--------------------------------------\n`);

    if (report.newContent.length > 0) {
        console.log(`TOP PICKS & UPGRADES (Best instances selected):`);
        report.newContent.forEach(m => {
            const tag = m.reason.startsWith("Upgrade") ? "[↑]" : "[ ]";
            // Get the priority group for the display
            const group = getPriority(m.currentAiringChan);
            // Outputting Title, AiringID, Channel, and Reason
            console.log(
                `${tag.padEnd(4)} ` +
                `${m.title.substring(0, 24).padEnd(25)} | ` +
                `${String(m.airingId).padEnd(12)} | ` +
                `${String(m.currentAiringChan).padEnd(6)} | ` +
                `${String(m.currentAiringName).padEnd(10)} | ` +
                `Grp ${group}: ${m.reason}`
            );
        });
    } else {
        console.log("No new movies or upgrades found.");
    }

    // SAVE TO LOCAL STORAGE 
    console.log(`Saving ${report.newContent.length} movies to ${CANDIDATES_CACHE}...`);
    fs.writeFileSync(CANDIDATES_CACHE, JSON.stringify(report.newContent, null, 2));
}

compareLibrary();