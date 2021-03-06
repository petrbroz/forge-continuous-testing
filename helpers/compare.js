const path = require('path');
const zlib = require('zlib');
const fse = require('fs-extra');
const { SvfReader } = require('forge-convert-utils');
const { diffString } = require('json-diff');
const jimp = require('jimp');
const pixelmatch = require('pixelmatch');

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
 * Compares two images on local filesystem (supported formats: jpeg, png, bmp, tiff, gif).
 * @param {string} baselineImgPath Filepath of 1st compared image.
 * @param {string} currentImgPath Filepath of 2nd compared image.
 * @param {number} [threshold=0.1] Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0.1 by default.
 * @throws exception describing differences if there are any.
 */
async function compareImages(baselineImgPath, currentImgPath, threshold = 0.1) {
    const baselineImg = await jimp.read(baselineImgPath);
    const currentImg = await jimp.read(currentImgPath);
    if (baselineImg.getWidth() !== currentImg.getWidth() || baselineImg.getHeight() !== currentImg.getHeight()) {
        throw new Error(`Compared images (${baselineImgPath}) have different dimensions.`);
    }
    const width = baselineImg.getWidth();
    const height = baselineImg.getHeight();
    const baselineImgData = baselineImg.bitmap.data;
    const currentImgData = currentImg.bitmap.data;
    const mismatchedPixels = pixelmatch(baselineImgData, currentImgData, null, width, height, { threshold });
    if (mismatchedPixels > 0) {
        throw new Error(`Compared images (${baselineImgPath}) differ in ${mismatchedPixels} pixels.`);
    }
}

/**
 * Compares SVF textures (supported formats: jpeg, png, bmp, tiff, gif).
 * @param {SvfReader} baselineSvfReader Reader of 1st compared SVF file.
 * @param {string} baselineDir Base folder path for assets of 1st compared SVF.
 * @param {SvfReader} currentSvfReader Reader of 2nd compared SVF file.
 * @param {string} currentDir Base folder path for assets of 2nd compared SVF.
 * @throws exception describing differences if there are any.
 */
async function compareTextures(baselineSvfReader, baselineDir, currentSvfReader, currentDir, threshold = 0.1) {
    const baselineImgUris = baselineSvfReader.listImages();
    const currentImgUris = currentSvfReader.listImages();
    compareObjects(baselineImgUris, currentImgUris);
    for (const imgUri of baselineImgUris) {
        await compareImages(path.join(baselineDir, imgUri), path.join(currentDir, imgUri), threshold);
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

/**
 * Compares SVF fragments.
 * @param {SvfReader} baselineSvfReader Reader of 1st compared SVF file.
 * @param {SvfReader} currentSvfReader Reader of 2nd compared SVF file.
 * @throws exception describing differences if there are any.
 */
async function compareFragments(baselineSvfReader, currentSvfReader) {
    const baselineFragments = await baselineSvfReader.readFragments();
    const currentFragments = await currentSvfReader.readFragments();
    if (baselineFragments.length !== currentFragments.length) {
        throw new Error('Different number of fragments in compared SVFs.');
    }
    for (let i = 0, len = baselineFragments.length; i < len; i++) {
        const baselineFragment = baselineFragments[i];
        const currentFragment = currentFragments[i];
        if (baselineFragment.dbID !== currentFragment.dbID) {
            throw new Error(`Compared fragments ${i} point to different dbIDs.`);
        }
        if (baselineFragment.geometryID !== currentFragment.geometryID) {
            throw new Error(`Compared fragments ${i} point to different geometry IDs.`);
        }
        if (baselineFragment.materialID !== currentFragment.materialID) {
            throw new Error(`Compared fragments ${i} point to different material IDs.`);
        }
    }
}

/**
 * Compares SVF materials.
 * @param {SvfReader} baselineSvfReader Reader of 1st compared SVF file.
 * @param {SvfReader} currentSvfReader Reader of 2nd compared SVF file.
 * @throws exception describing differences if there are any.
 */
async function compareMaterials(baselineSvfReader, currentSvfReader) {
    const baselineMaterials = await baselineSvfReader.readMaterials();
    const currentMaterials = await currentSvfReader.readMaterials();
    if (baselineMaterials.length !== currentMaterials.length) {
        throw new Error('Different number of materials in compared SVFs.');
    }
    for (let i = 0, len = baselineMaterials.length; i < len; i++) {
        const baselineMaterial = baselineMaterials[i];
        const currentMaterial = currentMaterials[i];
        compareObjects(baselineMaterial, currentMaterial);
    }
}

/**
 * Compares SVF geometry metadata.
 * @param {SvfReader} baselineSvfReader Reader of 1st compared SVF file.
 * @param {SvfReader} currentSvfReader Reader of 2nd compared SVF file.
 * @throws exception describing differences if there are any.
 */
async function compareGeometryMetadata(baselineSvfReader, currentSvfReader) {
    const baselineGeometryMetadata = await baselineSvfReader.readGeometries();
    const currentGeometryMetadata = await currentSvfReader.readGeometries();
    if (baselineGeometryMetadata.length !== currentGeometryMetadata.length) {
        throw new Error('Different number of geometry metadata in compared SVFs.');
    }
    for (let i = 0, len = baselineGeometryMetadata.length; i < len; i++) {
        compareObjects(baselineGeometryMetadata[i], currentGeometryMetadata[i]);
    }
}

module.exports = {
    compareFolders,
    compareObjects,
    compareImages,
    compareTextures,
    compareProperties,
    compareFragments,
    compareMaterials,
    compareGeometryMetadata
};
