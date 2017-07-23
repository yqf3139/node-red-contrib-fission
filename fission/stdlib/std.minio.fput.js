const async = require('async');

module.exports = function (context, callback) {
    const request = context.request;
    const files = request.files;
    const instancename = request.headers['x-fission-params-instancename'];
    const bucket = request.headers['x-fission-params-bucket'];
    if (!files || files.length === 0) {
        callback(400, {err: 'files are missing'});
        return;
    }
    if (!instancename || !bucket) {
        callback(400, {err: 'params are missing'});
        return;
    }
    const mc = context.fission.serviceClients[instancename];
    if (!mc) {
        callback(400, {err: 'minio instance not registered for this func'});
        return;
    }
    const jobs = files.map((file) => {
        return (cb) => {
            mc.putObject(bucket, file.originalname, file.buffer, file.minetype, function (e) {
                if (e) {
                    cb(null, null);
                    return console.error(e)
                }
                cb(null, {
                    create_time: Date.now(),
                    bucket: bucket,
                    name: file.originalname,
                });
            })
        };
    });
    async.parallel(jobs, (err, results) => {
        const sum = results.map((i) => i === null ? 0 : 1).reduce((a, b) => a + b);
        callback(200, {
            err: '',
            msg: `put files: ${sum} / ${results.length}`,
            payload: results.filter((i) => i !== null)
        });
    });
};
