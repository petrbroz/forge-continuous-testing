const fse = require('fs-extra');
const { exec } = require('child_process');

const config = require('../config');

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
