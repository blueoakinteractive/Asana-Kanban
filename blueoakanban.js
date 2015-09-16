AsanaUsers = new Mongo.Collection("asana_users");
AsanaWorkspaces = new Mongo.Collection("asana_workspaces");
AsanaTasks = new Mongo.Collection("asana_tasks");
AsanaTags = new Mongo.Collection("asana_tags");
AsanaProjects = new Mongo.Collection("asana_projects");

if (Meteor.isClient) {

  Meteor.subscribe('asana_tasks');
  Meteor.subscribe('asana_workspaces');
  Meteor.subscribe('asana_users');

  Template.dashboard.helpers({
    tasks: function() {
      var result = [];
      var workspace = parseInt(Session.get('Workspace'));
      var user = parseInt(Session.get('User'));

      var filter = {sort: {}}
      if (Session.get('TaskSort')) {
        filter.sort[Session.get('TaskSort')] = Session.get('TaskSort');
      }

      var query = {
        completed: false
      }

      if (workspace) {
        _.extend(query, {'workspace.id': workspace});
      }
      else {
        _.extend(query, {'workspace.id': {$in: Meteor.user().profile.settings.workspaces}});
      }

      if (user) {
         _.extend(query, {'assignee.id': user});
      }

      return AsanaTasks.find(query, filter);
    },
  });

  Template.dashboard.events({

  });

  Template.filters.helpers({
    workspaces: function() {
      return myWorkspaces();
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

  Template.settingsWorkspaces.helpers({
    workspaces: function() {
      var user = Meteor.user();
      var workspaces = AsanaWorkspaces.find({}).fetch();
      if (user && user.profile) {
        var userWorkspaces = user.profile.settings.workspaces;
        _.each(workspaces, function (value, key) {
          if (userWorkspaces.length > 1 && _.indexOf(userWorkspaces, value.id) > 0) {
            workspaces[key].checked = true;
          }
          else if(userWorkspaces == value.id) {
            workspaces[key].checked = true;
          }
        });
      }
      return workspaces;
    }
  });

  Template.settingsWorkspaces.events({
    'change .settings-workspaces': function(event) {
      if (event.target.checked) {
        Meteor.call('userProfileWorkspace', event.target.value, 'add');
      }
      else {
        Meteor.call('userProfileWorkspace', event.target.value, 'remove');
      }
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  Accounts.onLogin(function() {
    Meteor.call('userLogin');
  });
}


if (Meteor.isServer) {

  // Initailizes an asana api oauth connection.
  Meteor.asanaClient = function() {
    var user = Meteor.user();
    var asanaService = ServiceConfiguration.configurations.findOne({service:'asana'});
    if (user && asanaService) {
      var client = Asana.Client.create({
        clientId: asanaService.clientId,
        clientSecret: asanaService.secret,
        redirectUri: Meteor.absoluteUrl("_oauth/asana")
      });


      client.useOauth({
        credentials: {
          // access_token: user.services.asana.accessToken,
          refresh_token: user.services.asana.refreshToken
        }
      });

      return client;
    }
    return null;
  }

  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish('asana_tasks', function () {
    if (this.userId) {
      return AsanaTasks.find({});
    }
    return [];
  });

  Meteor.publish('asana_workspaces', function() {
    if (this.userId) {
      var filter = {sort: {name: 1}}
      return AsanaWorkspaces.find({}, filter);
    }
    return [];
  });

  Meteor.publish('asana_users', function() {
    if (this.userId) {
      var filter = {sort: {name: 1}};
      return AsanaUsers.find({}, filter);
    }
  });

  Meteor.methods({
    // Load the logged in user's Asana user data.
    asanaMe: function asanaMe() {
      var asanaClient = Meteor.asanaClient();
      var me = Async.runSync(function(done) {
        asanaClient.users.me().then(function(me) {
          done(null, me);
        });
      });
      return me.result;
    },
    asanaWorkspaces: function asanaWorkspaces() {
      var asanaClient = Meteor.asanaClient();
      var workspaces = Async.runSync(function(done) {
        asanaClient.workspaces.findAll().then(function(workspaces) {
          done(null, workspaces.data);
        });
      });

      _.each(workspaces.result, function(workspace) {
        if (workspace.id) {
          AsanaWorkspaces.upsert({
            id: workspace.id
          }, {
            $set: {
              id: workspace.id,
              name: workspace.name
            }
          });
        }
      });
      return;
    },
    asanaUsers: function asanaUsers() {
      var workspaces = AsanaWorkspaces.find({});
      _.each(workspaces.fetch(), function(workspace) {

        var asanaClient = Meteor.asanaClient();
        var users = Async.runSync(function(done) {
          asanaClient.users.findByWorkspace(workspace.id).then(function(users) {
            done(null, users.data);
          });
        });

        _.each(users.result, function(user) {
          if (user.id) {
            AsanaUsers.upsert({
              id: user.id
            }, {
              $set: {
                id: user.id,
                name: user.name
              },
              $addToSet: {
                workspaces: workspace.id
              }
            });
          }
        });
      });
      return;
    },
    asanaTasksByUser: function asanaTasksByUser(user_id) {
      var asanaClient = Meteor.asanaClient();
      var asana_user = AsanaUsers.findOne({id: user_id});
      if (asana_user) {
        Meteor.call('asanaTasks', asana_user);
      }
      return;
    },
    asanaTasksAllUsers: function asanaTasksAllUser() {
      var asanaClient = Meteor.asanaClient();
      var asana_users = AsanaUsers.find({});
      _.each(asana_users.fetch(), function(asana_user) {
        Meteor.call('asanaTasks', asana_user);
      });
      return;
    },
    asanaTasks: function asanaTasks(asana_user, modified_since) {
      var asanaClient = Meteor.asanaClient();
      var syncTime = new Date();

      // Use the last sync time from the user object or a default time
      // if no time filter is set.
      if (!modified_since) {
        if (asana_user.task_sync_time) {
          modified_since = asana_user.task_sync_time.toISOString();
        }
        else {
          modified_since = new Date('2015-09-09').toISOString();
        }
      }

      if (!asana_user.workspaces) {
        console.log('Asana user does not belong to any workspaces!');
        return;
      }

      console.log("Fetching tasks for " + asana_user.name + " since " + modified_since);

      _.each(asana_user.workspaces, function(workspace) {
        var tasks = Async.runSync(function(done) {
          asanaClient.tasks.findAll({
            workspace: workspace,
            assignee: asana_user.id,
            modified_since: modified_since
          }, true).then(function(tasks) {
            done(null, tasks.data);
          });
        });

        _.each(tasks.result, function(task) {
          if (task.id && task.name) {
            AsanaTasks.upsert({
              id: task.id,
            },{
              id: task.id,
              workspace: workspace,
              name: task.name,
              title: task.name
            });

            Meteor.call('asanaTaskDetail', task.id);
          }
        });
      })

      console.log('Done importing');

      // Save the sync time so we can limit api requests next time this is ran.
      AsanaUsers.update({
        id: asana_user.id
      },{
        $set: {
          task_sync_time: syncTime
        }
      });
      return;
    },
    asanaTaskDetail: function asanaTaskDetail(task_id) {
      var asanaClient = Meteor.asanaClient();
      var taskDetail = Async.runSync(function(done) {
        asanaClient.tasks.findById(task_id).then(function(taskDetail) {
          done(null, taskDetail);
        });
      });

      if (taskDetail.result.id) {
        console.log("inporting " + taskDetail.result.id  + " for workspace " + taskDetail.result.workspace.name);
        AsanaTasks.upsert({
          id: taskDetail.result.id,
        },
          taskDetail.result
        );
      }
      return;
    },
    asanaTags: function asanaTags() {
      var asanaClient = Meteor.asanaClient();
      var workspaces = AsanaWorkspaces.find({});
      _.each(workspaces.fetch(), function(workspace) {
        var tags = Async.runSync(function(done) {
          asanaClient.tags.findAll({
            workspace: workspace.id,
          }).then(function(tags) {
            done(null, tags.data);
          });
        });

        _.each(tags.result, function(tag) {
          if (tag.id) {
            AsanaTags.upsert({
              id: tag.id
            },{
              id: tag.id,
              name: tag.name,
              workspace: workspace.id
            });
          }
        });
      });
      return;
    },
    asanaProjects: function asanaProjects() {
      var asanaClient = Meteor.asanaClient();
      var workspaces = AsanaWorkspaces.find({});
      _.each(workspaces.fetch(), function(workspace) {
        var projects = Async.runSync(function(done) {
          asanaClient.projects.findByWorkspace(workspace.id).then(function(projects) {
            done(null, projects.data);
          });
        });
        _.each(projects.result, function(project) {
          if (project.id) {
            AsanaProjects.upsert({
              id: project.id
            },{
              id: project.id,
              name: project.name,
              workspace: workspace.id
            });
          }
        });
      });
      return;
    },
    asanaUpdate: function() {
      // var user = Meteor.user();
      // if (user.asana_sync) {
      //   var date = user.asana_sync.toISOString();
      // }
      // else {
      //   date = null;
      // }
      // Meteor.call('asanaTasks', 'me', date);
      return;
    },
    // Initializes settings in a users profile.
    userProfileInit: function() {
      var user = Meteor.user();

      if (user) {

        // Init the profile settings object.
        if (!user.profile.settings) {
          Meteor.users.update({
            _id: Meteor.userId()
          },{
            $set: {
              'profile.settings': {}
            }
          });
          user = Meteor.user();
        }

        // Store the users Asana ID in the profile settings.
        if (!user.profile.settings.asanaId) {
          var me = Meteor.call('asanaMe');
          if (me.id) {
            Meteor.users.update({
              _id: Meteor.userId()
            }, {
              $set: {
                'profile.settings.asanaId': me.id
              }
            });
          }
        }

        // Init the users selected workspaces.
        if (!user.profile.settings.workspaces) {
          Meteor.users.update({
            _id: Meteor.userId()
          },{
            $set: {
              'profile.settings.workspaces': []
            }
          })
        }
      }
    },
    // Method to update a users active workspaces.
    userProfileWorkspace: function(workspaceId, action) {
      var workspace = AsanaWorkspaces.findOne({id: parseInt(workspaceId) });

      if (!workspace) {
        throw new Meteor.Error(400, 'Workspace does not exist');
      }

      // Add or remove the selected workspace for the users profile settings.
      if (action == 'remove') {
        Meteor.users.update({
          _id: Meteor.userId()
        },{
          $pull: {
            'profile.settings.workspaces': parseInt(workspaceId)
          }
        });
      }
      else {
        Meteor.users.update({
          _id: Meteor.userId()
        },{
          $addToSet: {
            'profile.settings.workspaces': parseInt(workspaceId)
          }
        });
      }
    },
    userLogin: function() {
      var user = Meteor.user();

      // Create a date if the use has never logged in.
      if (!user.login_time) user.login_time = new Date();

      // Update the login and last login times for the user.
      Meteor.users.update({
        _id: Meteor.userId()
      },{
        $set: {
          login_time: new Date(),
          last_login: user.login_time,
        }
      });

      // Initialize the user profile on login.
      Meteor.call('userProfileInit');

      // Fetch new tasks from users since last sync.
      Meteor.call('asanaTasksAllUsers');
      return;
    }
  });
}

// Public methods.
Meteor.methods({

});

function myWorkspaces() {
  var user = Meteor.user();
  var userWorkspaces = user.profile.settings.workspaces;
  return AsanaWorkspaces.find({
    id: {
      $in: userWorkspaces
    }
  });
}

Router.route('/', function() {
  this.render('Dashboard', function(){
    Session.set('Workspace', null);
  });
});

Router.route('/settings', function() {
  this.render('Settings', {});
});
