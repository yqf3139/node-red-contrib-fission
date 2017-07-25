const NATS = require('node-nats-streaming');

module.exports = function (context, callback) {
    const id = Math.random().toString(36).substring(2, 15);
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {topic, payload} = body;
    if (!topic || !payload) {
        callback(400, {err: 'topic or payload is missing'});
        return;
    }
    if (typeof payload !== 'object') {
        payload = {msg: payload};
    }
    const nc = NATS.connect("fissionMQTrigger", id, "nats://nats-streaming.fission:4222");
    nc.on('error', function (e) {
        console.error('Error : ' + e);
        callback(500, {err: 'conn not created'});
    });
    nc.on('connect', function () {
        nc.publish(topic, JSON.stringify(payload), function (err, guid) {
            if (err) {
                console.error(err);
                callback(500, {err: 'payload not sent'});
                return;
            }
            console.log('Published [' + topic + '] : "' + payload + '"');
            callback(200, {err: '', payload: `payload published to topic [${topic}]`});
            nc.close();
        });
    });
};
