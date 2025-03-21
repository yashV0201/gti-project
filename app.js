// app.js
const express = require('express');
const app = express();
const multer = require('multer')
const path = require('path')
const mainController = require('./controllers/mainController');
const designController = require('./controllers/designMethodController');
const methodOverride = require('method-override');

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
