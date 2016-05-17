Asana.tasks = {
  get: function(task_id) {
    var result;
    var asanaClient = Asana.asanaClient();

    var task = Async.runSync(function (done) {
      asanaClient.tasks.findById(task_id)
      .then(function (task) {
        done(null, task);
      })
      .catch(function(ex){
        done(null, ex);
      });
    });

    if (task.result && task.result.id) {
      result = task.result;
    }
    else if (task.result && task.result.status && task.result.status == 404) {
      return 'deleted';
    }

    return result;
  },
  query: function(user_id, workspace_id, modified_since) {

    var results = [];
    var asanaClient = Asana.asanaClient();

    // @todo: Set modified since as a setting.
    if (!modified_since) {
      modified_since = new Date('2016-01-01');
    }

    var tasks = Async.runSync(function (done) {
      asanaClient.tasks.findAll({
        workspace: workspace_id,
        assignee: user_id,
        modified_since: modified_since.toISOString(),
        opt_fields: 'workspace,completed,modified_at,name,projects'
      }, true).then(function (tasks) {
        done(null, tasks.data);
      });
    });

    _.each(tasks.result, function (task) {
      if (task.id && task.name) {
        // Append the result to the return object.
        results.push(task);
      }
    });

    return results;
  }
}
