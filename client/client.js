Meteor.subscribe('asana_tasks');
Meteor.subscribe('asana_workspaces');
Meteor.subscribe('asana_users');
Meteor.subscribe('boards');

Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
});

Accounts.onLogin(function () {
    Meteor.call('userLogin');
});

Template.registerHelper('activeUsers', function (workspaceId) {
  if (workspaceId) {
    return AsanaUsers.find({
      workspaces: workspaceId
    });
  }
  else {
    return AsanaUsers.find({});
  }
});

Template.registerHelper('activeWorkspaces', function (userId) {

    // If a user argument is passed, load the workspaces for that user.
    if (userId) {
        var user = AsanaUsers.findOne({id: userId});
        if (!user) return;
        var userWorkspaces = user.workspaces;
    }
    // Otherwise, load the workspaces for the logged in user.
    else {
        var user = Meteor.user();
        if (!user || !user.profile) return;
        var userWorkspaces = user.profile.settings.workspaces;
    }

    // Query for the selected users workspaces.
    if (userWorkspaces) {
        return AsanaWorkspaces.find({
            id: {
                $in: userWorkspaces
            }
        });
    }

    return [];
});

Template.registerHelper('loadTasks', function (boardId) {
    var result = [];
    var workspace = parseInt(Session.get('Workspace'));
    var user = parseInt(Session.get('User'));

    var filter = {sort: {weight: 1}};
    if (Session.get('TaskSort')) {
        filter.sort[Session.get('TaskSort')] = Session.get('TaskSort');
    }

    var query = {};

    if (workspace) {
        _.extend(query, {'workspace.id': workspace});
    }
    else {
        _.extend(query, {'workspace.id': {$in: Meteor.user().profile.settings.workspaces}});
    }

    if (user) {
        _.extend(query, {'assignee.id': user});
    }

    if (boardId) {
        var board = Boards.findOne({_id: boardId});
        if (board.asanaTasks) {
            _.extend(query, {id: {$in: board.asanaTasks}});
        }
        else {
          return;
        }
    }

    return AsanaTasks.find(query, filter);
    // return AsanaTasks.find(query);
});

Handlebars.registerHelper('trimString', function(passedString, startstring, endstring) {
    var theString = passedString.substring( startstring, endstring );
    return new Handlebars.SafeString(theString)
});
