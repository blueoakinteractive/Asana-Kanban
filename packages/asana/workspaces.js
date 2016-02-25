Asana.workspaces = {
  query: function() {
    var results = [];
    var asanaClient = Asana.asanaClient();
    var workspaces = Async.runSync(function (done) {
      asanaClient.workspaces.findAll().then(function (workspaces) {
        done(null, workspaces.data);
      });
    });

    _.each(workspaces.result, function (workspace) {
      if (workspace.id) {
        results.push(workspace);
      }
    });

    return results;
  }
}
