Template.settingsWorkspaces.helpers({
    workspaces: function () {
        var user = Meteor.user();

        if (!user) {
            return;
        }

        var asanaUser = AsanaUsers.findOne({id: user.profile.settings.asanaId});

        if (!asanaUser) {
            return;
        }

        var workspaces = AsanaWorkspaces.find({id: {$in: asanaUser.workspaces }}).fetch();
        if (user && user.profile) {
            var userWorkspaces = user.profile.settings.workspaces;
            _.each(workspaces, function (value, key) {
                if (userWorkspaces.length > 1 && _.indexOf(userWorkspaces, parseInt(value.id)) >= 0) {
                    workspaces[key].checked = true;
                }
                else if (userWorkspaces == value.id) {
                    workspaces[key].checked = true;
                }
            });
        }
        return workspaces;
    }
});

Template.settingsWorkspaces.events({
    'change .settings-workspaces': function (event) {
        if (event.target.checked) {
            Meteor.call('userProfileWorkspace', event.target.value, 'add');
        }
        else {
            Meteor.call('userProfileWorkspace', event.target.value, 'remove');
        }
    }
});

Template.settingsBoards.helpers({
    boards: function () {
        var filter = {sort: {weight: 1}};
        return Boards.find({}, filter);
    }
});

Template.settingsBoards.events({
    'submit .new-board': function (event) {
        event.preventDefault();
        var board = event.target.board.value;
        Meteor.call('addBoard', board);
        event.target.board.value = '';
    },
    'change .boards .board-name': function (event) {
        Meteor.call('updateBoardName', this._id, event.target.value)
    },
    'change .boards .board-weight': function (event) {
        var weight = event.target.value;
        if (parseInt(weight) == weight) {
            Meteor.call('updateBoardWeight', this._id, weight)
        }
    }
});
