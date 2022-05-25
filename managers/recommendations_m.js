class Recommendations_Manager {

    constructor(wp){
        this.wp = wp;
        this.cache = new Map();
    }
    
    async postRecommendations(body){
        let key = this.generateKey(body);
        if(!this.cache.has(key) || this.cache.get(key).date < new Date().getTime()){
            let response = await this.wp.getRecommendation({...body});
            this.cache.set(key, {date: (response.meta.cacheExpiresAt)? response.meta.cacheExpiresAt : new Date().getTime(), data: response});
        }
        return this.cache.get(key).data;
    }

    generateKey(obj){
        return 'country' + obj.country + 'rpuid' + obj.rpuid + 'factors' + obj.factors + 'latitude' + obj.latitude + 'longitude' + obj.longitude + 'facebookArtists' + obj.facebookArtists + 'artistPlayCounts' + obj.artistPlayCounts + 'onDemand' + obj.onDemand;
    }
}

module.exports = Recommendations_Manager;