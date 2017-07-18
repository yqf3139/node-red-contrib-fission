const async = require('async');
const sharp = require('sharp');
const imageType = 'image/jpg';

module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, payload} = body;
    let {resize, dstbkt} = payload;
    if (!instancename || !resize || !dstbkt) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const eventType = payload.EventType;
    if (eventType !== 's3:ObjectCreated:Put') {
        callback(200, {err:'', msg: 'skip non put event'});
        return;
    }

    // default params
    let params = Object.assign({
        width: 200,
        height: 200,
        grey: false,
    }, resize);

    const mc = context.fission.serviceClients[instancename];
    if (!mc) {
        callback(400, {err: 'minio instance not registered for this func'});
        return;
    }

    const transformer = sharp().resize(params.width, params.height).max().greyscale(params.grey);
    const jobs = payload.Records.map((record) => {
        const bname = record.s3.bucket.name;
        const oname = record.s3.object.key;

        return (cb) => {
            console.log('downloading', bname, oname);
            mc.getObject(bname, oname, (err, dataStream) => {
                if (err) {
                    cb(null, 0);
                    return console.log(err);
                }
                const thumbnailName = oname;
                console.log("Uploading new thumbnail to", "\"" + dstbkt + "\"");

                mc.putObject(dstbkt, thumbnailName, dataStream.pipe(transformer), imageType, (err, etag) => {
                    if (err) {
                        console.log(err);
                        cb(null, 0);
                        return;
                    }
                    console.log("Successfully uploaded", "\"" + thumbnailName + "\"", "with md5sum \"" + etag + "\"");
                    cb(null, 1);
                });
            });
        }
    });

    async.parallel(jobs, (err, results) => {
        const sum = results.reduce((a, b) => a + b);
        callback(200, {err: '', msg: `convert images: ${sum} / ${results.length}`});
    });
};
