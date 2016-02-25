Template.filters.helpers({
    workspaces: function() {
        var user_id = Session.get('User');
        return UI._globalHelpers.activeWorkspaces(user_id);
    },
    users: function() {
        var workspace_id = Session.get('Workspace');
        return UI._globalHelpers.activeUsers(workspace_id);
    },
});

Template.filters.events({
    'change .workspace-filter' : function(event) {
        var user_id = Session.get('User');
        var workspace_id = event.target.value;
        Session.set('Workspace', workspace_id);
        Meteor.call('asanaGetTasks', user_id, workspace_id, function() {});
    },
    'change .sort-filter' : function(event) {
        var taskId = event.target.value;
        Session.set('TaskSort', taskId);
    },
    'change .assignee-filter' : function(event) {
        var user_id = event.target.value;
        var workspace_id = Session.get('Workspace');
        Meteor.call('asanaGetTasks', user_id, workspace_id, function() {});
        Session.set('User', user_id);
    }
});
