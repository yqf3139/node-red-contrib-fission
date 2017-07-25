const Influx = require('influx');
const INFLUXDB_DATABASE = 'fissionFunctionLog';

const Api = require('../fission/api');
const api = new Api.Api(Api.InClusterConfig);

function FissionLog(comms, config, interval) {
    const that = this;

    this.fmap = {};

    this.client = new Influx.InfluxDB({
        host: config.host,
        port: config.port,
        database: INFLUXDB_DATABASE,
    });

    this.timer = setInterval(function () {
        Object.keys(that.fmap).map((name) => {
            const f = that.fmap[name];
            if (f.counter < 1) return;

            const query = `SELECT * FROM log WHERE funcuid = '${f.uid}' AND time > ${f.lasttime} AND log =~ /^nodered.*/ ORDER BY time ASC`;
            that.client.query(query).then((results) => {
                results.map((r) => {
                    let res = {
                        format: r.stream,
                        name: r.funcname,
                        topic: r.funcuid,
                        msg: r.log.substr(8),
                    };
                    comms.publish("debug", res);
                });
                if (results.length > 0) {
                    f.lasttime = results[0].time.getTime() * 1000 * 1000;
                }
            }).catch((err) => {
                console.error(err);
            });
        });
    }, interval);
}

FissionLog.prototype.add = function (funcname) {
    if (!funcname)return;
    if (this.fmap.hasOwnProperty(funcname)) {
        this.fmap[funcname]['counter']++;
    } else {
        const that = this;
        api.getFunction(funcname).then((response) => {
            that.fmap[funcname] = {
                counter: 1,
                lasttime: Date.now() * 1000000,
                uid: response.data.metadata.uid,
            };
        }).catch((err) => {
            console.error(err);
        });
    }
};

FissionLog.prototype.remove = function (funcname) {
    if (!funcname)return;
    if (this.fmap.hasOwnProperty(funcname)) {
        this.fmap[funcname]['counter']--;
    }
};

module.exports = FissionLog;
