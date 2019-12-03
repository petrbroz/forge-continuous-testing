const path = require('path');
const fse = require('fs-extra');
const debug = require('debug')('test:debug');
const { DataManagementClient, ModelDerivativeClient, ManifestHelper, urnify } = require('forge-server-utils');
const { SvfReader } = require('forge-convert-utils');
const { downloadBaseline, uploadBaseline } = require('../../helpers/baseline');
const { compareFolders } = require('../../helpers/compare');

const config = require('../../config');

const ForgeCredentials = { client_id: config.forge.client_id, client_secret: config.forge.client_secret };
const dataManagementClient = new DataManagementClient(ForgeCredentials);
const modelDerivativeClient = new ModelDerivativeClient(ForgeCredentials);

async function extract(bucketKey, objectKey, outputDir) {
    fse.ensureDirSync(outputDir);
    // Getting object details
    debug(`Retrieving object details`);
    const object = await dataManagementClient.getObjectDetails(bucketKey, objectKey);
    const urn = urnify(object.objectId);
    const urnDir = path.join(outputDir, urn);
    fse.ensureDirSync(urnDir);
    // Download derivative manifest
    debug(`Extracting manifest`);
    const manifest = await modelDerivativeClient.getManifest(urn);
    fse.writeJsonSync(path.join(urnDir, 'manifest.json'), manifest);
    // Download all SVFs
    const helper = new ManifestHelper(manifest);
    const graphicsDerivatives = helper.search({ type: 'resource', role: 'graphics' });
    for (const derivative of graphicsDerivatives.filter(derivative => derivative.mime === 'application/autodesk-svf')) {
        debug(`Extracting viewable ${derivative.guid}`);
        const viewableDir = path.join(urnDir, derivative.guid);
        fse.ensureDirSync(viewableDir);
        const svf = await modelDerivativeClient.getDerivative(urn, derivative.urn);
        fse.writeFileSync(path.join(viewableDir, 'output.svf'), svf);
        const reader = await SvfReader.FromDerivativeService(urn, derivative.guid, ForgeCredentials);
        const manifest = await reader.getManifest();
        for (const asset of manifest.assets) {
            if (!asset.URI.startsWith('embed:')) {
                debug(`Extracting asset ${asset.id}`);
                const assetData = await reader.getAsset(asset.URI);
                const assetPath = path.join(viewableDir, asset.URI);
                fse.ensureDirSync(path.dirname(assetPath));
                fse.writeFileSync(assetPath, assetData);
            } else {
                debug(`Skipping embedded asset ${asset.id}`);
            }
        }
    }
}

async function compare(baselineDir, currentDir) {
    const differences = compareFolders(baselineDir, currentDir);
    if (differences.length > 0) {
        debug(`Found ${differences.length} differences`);
        for (const diff of differences) {
            debug(diff);
        }
        throw new Error('Derivatives not equal');
    }
}

async function run(bucketKey, objectKey, updateBaseline) {
    try {
        const testName = 'model-derivative/basic/' + bucketKey + '/' + objectKey;
        const baselineDir = path.join(process.cwd(), testName, 'baseline');
        const currentDir = path.join(process.cwd(), testName, 'current');
        debug('Downloading baseline');
        await downloadBaseline(testName, baselineDir);
        debug('Extracting derivatives');
        await extract(bucketKey, objectKey, currentDir);
        debug('Comparing derivatives against baseline');
        await compare(baselineDir, currentDir);
        if (updateBaseline) {
            debug('Updating baseline');
            await uploadBaseline(testName, currentDir);
        }
        debug('Done!');
    } catch (err) {
        debug(err.isAxiosError ? err.response.data : err);
        process.exit(1);
    }
}

run(process.argv[2], process.argv[3], false);
