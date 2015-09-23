Template.filters.helpers({
    workspaces: function() {
        return UI._globalHelpers.myWorkspaces();
    },
    users: function() {
        return AsanaUsers.find({});
    }
});

Template.filters.events({
    'change .workspace-filter' : function(event) {
        event.preventDefault();
        Session.set('Workspace', event.target.value);
    },
    'change .sort-filter' : function(event) {
        event.preventDefault();
        Session.set('TaskSort', event.target.value);
    },
    'change .assignee-filter' : function(event) {
        event.preventDefault();
        Session.set('User', event.target.value);
    }
});
