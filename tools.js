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

module.exports = {
    setCachingTimeout
}