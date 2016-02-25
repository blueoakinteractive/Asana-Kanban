Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.publish('asana_tasks', function () {
  if (this.userId) {
    return AsanaTasks.find({});
  }
  return [];
});

Meteor.publish('asana_workspaces', function () {
  if (this.userId) {
    var filter = {sort: {name: 1}}
    return AsanaWorkspaces.find({}, filter);
  }
  return [];
});

Meteor.publish('asana_users', function () {
  if (this.userId) {
    var filter = {sort: {name: 1}};
    return AsanaUsers.find({}, filter);
  }
});

Meteor.publish('boards', function () {
  if (this.userId) {
    return Boards.find({});
  }
});

Meteor.methods({
  asanaGetTasks: function(user_id, workspace_id) {
    this.unblock();
    if (!workspace_id) {
      Controller.AsanaTasks.fetchAll(user_id);
    }
    else {
      Controller.AsanaTasks.fetchByWorkspace(user_id, workspace_id);
    }
  },

  addBoard: function (board) {
    if (Meteor.userId()) {
      Boards.insert({
        name: board,
        created: new Date(),
        user: Meteor.userId()
      })
    }
  },
  updateBoardName: function(id, name) {
    if (Meteor.userId()) {
      Boards.update({
        _id : id
      },{
        $set: {
          name: name
        }
      });
    }
  },
  updateBoardWeight: function (id, weight) {
    if (Meteor.userId()) {
      Boards.update({
        _id : id
      },{
        $set: {
          weight: weight
        }
      });
    }
  },
  updateTaskBoard: function (taskId, destBoard, weight, sourceBoard) {
    var task = AsanaTasks.findOne({_id: taskId});

    var board = Boards.findOne({_id: destBoard});

    if (!task) {
      return false;
    }


    // Add the task to the new board.
    Boards.update({
      _id : destBoard
    },{
      $addToSet: {
        asanaTasks: task.id
      }
    });

    // Increment tasks in the same board with an equal
    // or greater weight by 1.
    if (board.asanaTasks) {
      AsanaTasks.update({
        id: {
          $in : board.asanaTasks
        },
        weight: {
          $gte: parseInt(weight)
        }
        }, {
          $inc: {
            weight: 1
          }
        },
        {multi: true}
      );
    }

    // Set the weight of this asana task.
    AsanaTasks.update({
      _id: taskId
    },{
      $set :{
        weight: parseInt(weight)
      }
    });

    console.log(taskId, destBoard, weight, sourceBoard);
    console.log(task.id);
    // Remove the task from the old board.
    if (sourceBoard) {
      Boards.update({
        _id: sourceBoard
      },{
        $pull: {
          asanaTasks: task.id
        }
      });
    }

    return true;
  },

  // Method to update a users active workspaces.
  userProfileWorkspace: function (workspaceId, action) {
    var workspace = AsanaWorkspaces.findOne({id: parseInt(workspaceId)});

    if (!workspace) {
      throw new Meteor.Error(400, 'Workspace does not exist');
    }

    console.log(workspaceId);
    console.log(action);

    // Add or remove the selected workspace for the users profile settings.
    if (action == 'remove') {
      Meteor.users.update({
        _id: Meteor.userId()
      }, {
        $pull: {
          'profile.settings.workspaces': parseInt(workspaceId)
        }
      });
    }
    else {
      Meteor.users.update({
        _id: Meteor.userId()
      }, {
        $addToSet: {
          'profile.settings.workspaces': parseInt(workspaceId)
        }
      });
    }
  },
  userLogin: function () {
    this.unblock();
    var user = Meteor.user();
    Controller.Meteor.User.login(user);
    Controller.Meteor.User.init(user);
    return;
  }
});

/**
 * @todo: SYNC METHODS
 */
 // Controller.AsanaTasks.fetchAll(user.id);
 // Controller.AsanaProjects.fetchAll();
 // Controller.AsanaUsers.fetchAll();
 // Controller.AsanaWorkspaces.fetchAll();

var Controller = {
  Meteor : {
    User : {
      login : function(user) {
        // Create a date if the use has never logged in.
        if (!user.login_time) user.login_time = new Date();

        // Update the login and last login times for the user.
        Meteor.users.update({
          _id: Meteor.userId()
        }, {
          $set: {
            login_time: new Date(),
            last_login: user.login_time
          }
        });
      },
      init: function(user) {

        // Init the profile settings object.
        if (!user.profile.settings) {
          Meteor.users.update({
            _id: Meteor.userId()
          }, {
            $set: {
              'profile.settings': {}
            }
          });
          user = Meteor.user();
        }

        // Store the users Asana ID in the profile settings.
        if (!user.profile.settings.asanaId) {
          var me = Asana.users.me();
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
          }, {
            $set: {
              'profile.settings.workspaces': []
            }
          })
        }
      }
    }
  },
  AsanaProjects: {
    fetchByWorkspace: function(workspace_id){
      var projects = Asana.projects.query(workspace_id);
      _.each(projects, function(project) {
          AsanaProjects.upsert({
            id: project.id
          }, {
            id: project.id,
            name: project.name,
            workspace: workspace_id
          });
      });
    },
    fetchAll: function() {
      var workspaces = AsanaWorkspaces.find({}).fetch();
      _.each(workspaces, function(workspace) {
        Controller.AsanaProjects.fetchByWorkspace(workspace.id);
      })
    }
  },
  AsanaTags: {
    fetchByWorkspace: function(workspace_id) {
      var tags = Asana.tags.query(workspace_id);
      _.each(tags, function(tag) {
        AsanaTags.upsert({
          id: tag.id
        }, {
          id: tag.id,
          name: tag.name,
          workspace: workspace_id
        });
      });
    },
    fetchAll: function() {
      var workspaces = AsanaWorkspaces.find({}).fetch();
      _.each(workspaces, function(workspace) {
        Controller.AsanaTags.fetchByWorkspace(workspace.id);
      })
    },
  },
  AsanaTasks: {
    fetchByWorkspace: function(user_id, workspace_id, last_sync) {
      var user = AsanaUsers.findOne({ id: user_id });
      console.log('Fetching workspace tasks ' + workspace_id);
      var tasks = Asana.tasks.query(user.id, workspace_id, last_sync);

      // Loop through the results and upsert the Mongo collection.
      _.each(tasks, function(task) {
        AsanaTasks.upsert({
          id: task.id,
        }, {
          id: task.id,
          workspace: task.workspace,
          name: task.name,
          title: task.name,
          assignee: {
            name: user.name,
            id: user.id
          }
        });

        // If there's no weight for this task, put it at the end of the list.
        AsanaTasks.update({
          id: task.id,
          weight: null
        }, {
          $inc: {
            weight: 1
          }
        });

        // If there's no board for this task, assign it to the default.
        var board = Boards.findOne({ asanaTasks: { $in: [task.id]} });

        if (!board) {
          Boards.update({
            _id : "aWb7rLknYmxm3S4kj"
          },{
            $addToSet: {
              asanaTasks: task.id
            }
          });
        }
      });
      console.log('Done fetching workspace tasks ' + workspace_id);
    },
    fetchAll: function(user_id) {
      var user = AsanaUsers.findOne({ id: user_id });
      var sync_time = new Date();

      console.log('Fetching tasks for ' + user.name);

      var last_sync = user.task_sync_time || new Date('2016-02-01');
      var sync_limit = (new Date().getTime() - 5*60000);

      if (sync_limit < last_sync.getTime()) {
        console.log('Skipping sync since it happened less than 5 minutes ago');
        return;
      }

      _.each(user.workspaces, function(workspace) {
        Controller.AsanaTasks.fetchByWorkspace(user.id, workspace, last_sync);
      });

      // Store the sync time on the user object.
      AsanaUsers.update({
        id: user.id
        }, {
        $set: {
          task_sync_time: sync_time
        }
      });

      console.log('Done fetching tasks for ' + user.name);
    },
  },
  AsanaUsers: {
    fetchByWorkspace: function(workspace_id) {
      var users = Asana.users.query(workspace_id);
      _.each(users, function(user) {
        AsanaUsers.upsert({
          id: user.id
        }, {
          $set: {
            id: user.id,
            name: user.name
          },
          $addToSet: {
            workspaces: workspace_id
          }
        });
        console.log(user);
      });
    },
    fetchAll: function() {
      var workspaces = AsanaWorkspaces.find({}).fetch();
      _.each(workspaces, function(workspace) {
        Controller.AsanaUsers.fetchByWorkspace(workspace.id);
      })
    }
  },
  AsanaWorkspaces: {
    fetchAll: function() {
      var workspaces = Asana.workspaces.query();
      _.each(workspaces, function(workspace) {
        AsanaWorkspaces.upsert({
          id: workspace.id
          }, {
          $set: {
            id: workspace.id,
            name: workspace.name
          }
        });
      });
    }
  }
}
