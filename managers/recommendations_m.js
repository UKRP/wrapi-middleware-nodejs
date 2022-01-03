class Recommendations_Manager {

    constructor(wp){
        this.wp = wp;
    }
    
    async postRecommendations(body){
        return await this.wp.getRecommendation({factors: ["TRENDING"], ...body});
    }
}

module.exports = Recommendations_Manager;