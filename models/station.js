const Response = require('./response');

const logger = require('../logger');
const tools = require('../tools');

class Station {

    constructor(data){
        this.data = data;
    }

    contains(string){
        return (this.data.description && this.data.description.toLowerCase().includes(string.toLowerCase())) || ( this.data.name && this.data.name.toLowerCase().includes(string.toLowerCase()));
    }

    getData(){
        return this.data;
    }

    async getOnAir(query, wp){
        if( !this.onAir ){
            this.onAir = {current: {data: null, nextUpdate: null}, next: {data: null, nextUpdate: null}};
        }
        let key = (query && query.next) ? 'next' : 'current';
        let params = {rpuids: [this.data.rpuid], ...query};
        if(!this.onAir[key] || new Date().getTime() > this.onAir[key].nextUpdate){
            let onAir = null;
            try {
                onAir = await wp.getOnAir(params);
                if(onAir.error) throw onAir.error;
                this.onAir[key].data = onAir.data[0];
                this.onAir[key].nextUpdate = tools.setCachingTimeout('onair', onAir.data[0].meta.cacheExpiresAt);
            }
            catch(error){
                this.onAir[key].data = null;
                logger.error('An error occured during Stations get onAir update.', error);
                if(error) throw error;
            }
        }
        return new Response(this.onAir[key].nextUpdate, this.onAir[key].data, params);
    }

    async getOnDemand(query, wp, seriesId){
        let params = {rpuid: this.data.rpuid, seriesId: seriesId, ...query};
        let type = 'ondemand';
        if(!this.ondemand){
            this.ondemand = {seriesId: {}, pure:{}};
        }
        else{
            let response = this.getPaginatedData((seriesId)? this.ondemand.seriesId[seriesId] : this.ondemand.pure, params, query, type);
            if(response) return response;
        }
        try {
            let ondemand = await wp.getStationOndemand(params);
            if(ondemand.error) throw ondemand.error;
            if(ondemand.meta.paginated){
                let size = (query.size)? query.size : 10;
                if(seriesId){
                    if(!this.ondemand.seriesId[seriesId]){this.ondemand.seriesId[seriesId] = {};}
                    if(!this.ondemand.seriesId[seriesId][ondemand.meta.pageNumber]){this.ondemand.seriesId[seriesId][ondemand.meta.pageNumber] = {};}
                    this.ondemand.seriesId[seriesId][ondemand.meta.pageNumber][size] = ondemand;
                    this.ondemand.seriesId[seriesId][ondemand.meta.pageNumber][size].nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                }
                else{
                    if(!this.ondemand.pure[ondemand.meta.pageNumber]){this.ondemand.pure[ondemand.meta.pageNumber] = {};}
                    this.ondemand.pure[ondemand.meta.pageNumber][size] = ondemand;
                    this.ondemand.pure[ondemand.meta.pageNumber][size].nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                }
                let list = (seriesId)? this.ondemand.seriesId[seriesId] : this.ondemand.pure;
                let response = new Response(list[ondemand.meta.pageNumber][size].nextUpdate, list[ondemand.meta.pageNumber][size].data, params, type);
                response.setPagination(ondemand.meta.pageNumber, ondemand.meta.pageSize, ondemand.meta.totalPages);
                return response;
            }
            else{
                if(seriesId){
                    this.ondemand.seriesId[seriesId] = ondemand;
                    this.ondemand.seriesId[seriesId].nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                }
                else{
                    this.ondemand.pure = ondemand;
                    this.ondemand.pure.nextUpdate = tools.setCachingTimeout(type, ondemand.meta.cacheExpiresAt);
                }
                let list = (seriesId)? this.ondemand.seriesId[seriesId] : this.ondemand.pure;
                return new Response(list.nextUpdate, list.data, params, type);
            }
        }
        catch(error){
            logger.error('An error occured during Stations get onDemand update.', error);
            if(error) throw error;
        }
    }

    getPaginatedData(list, params, query, type){
        if(list){
            if(list.data){
                if(new Date().getTime() > list.data.nextUpdate){
                    return new Response(list.nextUpdate, list.data, params, type);
                }
            }
            else{
                let page = (query.page)? query.page : 0;
                let size = (query.size)? query.size : 10;
                if(list[page] && list[page][size] && (list[page][size].meta.paginated || (list[page][size].meta.nesting && list[page][size].data[0].meta.paginated))){
                    if(new Date().getTime() < list[page][size].nextUpdate){
                        let response;
                        if(list[page][size].meta.nesting){
                            response = new Response(list[page][size].nextUpdate, list[page][size].data[0].data, params, type);
                            response.setPagination(list[page][size].data[0].meta.pageNumber, list[page][size].data[0].meta.pageSize, list[page][size].data[0].meta.totalPages);
                        }
                        else{
                            response = new Response(list[page][size].nextUpdate, list[page][size].data, params, type);
                            response.setPagination(list[page][size].meta.pageNumber, list[page][size].meta.pageSize, list[page][size].meta.totalPages);
                        }
                        return response;
                    }
                }
            }
        }
        return null;
    }

    async getSchedulePrograms(query, wp){
        let wrapi_params = {rpuids: [this.data.rpuid], ...query};
        let rqt_params = {rpuid: this.data.rpuid, ...query};
        let type = 'schedule';
        if(query && query.from){
            return await wp.getSchedule(wrapi_params);
        }
        else{
            if(!this.schedule){
                this.schedule = {};
            }
            else{
                let response = this.getPaginatedData(this.schedule, rqt_params, query, type);
                if(response) return response;
            }
            try {
                let schedule = await wp.getSchedule(wrapi_params);
                if(schedule.error) throw schedule.error;
                if(schedule.data[0].meta.paginated){
                    let size = (query.size)? query.size : 10;
                    if(!this.schedule[schedule.data[0].meta.pageNumber]){this.schedule[schedule.data[0].meta.pageNumber] = {};}
                    this.schedule[schedule.data[0].meta.pageNumber][size] = schedule;
                    this.schedule[schedule.data[0].meta.pageNumber][size].nextUpdate = tools.setCachingTimeout(type, schedule.data[0].meta.cacheExpiresAt);
                    let response = new Response(this.schedule[schedule.data[0].meta.pageNumber][size].nextUpdate, this.schedule[schedule.data[0].meta.pageNumber][size].data[0].data, rqt_params);
                    response.setPagination(schedule.data[0].meta.pageNumber, schedule.data[0].meta.pageSize, schedule.data[0].meta.totalPages);
                    return response;
                }
                else{
                    this.schedule = schedule;
                    this.schedule.nextUpdate = tools.setCachingTimeout(type, schedule.data[0].cacheExpiresAt);
                    return new Response(this.schedule.nextUpdate, this.schedule.data, rqt_params);
                }
                
            }
            catch(error){
                logger.error('An error occured during Stations get Scheduling update.', error);
                if(error) throw error;
            }
        }
    }
    
    gotBearerId(id){
        return this.data.bearers.some((bearer) => bearer.id === id);
    }

    include(keys){
        const keys_list = keys.split(',');
        return keys_list.every(key => key in this.data);
    }

    keepExtraData(station){
        let __this = this;
        Object.keys(station).forEach(key => {
            if(key != 'data'){
                __this[key] = station[key];
            }
        });
    }
}

module.exports = Station;