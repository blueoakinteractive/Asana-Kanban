Template.board.helpers({
    tasks: function () {
        return UI._globalHelpers.loadTasks(this._id);
    }
});

Template.board.rendered = function() {
    var templateInstance = this;
    templateInstance.options = templateInstance.data.options || {};

    // Create a common group for all boards so tasks can be moved between them.
    templateInstance.options.group = "board";

    // Create a sortable event handler for when tasks are moved within a board.
    templateInstance.options.onUpdate = function sortableUpdate(/**Event*/event) {
        var taskId = event.item.dataset.taskId;
        var toId = event.to.dataset.boardId;
        var position = event.newIndex > 0 ? event.newIndex -1 : 0;
        var update = Meteor.call('updateTaskBoard', taskId, toId, position, null, function(error, response) {
        });
    };

    // Create a sortable event handler for when tasks are moved across boards.
    templateInstance.options.onAdd = function sortableAdd(/**Event*/event) {
        var taskId = event.item.dataset.taskId;
        var fromId = event.from.dataset.boardId;
        var toId = event.to.dataset.boardId;
        var position = event.newIndex > 0 ? event.newIndex -1 : 0;
        var update = Meteor.call('updateTaskBoard', taskId, toId, position, fromId, function(error, response) {
            // Remove the child because meteor subscription will
            // recreate on server update.
            event.to.removeChild(event.item);
        });

    };

    templateInstance.options.onRemove = function sortableRemove(/**Event*/event) {
        //console.log(event);
    };

    // Invoke the sortable library on this board.
    templateInstance.sortable = Sortable.create(templateInstance.firstNode, templateInstance.options);
};


Template.board.destroyed = function () {
    if(this.sortable) this.sortable.destroy();
};

