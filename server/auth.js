module.exports = function(app_cfg, db, bcrypt, passport, LocalStrategy) {

  // setting up user authentication
  passport.use(new LocalStrategy({
    usernameField: 'user'
  }, function(user, password, done) {
    console.log('hole hash-pw für user '+ user);
    db.get('SELECT password FROM waip_users WHERE user = ?', user, function(err, row) {
      if (!row) return done(null, false);
      bcrypt.compare(password, row.password, function(err, res) {
        if (!res) return done(null, false);
        db.get('SELECT user, id FROM users WHERE waip_users = ?', user, function(err, row) {
          return done(null, row);
        });
      });
    });
  }));

  passport.serializeUser(function(user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    db.get('SELECT id, user, permissions FROM waip_users WHERE id = ?', id, function(err, row) {
      if (!row) { return done(null, false); }
      return done(null, row);
    });
  });

};
