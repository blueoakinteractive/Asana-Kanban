Asana.tasks = {
  get: function(task_id) {
    var result;
    var asanaClient = Asana.asanaClient();

    var task = Async.runSync(function (done) {
      asanaClient.tasks.findById(task_id).then(function (task) {
        done(null, task);
      });
    });

    if (task.result && task.result.id) {
      result = task.result
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
        modified_since: modified_since.toISOString()
      }, true).then(function (tasks) {
        done(null, tasks.data);
      });
    });


    _.each(tasks.result, function (task) {
      if (task.id && task.name) {

        // Add the workspace id to the task.
        if (!task.workspace) {
          task.workspace = {id: workspace_id};
        }

        // Append the result to the return object.
        results.push(task);
      }
    });

    return results;
  }
}
