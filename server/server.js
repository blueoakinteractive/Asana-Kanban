// Initailizes an asana api oauth connection.
Meteor.asanaClient = function () {
    var user = Meteor.user();
    var asanaService = ServiceConfiguration.configurations.findOne({service: 'asana'});
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
    // Load the logged in user's Asana user data.
    asanaMe: function asanaMe() {
        var asanaClient = Meteor.asanaClient();
        var me = Async.runSync(function (done) {
            asanaClient.users.me().then(function (me) {
                done(null, me);
            });
        });
        return me.result;
    },
    asanaWorkspaces: function asanaWorkspaces() {
        var asanaClient = Meteor.asanaClient();
        var workspaces = Async.runSync(function (done) {
            asanaClient.workspaces.findAll().then(function (workspaces) {
                done(null, workspaces.data);
            });
        });

        _.each(workspaces.result, function (workspace) {
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
        _.each(workspaces.fetch(), function (workspace) {

            var asanaClient = Meteor.asanaClient();
            var users = Async.runSync(function (done) {
                asanaClient.users.findByWorkspace(workspace.id).then(function (users) {
                    done(null, users.data);
                });
            });

            _.each(users.result, function (user) {
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
        _.each(asana_users.fetch(), function (asana_user) {
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

        _.each(asana_user.workspaces, function (workspace) {
            var tasks = Async.runSync(function (done) {
                asanaClient.tasks.findAll({
                    workspace: workspace,
                    assignee: asana_user.id,
                    modified_since: modified_since
                }, true).then(function (tasks) {
                    done(null, tasks.data);
                });
            });

            _.each(tasks.result, function (task) {
                if (task.id && task.name) {
                    AsanaTasks.upsert({
                        id: task.id,
                    }, {
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
        }, {
            $set: {
                task_sync_time: syncTime
            }
        });
        return;
    },
    asanaTaskDetail: function asanaTaskDetail(task_id) {
        var asanaClient = Meteor.asanaClient();
        var taskDetail = Async.runSync(function (done) {
            asanaClient.tasks.findById(task_id).then(function (taskDetail) {
                done(null, taskDetail);
            });
        });

        if (taskDetail.result.id) {
            console.log("inporting " + taskDetail.result.id + " for workspace " + taskDetail.result.workspace.name);
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
        _.each(workspaces.fetch(), function (workspace) {
            var tags = Async.runSync(function (done) {
                asanaClient.tags.findAll({
                    workspace: workspace.id,
                }).then(function (tags) {
                    done(null, tags.data);
                });
            });

            _.each(tags.result, function (tag) {
                if (tag.id) {
                    AsanaTags.upsert({
                        id: tag.id
                    }, {
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
        _.each(workspaces.fetch(), function (workspace) {
            var projects = Async.runSync(function (done) {
                asanaClient.projects.findByWorkspace(workspace.id).then(function (projects) {
                    done(null, projects.data);
                });
            });
            _.each(projects.result, function (project) {
                if (project.id) {
                    AsanaProjects.upsert({
                        id: project.id
                    }, {
                        id: project.id,
                        name: project.name,
                        workspace: workspace.id
                    });
                }
            });
        });
        return;
    },
    asanaUpdate: function () {
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

        // Set the weight of this asana task.
        AsanaTasks.update({
            _id: taskId
        },{
            $set :{
                weight: parseInt(weight)
            }
        });

        // Remove the task from the old board.
        if (sourceBoard) {
            Boards.update({
                _id :sourceBoard
            },{
                $pull: {
                    asanaTasks: task.id
                }
            });
        }

        return true;
    },
    // Initializes settings in a users profile.
    userProfileInit: function () {
        var user = Meteor.user();

        if (user) {

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
                }, {
                    $set: {
                        'profile.settings.workspaces': []
                    }
                })
            }
        }
    },
    // Method to update a users active workspaces.
    userProfileWorkspace: function (workspaceId, action) {
        var workspace = AsanaWorkspaces.findOne({id: parseInt(workspaceId)});

        if (!workspace) {
            throw new Meteor.Error(400, 'Workspace does not exist');
        }

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
        var user = Meteor.user();

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

        // Initialize the user profile on login.
        Meteor.call('userProfileInit');

        // Fetch new tasks from users since last sync.
        // Meteor.call('asanaTasksAllUsers');
        return;
    }
});
