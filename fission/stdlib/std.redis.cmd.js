const redis = require('redis');
module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, command, payload} = body;
    if (!instancename || !command || !payload) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const client = context.fission.serviceClients[instancename];
    if (!client) {
        callback(400, {err: 'redis instance not registered for this func'});
        return;
    }

    if (client[command.toLowerCase()] === null) {
        callback(400, {err: `command [${command}] not found in redis client`});
        return;
    }
    client[command.toLowerCase()](payload.params, function (err, replies) {
        if (err) {
            callback(500, {err: err.toString()});
            return;
        }
        console.log(replies.length + " replies");
        callback(200, {err: '', result: replies});
    });
};
