const r      = require('rethinkdb');
module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, database, table, key, value, newkey, newvalue} = body;
    if (!instancename || !database || !table || !key || !value || !newkey || !newvalue) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const conn = context.fission.serviceClients[instancename];
    if (!conn) {
        callback(400, {err: 'rethinkdb instance not registered for this func'});
        return;
    }

    const filter = {};
    const object= {};
    filter[key] = value;
    object[newkey] = newvalue;
    r.db(database).table(table).filter(filter).update(object, {returnChanges: true}).run(conn).then(function (result) {
        callback(200, {err: '', payload: {changes: result.changes}});
    }).error(function (err) {
        console.log(err.message);
        callback(500, {err: err.toString()});
    });
};