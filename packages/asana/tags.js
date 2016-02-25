Asana.tags = {
  query: function(workspace_id) {
    results = [];
    var asanaClient = Asana.asanaClient();

    var tags = Async.runSync(function (done) {
      asanaClient.tags.findAll({
        workspace: workspace_id,
      }).then(function (tags) {
        done(null, tags.data);
      });
    });

    _.each(tags.result, function (tag) {
      if (tag.id) {
        results.push(tag);
      }
    });
    
    return results;
  }
}
