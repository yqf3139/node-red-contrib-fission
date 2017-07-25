const r      = require('rethinkdb');
module.exports = function (context, callback) {
    const body = context.request.body;
    if (!body) {
        callback(400, {err: 'body is missing'});
        return;
    }
    let {instancename, database, table, key, value, payload} = body;
    if (!instancename || !database || !table) {
        callback(400, {err: 'param is missing'});
        return;
    }

    const conn = context.fission.serviceClients[instancename];
    if (!conn) {
        callback(400, {err: 'rethinkdb instance not registered for this func'});
        return;
    }

    let query = r.db(database).table(table);
    if (key && value) {
        query = query.filter(r.row(key).eq(value));
    }
    query.run(conn).then(function (cursor) {
        return cursor.toArray();
    }).then(function (result) {
        callback(200, {err: '', payload: {result}});
    }).error(function (err) {
        console.log(err.message);
        callback(500, {err: err.toString()});
    });
};