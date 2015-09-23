Template.dashboard.helpers({
    boards: function () {
        var filter = {sort: {weight: 1}};
        return Boards.find({}, filter).fetch();
    }
});



Template.dashboard.events({});