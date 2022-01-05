const Response = require('./response');

const logger = require('../logger');
const tools = require('../tools');

class OnDemands {

    constructor(){
    }

    async getOnDemand(query, wp){
        if(query.category || query.search || query.rpuids) return await wp.getOnDemand(query);
        let type = 'ondemand';
        if(!this.ondemand){
            this.ondemand = {};
        }
        else{
            let response = tools.getPaginatedData(this.ondemand, query, query, type);
            if(response) return response;
        }
        try {
            let ondemand = await wp.getOnDemand(query);
            if(ondemand.error) throw ondemand.error;
            if(ondemand.meta.paginated){
                let size = (query.size)? query.size : 10;
                if(!this.ondemand[ondemand.meta.pageNumber]){this.ondemand[ondemand.meta.pageNumber] = {};}
                this.ondemand[ondemand.meta.pageNumber][size] = ondemand;
                this.ondemand[ondemand.meta.pageNumber][size].nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                let response = new Response(this.ondemand[ondemand.meta.pageNumber][size].nextUpdate, this.ondemand[ondemand.meta.pageNumber][size].data, query, type);
                response.setPagination(ondemand.meta.pageNumber, ondemand.meta.pageSize, ondemand.meta.totalPages);
                return response;
            }
            else{
                this.ondemand = ondemand;
                this.ondemand.nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                return new Response(this.ondemand.nextUpdate, this.ondemand.data, query, type);
            }
        }
        catch(error){
            logger.error('An error occured during Stations get onDemand update.', error);
            if(error) throw error;
        }
    }
}

module.exports = OnDemands;