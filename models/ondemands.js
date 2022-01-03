const Response = require('./response');

const tools = require('../tools');

class OnDemands {

    constructor(){
    }

    async getOnDemand(query, wp){
        // Results got pagination but we can't send page or size parameters in request, we can't use cache ...
        return await wp.getOnDemand(query);
        // Categories aren't in response keys we got, we can't use cache
        if(query.category) return await wp.getOnDemand(query);
        // For request without category query, update object with all country data to put it in cache, filter result if needed then send it
        if(!this.data || new Date().getTime() > this.nextUpdate){
            let data = await wp.getOnDemand({country: query.country, page:1});
            this.data = data.data;
            this.meta = data.meta; 
            this.nextUpdate = tools.setCachingTimeout('ondemand', data.meta.cacheExpiresAt);
        }

        let result = [];
        for(const it in this.data){
            // If filter by rpuids
            if(query.rpuids){
                if(!query.rpuids.split(',').some(rpuid => rpuid === this.data[it].rpuid)) continue;
            }
            // If filter by a string
            if(query.search){
                if(!(
                    (this.data[it].description && this.data[it].description.toLowerCase().includes(query.search.toLowerCase())) || 
                    (this.data[it].name && this.data[it].name.toLowerCase().includes(query.search.toLowerCase()))
                )){
                    continue;
                }
            }
            result.push(this.data[it]);
        }
        return new Response(this.nextUpdate, result, query, 'ondemand');
    }
}

module.exports = OnDemands;