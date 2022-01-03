const Response = require('./response');

const tools = require('../tools');

class Categories {

    constructor(){
    }

    async getCategories(params, wp){
        if(!this.data){
           this.data = {};
        }
        if(!this.data[params.type] || new Date().getTime() > this.data[params.type].nextUpdate){
            try {
                let categories = await wp.getCategories({type:params.type, country: params.country});
                if(categories.error) throw categories.error;
                this.data[params.type] = categories;
                this.data[params.type].nextUpdate = tools.setCachingTimeout('categories', categories.meta.cacheExpiresAt);
            }
            catch(error){
                this.categories[params.type].data = null;
                logger.error('An error occured during Categories update.', error);
                if(error) throw error;
            }
        }
        return new Response(this.data[params.type].nextUpdate, this.data[params.type].data, params, 'categories');
    }
}

module.exports = Categories;