'use strict'

Module.register('MMM-FlightRadarTracker',{

    defaults: {
    	centerPoint: [60.168489, 24.939830],
		distance: 60,
		limit: 5,
		updateInterval: 180,
        altitudeUnits: config.units,
        speedUnits: config.units,
		showSpeed: true,
		showAltitude: true,
		showHeading: true,
		showType: true,
		showAirline: true,
        passingByThreshold: 15000,
		showDirectionAsArrow: true,
		noPlanesLabel: "No planes nearby",
		atTheWindowLabel: "At the window",
		passingByLabel: "Passing by"
    },

    aircrafts: [],

    start: function() {
		var self = this;
		this.getData();
		setInterval(function () {
			self.getData();
		}, self.config.updateInterval * 1000);		
    },
	
    getStyles: function () {
        return [
            'font-awesome.css',
            'MMM-FlightRadarTracker.css'
        ];
    },	
	
	getData: function() {
        this.sendSocketNotification("MMM-FlightRadarTracker_UPDATE_DATA", this.config);
	},

    socketNotificationReceived: function (notification, payload) {
        if (notification === "MMM-FlightRadarTracker_DATA_RECEIVED") {
            const isUpdated = JSON.stringify(this.aircrafts) !== JSON.stringify(payload);
            if (isUpdated) {
                this.aircrafts = payload;
                this.updateDom();
            }
        }
    },
	
	getDom: function() {
        console.log(this.config);
		
		const wrapper = document.createElement('div');
        wrapper.className = 'flight-tracker';

        if (this.aircrafts.length === 0) {
            wrapper.className = 'light small dimmed';
            wrapper.innerHTML = this.config.noPlanesLabel;
            return wrapper;
        }

        if (this.config.passingByThreshold > 0) {
            const windowPlanes = this.aircrafts.filter(aircraft => aircraft.altitude * (aircraft.unit === 0 && this.config.altitudeUnits === 'metric' ? 0.3040 : 1) <= this.config.passingByThreshold);
            if (windowPlanes.length > 0) {
                wrapper.appendChild(this.getSection(windowPlanes, this.config.atTheWindowLabel));
            }
            const passingByPlanes = this.aircrafts.filter(aircraft => aircraft.altitude * (aircraft.unit === 0 && this.config.altitudeUnits === 'metric' ? 0.3040 : 1) > this.config.passingByThreshold);
            if (passingByPlanes.length > 0) {
                wrapper.appendChild(this.getSection(passingByPlanes, this.config.passingByLabel));
            }
        } else {
            wrapper.appendChild(this.getSection(this.aircrafts));
        }

        return wrapper;
    },

    getSection(aircrafts, label) {
        const section = document.createElement('div');
        if (label) {
            section.innerHTML = `<p class="light small dimmed label">${label}</p>`;
        }

        section.append(...aircrafts.map(aircraft => {
            const row = document.createElement('div');
            row.className = 'aircraft';

            const aircraftHeading = document.createElement('div');
            aircraftHeading.className = 'aircraft-heading medium';
            aircraftHeading.innerHTML = `<span class="bright">${aircraft.callsign}</span>`;
            if (this.config.showAirline && aircraft.airline) {
                aircraftHeading.innerHTML += `&nbsp;<span class="small dimmed airline">/${aircraft.airline}</span>`
            }
            row.appendChild(aircraftHeading);

            const altitude = aircraft.altitude
                ? Math.floor(aircraft.altitude * (this.config.altitudeUnits === 'metric' ? 0.3040 : 1))
                : null;

            const subHeading = [];
            if (this.config.showType && aircraft.type) {
                subHeading.push(`<span>${aircraft.type}</span>`);
            }
            if (altitude < this.config.passingByThreshold && aircraft.distance) {
                const distance = aircraft.distance * (this.config.altitudeUnits === 'metric' ? 1 : 3.28084);
                subHeading.push(`<span><i class="fas fa-location-arrow dimmed"></i>${Math.floor(distance)}<sup>${this.config.altitudeUnits === 'metric' ? 'm' : 'ft'}</sup></span>`);
                if (aircraft.bearing) {
					if (this.config.showDirectionAsArrow) {
                        subHeading.push(`<i class="fa fa-long-arrow-up" style="transform:rotate(${aircraft.bearing}deg); margin-left: 0.5em;"></i>`);
					}
					else {
						subHeading.push(`<span>${this.cardinalDirection(aircraft.bearing)}</span>`);
					}
                }
            }
            if (subHeading.length > 0) {
                const aircraftSubHeading = document.createElement('div');
                aircraftSubHeading.className = 'aircraft-subheading xsmall dimmed';
                aircraftSubHeading.innerHTML = subHeading.join('');
                row.appendChild(aircraftSubHeading);
            }

            const metadata = [];
            if (this.config.showSpeed && aircraft.speed) {
                let speed;
                let speedUnits;
                switch (this.config.speedUnits) {
                    case 'metric':
                        speed = aircraft.speed * 1.8520008892119;
                        speedUnits = 'km/h';
                        break;
                    case 'imperial':
                        speed = aircraft.speed * 1.15078;
                        speedUnits = 'mph';
                        break;
                    case 'knots':
                    default:
                        speed = aircraft.speed;
                        speedUnits = this.translate('knots');
                }
                metadata.push(`<small><i class="fas fa-wind dimmed"></i>${Math.floor(speed)}<sup>${speedUnits}</sup></small>`);
            }
            if (this.config.showAltitude && aircraft.altitude) {
                let altitudeIconId;
                if (aircraft.verticalRate < 0) {
                    altitudeIconId = 'fa-angle-double-down';
                } else if (aircraft.verticalRate > 0) {
                    altitudeIconId = 'fa-angle-double-up';
                } else {
                    altitudeIconId = 'fa-arrows-alt-h';
                }
                metadata.push(`<small><i class="fas ${altitudeIconId} dimmed"></i>${altitude}<sup>${this.config.altitudeUnits === 'metric' ? 'm' : 'ft'}</sup></small>`);
            }
            if (this.config.showHeading && aircraft.heading) {
                metadata.push(`<small><i class="far fa-compass dimmed"></i>${Math.floor(aircraft.heading)}<sup>○</sup></small>`);
            }
            if (metadata.length > 0) {
                const aircraftMetadata = document.createElement('div');
                aircraftMetadata.className = 'aircraft-metadata medium normal';
                aircraftMetadata.innerHTML = metadata.join('');
                row.appendChild(aircraftMetadata);
            }

            return row;
        }));

        return section;
    },

    cardinalDirection(direction) {
        if (direction> 11.25 && direction<= 33.75){
            return this.translate('NNE');
        } else if (direction> 33.75 && direction<= 56.25) {
            return this.translate('NE');
        } else if (direction> 56.25 && direction<= 78.75) {
            return this.translate('ENE');
        } else if (direction> 78.75 && direction<= 101.25) {
            return this.translate('E');
        } else if (direction> 101.25 && direction<= 123.75) {
            return this.translate('ESE');
        } else if (direction> 123.75 && direction<= 146.25) {
            return this.translate('SE');
        } else if (direction> 146.25 && direction<= 168.75) {
            return this.translate('SSE');
        } else if (direction> 168.75 && direction<= 191.25) {
            return this.translate('S');
        } else if (direction> 191.25 && direction<= 213.75) {
            return this.translate('SSW');
        } else if (direction> 213.75 && direction<= 236.25) {
            return this.translate('SW');
        } else if (direction> 236.25 && direction<= 258.75) {
            return this.translate('WSW');
        } else if (direction> 258.75 && direction<= 281.25) {
            return this.translate('W');
        } else if (direction> 281.25 && direction<= 303.75) {
            return this.translate('WNW');
        } else if (direction> 303.75 && direction<= 326.25) {
            return this.translate('NW');
        } else if (direction> 326.25 && direction<= 348.75) {
            return this.translate('NNW');
        } else {
            return this.translate('N');
        }
	}		
});
