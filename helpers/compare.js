const path = require('path');
const zlib = require('zlib');
const fse = require('fs-extra');
const { diffString } = require('json-diff');

/**
 * Recursively compares two local folders, their structure, and file sizes.
 * @param {string} baselineDir Path to the 1st compared folder.
 * @param {string} currentDir Path to the 2nd compared folder.
 * @throws exception describing differences if there are any.
 */
function compareFolders(baselineDir, currentDir) {
    let differences = [];
    function _compare(aDir, bDir) {
        const nameToEntriesMap = {};
        for (const aEntry of fse.readdirSync(aDir, { withFileTypes: true })) {
            nameToEntriesMap[aEntry.name] = nameToEntriesMap[aEntry.name] || { a: null, b: null };
            nameToEntriesMap[aEntry.name].a = aEntry;
        }
        for (const bEntry of fse.readdirSync(bDir, { withFileTypes: true })) {
            nameToEntriesMap[bEntry.name] = nameToEntriesMap[bEntry.name] || { a: null, b: null };
            nameToEntriesMap[bEntry.name].b = bEntry;
        }
        for (const name of Object.keys(nameToEntriesMap)) {
            const { a, b } = nameToEntriesMap[name];
            if (a === null) {
                differences.push(`Entry ${b.name} added`);
            } else if (b === null) {
                differences.push(`Entry ${a.name} removed`);
            } else {
                if (a.isDirectory() && b.isDirectory()) {
                    _compare(path.join(aDir, a.name), path.join(bDir, b.name));
                } else if (a.isFile() && a.isFile()) {
                    const aStat = fse.statSync(path.join(aDir, a.name));
                    const bStat = fse.statSync(path.join(bDir, b.name));
                    if (aStat.size !== bStat.size) {
                        differences.push(`Entries ${a.name} and ${b.name} are of different size`);
                    }
                } else {
                    differences.push(`Entries ${a.name} and ${b.name} are of different type`);
                }
            }
        }
    }
    _compare(baselineDir, currentDir);
    if (differences.length > 0) {
        throw new Error('Compared folder structures not equal:\n' + differences.join('\n'));
    }
}

/**
 * Recursively compares structure of JavaScript objects.
 * Note: this comparison can be computationally expensive; if you don't need exact details
 * on which properties are different, consider simply comparing the objects as stringified JSONs.
 * @param {object} baselineObj 1st compared object.
 * @param {object} currentObj 2nd compared object.
 * @throws exception describing differences if there are any.
 */
function compareObjects(baselineObj, currentObj) {
    const result = diffString(baselineObj, currentObj);
    if (result) {
        throw new Error('Compared objects not equal:\n' + result);
    }
}

/**
 * Compares property databases stored in 'objects_*.json.gz' files.
 * @param {string} baselineDir Path to 1st folder containing the 'objects_*.json.gz' files.
 * @param {string} currentDir Path to 2nd folder containing the 'objects_*.json.gz' files.
 * @throws exception describing differences if there are any.
 */
function compareProperties(baselineDir, currentDir) {
    function parse(filename) {
        const archive = fse.readFileSync(filename);
        const content = zlib.gunzipSync(archive).toString();
        return JSON.parse(content);
    }

    const propertyDbAssets = [
        'objects_attrs.json.gz',
        'objects_avs.json.gz',
        'objects_ids.json.gz',
        'objects_offs.json.gz',
        'objects_vals.json.gz'
    ];
    for (const propDbAsset of propertyDbAssets) {
        const baselineAsset = parse(path.join(baselineDir, propDbAsset));
        const currentAsset = parse(path.join(currentDir, propDbAsset));
        compareObjects(baselineAsset, currentAsset);
    }
}

module.exports = {
    compareFolders,
    compareObjects,
    compareProperties
};
