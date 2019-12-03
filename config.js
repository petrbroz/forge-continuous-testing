const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_S3_BUCKET } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_DEFAULT_REGION || !AWS_S3_BUCKET) {
    console.error('Some of the environment variables are missing!');
    process.exit(1);
}

module.exports = {
    forge: {
        client_id: FORGE_CLIENT_ID,
        client_secret: FORGE_CLIENT_SECRET
    },
    aws: {
        access_key_id: AWS_ACCESS_KEY_ID,
        secret_access_key: AWS_SECRET_ACCESS_KEY,
        default_region: AWS_DEFAULT_REGION,
        s3_bucket: AWS_S3_BUCKET
    }
};
