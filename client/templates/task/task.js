Template.task.events({
  'click .task-refresh': function(event) {
    var id = event.target.dataset.taskId;
    Meteor.call('asanaRefreshTask', id);
  }
})
