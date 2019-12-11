const fse = require('fs-extra');
const { exec } = require('child_process');

const config = require('../config');

/**
 * Downloads and extracts baseline data for specific test to local folder.
 * @async
 * @param {string} testName Name of the test that was used to store the baseline data in remote storage.
 * @param {string} destDir Local folder path where the baseline should be extracted.
 * @returns {Promise} promise that resolves after the baseline data has been downloaded and extracted.
 */
function downloadBaseline(testName, destDir) {
    fse.ensureDirSync(destDir);
    const cmd = `aws s3 cp s3://${config.aws.s3_bucket}/baselines/${testName}.tar.gz - | tar xzf -`;
    const env = {
        PATH: process.env.PATH,
        AWS_ACCESS_KEY_ID: config.aws.access_key_id,
        AWS_SECRET_ACCESS_KEY: config.aws.secret_access_key,
        AWS_DEFAULT_REGION: config.aws.default_region
    };
    return new Promise(function (resolve, reject) {
        exec(cmd, { cwd: destDir, env }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

/**
 * Packs and uploads new baseline data to remote storage.
 * @async
 * @param {string} testName Name of the test to be used in the remote storage.
 * @param {string} srcDir Local folder path where the baseline should be taken from.
 * @returns {Promise} promise that resolves after the baseline data has been uploaded.
*/
function uploadBaseline(testName, srcDir) {
    const cmd = `tar czf - . | aws s3 cp - s3://${config.aws.s3_bucket}/baselines/${testName}.tar.gz`;
    const env = {
        PATH: process.env.PATH,
        AWS_ACCESS_KEY_ID: config.aws.access_key_id,
        AWS_SECRET_ACCESS_KEY: config.aws.secret_access_key,
        AWS_DEFAULT_REGION: config.aws.default_region,
    };
    return new Promise(function (resolve, reject) {
        exec(cmd, { cwd: srcDir, env }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

module.exports = {
    downloadBaseline,
    uploadBaseline
};
