const chalk = require('chalk');
const figlet = require('figlet');

const displayWatermark = () => {
    console.log(chalk.cyan(figlet.textSync('ForuAI Bot', { horizontalLayout: 'full' })));
    console.log(chalk.yellow('Created by: ') + chalk.green('t.me/slyntherinnn'));
    console.log(chalk.yellow('==================================================\n'));
};

const logInfo = (message) => console.log(chalk.blue('[INFO] ') + message);
const logSuccess = (message) => console.log(chalk.green('[SUCCESS] ') + message);
const logWarning = (message) => console.log(chalk.yellow('[WARNING] ') + message);
const logError = (message) => console.log(chalk.red('[ERROR] ') + message);

const displaySessionSummary = (totalPoints, successCount, failureCount) => {
    console.log(chalk.yellow('\n========== Session Summary =========='));
    console.log(chalk.cyan(`Total points earned: ${totalPoints}`));
    console.log(chalk.green(`Success: ${successCount}`) + chalk.white(' | ') + chalk.red(`Failure: ${failureCount}`));
};

module.exports = {
    displayWatermark,
    logInfo,
    logSuccess,
    logWarning,
    logError,
    displaySessionSummary
};