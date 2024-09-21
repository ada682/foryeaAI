const readline = require('readline');
const axios = require('axios');
const dotenv = require('dotenv');
const { getHeaders } = require('./src/headers');
const { displayWatermark, logInfo, logSuccess, logWarning, logError, displaySessionSummary } = require('./src/display');

dotenv.config();

const tokens = process.env.TOKENS.split(','); 
let successCount = 0;
let failureCount = 0;
let totalPoints = 0;
let stopAutoTap = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function getInfo(token) {
    const url_info = 'https://api.foruai.io/v1/user/profile';
    const headers = getHeaders(token);

    try {
        const response = await axios.get(url_info, { headers });
        const data = response.data;

        if (data.code === 200) {
            const user = data.data || {};
            const infoString = `Name: ${user.name || 'N/A'} | Level: ${user.level || 0} | Playpass: ${user.playpass || 0} | Status: ${user.status || 0}`;
            logInfo(infoString);
            return { infoString, user };
        } else {
            logError(`Failed to fetch user data, code: ${data.code}`);
            return { infoString: null, user: null };
        }
    } catch (error) {
        logError(`An error occurred: ${error}`);
        return { infoString: null, user: null };
    }
}

async function executeClick(token) {
    if (stopAutoTap) return 0;
    const url_click = 'https://api.foruai.io/v1/shake/process';
    const headers = getHeaders(token);
    try {
        const response = await axios.post(url_click, {}, { headers });
        const data = response.data;
        if (data.code === 201) {
            successCount++;
            const pointsEarned = data.data.point_settle * 2;
            totalPoints += pointsEarned;
            return pointsEarned;
        } else if (data.message.includes("reached the limit")) {
            logWarning(`Reached tap limit: ${data.message}`);
            stopAutoTap = true; 
            return 0;
        } else {
            logWarning(`Unexpected response: ${data.message}`);
            return 0;
        }
    } catch (error) {
        failureCount++;
        return 0;
    }
}

async function clickBurst(token, duration = 10000) {
    const startTime = Date.now();
    let clickCount = 0;

    while (Date.now() - startTime < duration) {
        const clickPromises = [];
        const burstSize = getRandomInterval(50, 100); 

        for (let i = 0; i < burstSize; i++) {
            clickPromises.push(executeClick(token));
        }

        const results = await Promise.all(clickPromises);
        clickCount += results.filter(Boolean).length;

        await new Promise(r => setTimeout(r, getRandomInterval(50, 100)));
    }

    logSuccess(`Burst completed: ${clickCount} clicks in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
}

async function simulateHumanSession(token, sessionDuration = 300000) {
    const sessionStart = Date.now();
    
    while (Date.now() - sessionStart < sessionDuration) {
        await clickBurst(token, getRandomInterval(5000, 10000));
        
        const pauseDuration = getRandomInterval(1000, 3000);
        logInfo(`Pausing for ${(pauseDuration / 1000).toFixed(2)} seconds...`);
        await new Promise(r => setTimeout(r, pauseDuration));
    }
}

async function getPointAfterStop(token) {
    const url_point = 'https://api.foruai.io/v1/shake/point';
    const headers = getHeaders(token);

    try {
        const response = await axios.get(url_point, { headers, timeout: 10000 });
        const data = response.data;

        if (data.code === 200) {
            logInfo(`Point settle: ${data.data.point_settle} | Point pending: ${data.data.point_pending}`);
        } else {
            logWarning(`Failed to fetch points, code: ${data.code}`);
        }
    } catch (error) {
        logError(`An error occurred while getting points: ${error}`);
    }
}

async function simulateAccountSession(token) {
    logInfo(`Starting session for token: ${token.slice(0, 10)}...`); 
    try {
        const { user } = await getInfo(token);
        if (user) {
            while (true) {
                logInfo("\n========== Starting new session ==========");
                await simulateHumanSession(token); 

                displaySessionSummary(totalPoints, successCount, failureCount);

                await getPointAfterStop(token);

                successCount = 0;
                failureCount = 0;
                totalPoints = 0;

                const sessionPause = getRandomInterval(15000, 30000);
                logInfo(`Taking a break for ${(sessionPause / 1000).toFixed(2)} seconds before next session...`);
                await new Promise(r => setTimeout(r, sessionPause));
            }
        }
    } catch (error) {
        logError("Process stopped:", error);
    }
}

async function getUncompletedQuests(token) {
    const url = 'https://api.foruai.io/v2/missions/uncompleted'; 
    const headers = getHeaders(token);
    try {
        const response = await axios.get(url, { headers });

        logInfo(`Full API response: ${JSON.stringify(response.data, null, 2)}`);

        if (response.data && Array.isArray(response.data.data)) {
            const quests = response.data.data;

            logInfo(`All quests with statuses: ${quests.map(q => `ID: ${q.id}, Title: ${q.title}, Status: ${q.mission_status}`).join('\n')}`);

            const validQuests = quests.filter(q => q.mission_status === "0");

            if (validQuests.length > 0) {
                logInfo(`Eligible quests: ${JSON.stringify(validQuests, null, 2)}`);
                return validQuests;
            } else {
                logWarning("No quests available for claiming.");
                return [];
            }
        } else {
            logWarning("Unexpected data format from API. Full response: " + JSON.stringify(response.data, null, 2));
            return [];
        }
    } catch (error) {
        if (error.response) {
            logError(`[ERROR] Error fetching quests: ${error.response.status} - ${error.response.statusText}`);
            logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            logError(`[ERROR] No response received when fetching quests: ${JSON.stringify(error.request, null, 2)}`);
        } else {
            logError(`[ERROR] Error during request setup: ${error.message}`);
        }
        return [];
    }
}

async function claimBonusQuest(token, missionId) {
    const url = 'https://api.foruai.io/v1/missions/validate';

    const headers = {
        Authorization: `Bearer ${token}`,
        'x-foru-apikey': 'foru-private-aec4199767b805b22ce88a2399ea7730d998e5caff336fda19acb897cd9d47e2',
        'x-foru-signature': '680592cc5da460f47a610ac25281c3b498fa7d68446e056ac5c9bdbaae6500d1',
        'x-foru-timestamp': Date.now().toString(),  
        'Content-Type': 'application/json',
        Accept: '*/*',
    };

    const data = {
        mission_id: missionId,
        timestamp: Date.now().toString()  
    };

    try {
        const response = await axios.patch(url, data, { headers });
        if (response.data.code === 200) {
            logSuccess(`Bonus quest claimed: ${JSON.stringify(response.data)}`);
        } else {
            logError(`[ERROR] Failed to claim bonus quest: ${response.data.message || JSON.stringify(response.data)}`);
        }
    } catch (error) {
        if (error.response) {
            logError(`[ERROR] Error claiming bonus quest: ${error.response.status} - ${error.response.statusText}`);
            logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            logError(`[ERROR] No response received: ${JSON.stringify(error.request, null, 2)}`);
        } else {
            logError(`[ERROR] Error during request setup: ${error.message}`);
        }
    }
}


async function clearAllTasks(token) {
    logInfo("Clearing all tasks...");
    const uncompletedQuests = await getUncompletedQuests(token);

    for (const quest of uncompletedQuests) {
        await claimBonusQuest(token, quest.id);
    }
}

async function askAutoTaskChoice(token) {
    return new Promise((resolve) => {
        rl.question("Choose action: 1. Auto Tap 2. Clear All Tasks\n", (choice) => {
            resolve(choice);
        });
    });
}

async function main() {
    displayWatermark();

    for (const token of tokens) {
        const choice = await askAutoTaskChoice(token);
        if (choice == 1) {
            await simulateAccountSession(token);
        } else if (choice == 2) {
            await clearAllTasks(token);
        } else {
            logError("Invalid choice.");
        }
    }

    rl.close(); 
}

main();
