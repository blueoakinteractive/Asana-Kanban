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

Template.registerHelper('activeWorkspaces', function (user_id) {
  user_id = parseInt(user_id);
  // If a user argument is passed, load the workspaces for that user.
  if (user_id) {
    var user = AsanaUsers.findOne({id: user_id});
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

  var query = {completed: {$ne: true}};

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
