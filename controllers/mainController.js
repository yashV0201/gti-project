const queries = require('../models/queries')

const mainController = {
    async showHome(req,res){
        try{
            const list = await queries.getNeedCategories();
            res.render('index.ejs',{list});
        }catch (err) {
            res.status(500).send(err.message);
        }
    },

    async showNeeds(req,res){
        try{
            const category = await queries.getNeedCategoryById(req.params.categoryId);
            const needs = await queries.getNeedsByNeedCategory(req.params.categoryId);
            res.render('needs.ejs',{needs,category});
        }catch (err) {
            res.status(500).send(err.message);
        }
    },

    async showSolutions(req,res){
        try{
            const need = await queries.getNeedById(req.params.subcategoryId);
            const solutions = await queries.getSolutions(req.params.subcategoryId);
            res.render('solutions.ejs',{need,solutions});

        }catch(err){
            res.status(500).send(err.message);
        }
    },

    async addNeed(req,res) {
        try {
            const result = await queries.addNeed(req.body.categoryId, req.body.name);
            const category = await queries.getNeedCategoryById(req.body.categoryId);
            const needs = await queries.getNeedsByNeedCategory(req.body.categoryId);
            res.render('needs.ejs',{needs,category});
            // res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async updateNeed(req,res){
        try{
            const result = await queries.updateNeed(req.params.id,req.body.name);
            const need = await queries.getNeedById(req.params.id);
            const category = await queries.getNeedCategoryById(need.category_id);
            const needs = await queries.getNeedsByNeedCategory(need.category_id);
            res.render('needs.ejs',{needs,category});
            // res.json(result);
        }catch(err){
            res.status(500).json({error:err.message});
        }
    },

    async deleteNeed(req,res){
        try{
            await queries.deleteNeed(req.params.id);
            res.json({success:true});
        }catch(err){
            res.status(500).json({error:err.message});
        }
    },

    async addSolution(req, res) {
        try {
            console.log('Received data:', req.body);
            const subcategoryId = req.body.subcategory_id;
            console.log(subcategoryId)
            const result = await queries.addSolution(subcategoryId, req.body.content);
            res.redirect(`/subcategory/${subcategoryId}`);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async updateSolution(req, res) {
        try {
            const solution = await queries.getSolutionById(req.params.id);
            const subcategoryId = solution.subcategory_id
            const result = await queries.updateSolution(req.params.id, req.body.content);
            res.redirect(`/subcategory/${subcategoryId}`);
            // res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async deleteSolution(req, res) {
        try {
            await queries.deleteSolution(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = mainController;