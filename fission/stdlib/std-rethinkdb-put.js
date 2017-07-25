const r      = require('rethinkdb');
module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, database, table, payload} = body;
    if (!instancename || !database || !table || !payload) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const conn = context.fission.serviceClients[instancename];
    if (!conn) {
        callback(400, {err: 'rethinkdb instance not registered for this func'});
        return;
    }

    r.db(database).table(table).insert(payload, {returnChanges: true}).run(conn).then(function (result) {
        callback(200, {err: '', payload: {changes: result.changes}});
    }).error(function (err) {
        console.log(err.message);
        callback(500, {err: err.toString()});
    });
};