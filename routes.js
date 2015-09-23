Router.route('/', function() {
    this.render('Dashboard', function(){
        Session.set('Workspace', null);
    });
});

Router.route('/settings', function() {
    this.render('Settings', function(){

    });
});
