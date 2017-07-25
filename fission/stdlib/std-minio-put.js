module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, bucket, filename, payload} = body;
    if (!instancename || !bucket || !filename || !payload) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const mc = context.fission.serviceClients[instancename];
    if (!mc) {
        callback(400, {err: 'minio instance not registered for this func'});
        return;
    }

    mc.putObject(bucket, filename, JSON.stringify(payload), 'text/plain', function (e) {
        if (e) {
            callback(500, {err: e.toString()});
            return console.error(e)
        }
        callback(200, {err: '', payload: `payload put to ${instancename}/${bucket}/${filename}`});
    })
};
