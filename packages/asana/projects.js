Asana.projects = {
  query: function(workspace_id) {
    results = [];
    var asanaClient = Asana.asanaClient();

    var projects = Async.runSync(function (done) {
      asanaClient.projects.findByWorkspace(workspace_id).then(function (projects) {
        done(null, projects.data);
      });
    });

    _.each(projects.result, function (project) {
      if (project.id) {
        results.push(project);
      }
    });

    return results;
  }
}
