// controllers/authController.js
const passport = require('passport');

const authController = {
  showLogin(req, res) {
    res.render('login.ejs', { error: req.query.error });
  },

  login(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.redirect('/login?error=' + encodeURIComponent(info.message));
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        // Only allow admin users to log in for editing privileges:
        if (user.role !== 'admin') {
          // Log out immediately if not admin.
          req.logout(() => {
            return res.redirect('/login?error=' + encodeURIComponent('Admin access required.'));
          });
        } else {
          return res.redirect('/');
        }
      });
    })(req, res, next);
  },

  logout(req, res) {
    req.logout(function(err) {
      if (err) return next(err);
      res.redirect('/');
    });
  },
};

module.exports = authController;
