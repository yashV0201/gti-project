// app.js
const express = require('express');
const app = express();
const multer = require('multer')
const path = require('path')
const mainController = require('./controllers/mainController');
const designController = require('./controllers/designMethodController');
const authController = require('./controllers/authController');
const queries = require('./models/queries')
const methodOverride = require('method-override');

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');


// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Configure sessions (use your own secret in production)
app.use(
  session({
    secret: 'mysecret123',
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Here we assume queries.getUserByUsername returns a user row
      const user = await queries.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return done(null, false, { message: 'Incorrect password.' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await queries.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Make the authenticated user available in every template:
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

// Login routes (only admin access)
app.get('/login', authController.showLogin);
app.post('/login', authController.login);
app.get('/logout', authController.logout);


// View routes
app.get('/', mainController.showHome);
app.get('/category/:categoryId', mainController.showNeeds);
app.get('/subcategory/:subcategoryId', mainController.showSolutions);
app.get('/design-methods',designController.showAllDesginMethods);

// API routes
app.post('/api/subcategories', mainController.addNeed);
app.put('/api/subcategories/:id', mainController.updateNeed);
app.delete('/api/subcategories/:id', mainController.deleteNeed);

app.post('/api/solutions', mainController.addSolution);
app.put('/api/solutions/:id', mainController.updateSolution);
app.delete('/api/solutions/:id', mainController.deleteSolution);

app.post('/design-methods/upload',upload.single('document'),designController.uploadDesignMethod);
app.get('/design-methods/:id',designController.showDesignMethod);
app.put('/design-methods/:id', upload.single('document'), designController.updateDesignMethod);
app.delete('/design-methods/delete/:id',designController.deleteDesignMethod);

app.get('/subcategory/:subcategoryId/design-methods',designController.showDesignMethodBySubcategory);
app.post('/subcategories/:subcategoryId/attach-design-method',designController.attachDesignMethodToSubcategory);
app.delete('/subcategories/:subcategoryId/remove-design-method/:methodId',designController.removeDesignMethodFromSubcategory);

const PORT =5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
