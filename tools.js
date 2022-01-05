const Response = require('./models/response');

function setCachingTimeout(type, minimum){
    let cachingTimeout = 0;
    switch(type){
        case 'onair':
            cachingTimeout = (Boolean(process.env.CUSTOM_CACHING))? (!isNaN(process.env.ONAIR_CACHING))? new Date().getTime() + parseInt(process.env.ONAIR_CACHING) : minimum : minimum;
            break;
        case 'schedule':
            cachingTimeout = (Boolean(process.env.CUSTOM_CACHING))? (!isNaN(process.env.SCHEDULE_CACHING))? new Date().getTime() + parseInt(process.env.SCHEDULE_CACHING) : minimum : minimum;
            break;
        case 'ondemand':
            cachingTimeout = (Boolean(process.env.CUSTOM_CACHING))? (!isNaN(process.env.ONDEMAND_CACHING))? new Date().getTime() + parseInt(process.env.ONDEMAND_CACHING) : minimum : minimum;
            break;
        case 'stations':
            cachingTimeout = (Boolean(process.env.CUSTOM_CACHING))? (!isNaN(process.env.STATIONS_CACHING))? new Date().getTime() + parseInt(process.env.STATIONS_CACHING) : minimum : minimum;
            break;
        case 'categories':
            cachingTimeout = (Boolean(process.env.CUSTOM_CACHING))? (!isNaN(process.env.CATEGORIES_CACHING))? new Date().getTime() + parseInt(process.env.CATEGORIES_CACHING) : minimum : minimum;
            break;
    }
    return cachingTimeout;
}


function getPaginatedData(list, params, query, type){
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

module.exports = {
    getPaginatedData,
    setCachingTimeout
}