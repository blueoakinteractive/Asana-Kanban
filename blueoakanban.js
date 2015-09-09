AsanaUsers = new Mongo.Collection("asana_users");
AsanaWorkspaces = new Mongo.Collection("asana_workspaces");
AsanaTasks = new Mongo.Collection("asana_tasks");


if (Meteor.isClient) {

  Meteor.subscribe('asana_tasks');
  Meteor.subscribe('asana_workspaces');

  Template.dashboard.helpers({
    tasks: function() {
      var workspace = parseInt(Session.get('Workspace'));
      if (workspace) {
        return AsanaTasks.find({completed: false, 'workspace.id': workspace});
      }
      else {
        return AsanaTasks.find({completed: false});
      }
    },
  });

  Template.dashboard.events({

  });

  Template.filters.helpers({
    workspaces: function() {
      return AsanaWorkspaces.find({});
    }
  });

  Template.filters.events({
    'change .workspace-filter' : function(event) {
      event.preventDefault();
      Session.set('Workspace', event.target.value);
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
        credentials: user.services.asana.accessToken
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
      return AsanaTasks.find({'assignee.id' : 4216372728453});
    }
    return [];
  });

  Meteor.publish('asana_workspaces', function() {
    if (this.userId) {
      return AsanaWorkspaces.find({});
    }
    return [];
  });

  Meteor.methods({
    asanaUsers: function asanaUsers() {
      var asanaClient = Meteor.asanaClient();
      var users = Async.runSync(function(done) {
        asanaClient.users.findAll(true).then(function(users) {
          done(null, users.data);
        });
      });

      _.each(users.result, function(user) {
        console.log('Adding user ' + user.name);
        if (user.id) {
          AsanaUsers.upsert({
            id: user.id
          }, {
            $set: {
              id: user.id,
              name: user.name
            }
          });
        }
      });
      return;
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
    asanaTasks: function asanaTasks(asana_user, modified_since) {
      var asanaClient = Meteor.asanaClient();

      if (!asana_user) {
        asana_user = 'me';
      }

      if (!modified_since) {
        modified_since = new Date('2015-09-08').toISOString();
      }

      var workspaces = AsanaWorkspaces.find({});
      _.each(workspaces.fetch(), function(workspace) {
        var tasks = Async.runSync(function(done) {
          asanaClient.tasks.findAll({
            workspace: workspace.id,
            assignee: asana_user,
            modified_since: modified_since
          }).then(function(tasks) {
            done(null, tasks.data);
          });
        });

        _.each(tasks.result, function(task) {
          if (task.id && task.name) {
            AsanaTasks.upsert({
              id: task.id,
            },{
              id: task.id,
              workspace: workspace.id,
              workspace_id: workspace._id,
              name: task.name,
              title: task.name
            });

            Meteor.call('asanaTaskDetail', task.id);
          }
        });
      })

      console.log('Done importing');
      Meteor.users.update({
        _id: Meteor.userId()
      },{
        $set: {
          asana_sync: new Date()
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
    asanaUpdate: function() {
      var user = Meteor.user();
      if (user.asana_sync) {
        var date = user.asana_sync.toISOString();
      }
      else {
        date = null;
      }
      Meteor.call('asanaTasks', 'me', date);
      return;
    },
    userLogin: function() {
      var user = Meteor.user();
      Meteor.users.update({
        _id: Meteor.userId()
      },{
        $set: {
          login_time: new Date(),
          last_login: user.login_time,
        }
      });
      Meteor.call('asanaUpdate');
      return;
    }
  });
}

// Public methods.
Meteor.methods({

});

Router.route('/', function() {
  // var auth = Meteor.call('asanaOauth');
  // console.log(auth);
  // if (auth && auth.redirect) {
  //   Route.go(auth.redirect);
  // }
  this.render('Dashboard', {});
});

Router.route('/oauth', function () {
  // var code = this.params.query.code;
  // if (code) {
  //   var asanaClient = Meteor.call('asanaClient');
  //   asanaClient.app.accessTokenFromCode(code).then(function(credentials){
  //     Session.set('AsanaToken', credentials.access_token);
  //   });
  // }
  this.render('Oauth', {});
});
