Asana.users = {
  me: function() {
    var asanaClient = Asana.asanaClient();
    var me = Async.runSync(function (done) {
      asanaClient.users.me().then(function (me) {
        done(null, me);
      });
    });
    return me.result;
  },
  query: function(workspace_id) {
    var results = [];
    var asanaClient =  Asana.asanaClient();

    var users = Async.runSync(function (done) {
      asanaClient.users.findByWorkspace(workspace_id).then(function (users) {
        done(null, users.data);
      });
    });

    _.each(users.result, function (user) {
      if (user.id && user.name && user.name != 'Private User') {
        results.push(user);
      }
    });

    return results;
  },
}
