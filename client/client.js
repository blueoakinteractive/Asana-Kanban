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

Template.registerHelper('activeUsers', function (workspace_id) {
  workspace_id = parseInt(workspace_id);
  var user = Meteor.user();
  if (!user) return;
  var trackedUsers = user.profile.settings.trackedUsers;
  var query = {
    id: {
      $in: trackedUsers
    }
  }

  if (workspace_id) {
    _.extend(query, {'workspaces': workspace_id});
  }

  return AsanaUsers.find(query);
});

Template.registerHelper('activeWorkspaces', function () {
  var user = Meteor.user();
  if (!user || !user.profile) return;
  var userWorkspaces = user.profile.settings.workspaces;

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
  var user_id = parseInt(Session.get('User'));
  var user = Meteor.user();

  var filter = {sort: {weight: 1}};
  if (Session.get('TaskSort')) {
    filter.sort[Session.get('TaskSort')] = Session.get('TaskSort');
  }

  var query = {completed: false};

  if (workspace) {
    _.extend(query, {'workspace.id': workspace});
  }
  else if (user) {
    _.extend(query, {'workspace.id': {$in: user.profile.settings.workspaces}});
  }

  if (user_id) {
    _.extend(query, {'assignee.id': user_id});
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
});

Handlebars.registerHelper('trimString', function(passedString, startstring, endstring) {
  var theString = passedString.substring( startstring, endstring );
  return new Handlebars.SafeString(theString)
});
