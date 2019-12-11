const path = require('path');
const zlib = require('zlib');
const fse = require('fs-extra');
const { diffString } = require('json-diff');

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

function compareObjects(baseline, current) {
    const result = diffString(baseline, current);
    if (result) {
        throw new Error('Compared objects not equal:\n' + result);
    }
}

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
