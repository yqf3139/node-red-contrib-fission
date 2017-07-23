module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, bucket, filename} = body;
    if (!instancename || !bucket || !filename) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const mc = context.fission.serviceClients[instancename];
    if (!mc) {
        callback(400, {err: 'minio instance not registered for this func'});
        return;
    }
    mc.statObject(bucket, filename, function (e, stat) {
        if (e) {
            callback(500, {err: e.toString()});
            return console.log(e)
        }
        if (stat.contentType.startsWith('image')) {
            const path = `/tmp/${Math.random()}/${filename}`;
            mc.fGetObject(bucket, filename, path, function (e) {
                if (e) {
                    callback(500, {err: e.toString()});
                    return console.log(e)
                }
                context.response.sendFile(path);
                callback();
            });
            return
        }
        let size = 0;
        let payload = '';
        mc.getObject(bucket, filename, function (e, dataStream) {
            if (e) {
                callback(500, {err: e.toString()});
                return console.log(e)
            }
            dataStream.on('data', function (chunk) {
                size += chunk.length;
                payload += chunk;
            });
            dataStream.on('end', function () {
                callback(200, {err: '', size, payload});
                console.log("End. Total size = " + size);
            });
            dataStream.on('error', function (e) {
                callback(500, {err: e.toString()});
                console.error(e);
            });
        });
    });


};