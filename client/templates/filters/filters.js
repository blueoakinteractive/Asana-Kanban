Template.filters.helpers({
    workspaces: function() {
        var userId = Session.get('User');
        return UI._globalHelpers.activeWorkspaces(userId);
    },
    users: function() {
        var workspaceId = Session.get('Workspace');
        return UI._globalHelpers.activeUsers(workspaceId);
    },
});

Template.filters.events({
    'change .workspace-filter' : function(event) {
        var workspaceId = parseInt(event.target.value);
        Session.set('Workspace', workspaceId);
    },
    'change .sort-filter' : function(event) {
        var taskId = parseInt(event.target.value);
        Session.set('TaskSort', taskId);
    },
    'change .assignee-filter' : function(event) {
        var userId = parseInt(event.target.value);
        var loading = Session.get('loading') || [];
        Meteor.call('asanaTasksByUser', userId, function() {
            loading.user = false;
            Session.set('loading', loading)
        });
        loading.user = userId;
        Session.set('loading', loading)
        Session.set('User', userId);
    }
});
