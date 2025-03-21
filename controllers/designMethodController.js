// controllers/designMethodController.js
const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');
const designQueries = require('../models/designMethodQueries')

const designController = {
// Upload a design method document (create)
  async uploadDesignMethod(req, res) {
    try {
      const title = req.body.title;    
      const fileBuffer = fs.readFileSync(req.file.path);
      // Insert into the database
      const result = await designQueries.addDesignMethod(title,fileBuffer);
      // Remove the temporary file
      fs.unlinkSync(req.file.path);
      res.redirect(`/design-methods/${result.id}`)
      // res.redirect(`/design-methods/${result.rows[0].id}`);
    } catch (err) {
      res.status(500).send(err.message);
    }
  },

  // Retrieve and display a design method document by converting DOCX to HTML
  async showDesignMethod(req, res) {
    try {
      const id = req.params.id;
      const result = await designQueries.getDesignById(id);
      if (result.length === 0) return res.status(404).send("Design method not found");
      
      const docBuffer = result.document;
      const conversionResult = await mammoth.convertToHtml({ buffer: docBuffer });
      const html = conversionResult.value; // the generated HTML
      res.render('designDetails.ejs', { title: result.title, html,id });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },

  async showAllDesginMethods(req,res){
    try{
      const results = await designQueries.getAllDesignMethods();

      // if (results.length === 0) return res.status(404).send("Design method not found");
      res.render('designMethods.ejs',{results});
    }catch(err){
      res.status(500).send(err.message);
    }
  },

  async showDesignMethodBySubcategory(req,res){
    try{
      const id = req.params.subcategoryId;
      const results = await designQueries.getDesignBySubcategoryId(id);
      const designMethods = await designQueries.getAvailableDesignMethods(id);
      res.render('needsDesignMethods.ejs',{results,id, designMethods});
    }catch(err){
      res.status(500).send(err.message);
    }
  },

  async attachDesignMethodToSubcategory(req,res){
    try{
      const subcatId = req.params.subcategoryId;
      const designId = req.body.designMethodId;
      const result = await designQueries.attachDesignMethodToSubcategory(subcatId,designId);
      res.redirect(`/subcategory/${subcatId}/design-methods`);
    }catch(err){
      res.status(500).send(err.message);
    }
  },

  async removeDesignMethodFromSubcategory(req,res){
    try{
      const subcatId = req.params.subcategoryId;
      const designId = req.params.methodId;
      const result = await designQueries.removeDesignMethodFromSubcategory(subcatId,designId);
      res.redirect(`/subcategory/${subcatId}/design-methods`);
    }catch(err){
      res.status(500).send(err.message);
    }

  },

  // Update a design method document (update)
  async updateDesignMethod(req, res) {
    try {
      const id = req.params.id;
      const title = req.body.title;
      let query, params;

      // If a new document file is uploaded, update both title and document; otherwise, update only the title.
      if (req.file) {
        const fileBuffer = fs.readFileSync(req.file.path);
        // Remove temporary file
        fs.unlinkSync(req.file.path);
        const result = await designQueries.uptateDesignMethodWithFile(id,title,fileBuffer);
        return res.redirect(`/design-methods/${result.id}`)
      } else {
        const result = await designQueries.uptateDesignMethodWithoutFile(id,title);
        return res.redirect(`/design-methods/${result.id}`)
      }
      res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // Delete a design method document (delete)
  async deleteDesignMethod(req, res) {
    try {
      const id = req.params.id;
      const result = await designQueries.deleteDesignMethod(id);
      // res.json({ success: true });
      res.redirect('/design-methods')
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

}

module.exports = designController;
