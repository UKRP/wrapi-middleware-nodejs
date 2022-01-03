const Response = require('../models/response');
const Station = require('../models/station');

const logger = require('../logger');
const tools = require('../tools');

class Stations_Manager {

    constructor(wp){
        this.wp = wp;
		this.loadStations(wp);
    }

    radioExist(rpuid){
        return !!this.list[rpuid];
    }

    /* 
     *	Returns all information on all stations, unless filtered by parameters. 
     *	Also provides the ability to search for stations in a number of ways including keyword searching,
     *	category searching, search by bearers and search for local station.
     */
    async getAllStations(query){
        if(query.geo) {return await this.wp.getStations(query);}
        let stations = [];
        for(const station_rpuid in this.list){
            if(!query){
                stations.push(this.list[station_rpuid].getData());
            }
            else {
                if(query.include){
                    if(!this.list[station_rpuid].include(query.include)) continue;
                }
                if(query.country){
                    if(!(this.list[station_rpuid].data.country === query.country)) continue;
                    if(query.search){
                        if(!this.list[station_rpuid].contains(query.search)) continue;
                    }
                }
                if(query.bearerId){
                    if(!this.list[station_rpuid].gotBearerId(query.bearerId)) continue;
                }
                stations.push(this.list[station_rpuid].getData());
            }
        }
        if(query.sort){
            stations = stations.sort((a, b) => {
                var nameA = a.name.toUpperCase(); 
                var nameB = b.name.toUpperCase();
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        return new Response(this.nextUpdate, stations, query, 'stations');
    }
    
    /* 
     *	Provides current “track now playing” or “track next playing” information from one or multiple radio stations.
     */
    async getOnAirStations(rpuids, query){
        let answer = [];
        for(let rpuid of rpuids.split(',')){
            if(this.list[rpuid]) answer.push(await this.list[rpuid].getOnAir(query, this.wp));
        }
        return new Response(0, answer, {}, 'onair');
    }

    async getOnDemand(rpuid, query, seriesId){
        return await this.list[rpuid].getOnDemand(query, this.wp, seriesId);
    }

    /* 
     *	Returns programme schedules for radio stations.
     */
    async getScheduleStationsPrograms(rpuids, query){
        let answer = [];
        for(let rpuid of rpuids.split(',')){
            if(this.list[rpuid]) answer.push(await this.list[rpuid].getSchedulePrograms(query, this.wp));
        }
        return new Response(0, answer, {}, 'schedule');
    }

    /* 
     *	Returns all informations on particulars stations, identified by their rpuid and may be 
     *  filtred by params 'include'.
     */
    getStations(rpuids, query){
        let stations = [];
        for(const rpuid of rpuids.split(',')){
            if(this.list[rpuid]){
                if(query.include){
                    if(!this.list[rpuid].include(query.include)) continue;
                }
                stations.push(this.list[rpuid].getData());
            }
        }
        return new Response(this.nextUpdate, stations, query, 'stations');
    }
    
    loaded(){
        if(this.list) return true;
        return false;
    }

	async loadStations(wp){
		try {
            const stations = await wp.getStations({});
            if(stations.error) throw stations.error;
            let list = {};
            for(let station_rpuid in stations.data){
                list[stations.data[station_rpuid].rpuid] = new Station(stations.data[station_rpuid]);
            }
            this.updateList(list);
            this.nextUpdate = tools.setCachingTimeout('stations', stations.meta.cacheExpiresAt);
            let __this = this;
            setTimeout(async () => __this.loadStations(wp), __this.nextUpdate - new Date().getTime());
		}
		catch(error){
            logger.error('An error occured during Stations update.', error);
		}
	}

    updateList(list){
        if(this.list){
            for(let station_rpuid in list){
                if(this.list[station_rpuid]){
                    list[station_rpuid].keepExtraData(this.list[station_rpuid]);
                }
            }
        }
        this.list = list;
    }
}

module.exports = Stations_Manager;