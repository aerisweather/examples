/**
 * Created by Lee on 11/17/15.
 * Copyright 2015, AerisWeather
 */

/*
    Constructor
 */
function AerisStormReports(lMap, opts) {

    this.lMap = lMap;
    this.layer = null;

    this.abort = false;
    this.timer = null;

    this.opts = {
        'clientId': '',
        'clientKey': '',
        'src': 'http://api.aerisapi.com/stormreports/within?p=0,-180,90,180&from=[FROM]&to=[TO]&limit=2000&format=geojson&client_id=[CID]&client_secret=[KEY]',
        'reportsFrom': '-24hours',
        'reportsTo': 'now',
        'autoLoad': true,
        'refreshInterval': 5 * 60000, // 5 minutes
        'attribution': ' | Weather Data &copy; <a href="http://www.aerisweather.com" target="_blank">AerisWeather</a>',
        'styles': {
            default: {
                radius: 6,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                color: '#444'
            },
            avalanche: {
                fillColor: '#89c1ef'
            },
            blizzard: {
                fillColor: '#6800e6'
            },
            flood: {
                fillColor: '#138b00'
            },
            fog: {
                fillColor: '#767676'
            },
            ice: {
                fillColor: '#e700e5'
            },
            hail: {
                fillColor: '#77e3f7'
            },
            lightning: {
                fillColor: '#8c8c8c'
            },
            rain: {
                fillColor: '#45e300'
            },
            snow: {
                fillColor: '#2379f0'
            },
            tides: {
                fillColor: '#51dc97'
            },
            tornado: {
                fillColor: '#d10000',
                radius: 8
            },
            wind: {
                fillColor: '#ded000'
            },
            marine: {
                fillColor: '#07fff3'
            },
            dust: {
                fillColor: '#767676'
            },
            fire: {
                fillColor: '#e4087d'
            }

        }
    };

    // allow user passed options to extend defaults
    if (opts) this.opts = $.extend(true, this.opts, opts);

    this.opts.src = this.opts.src.replace('[CID]', this.opts.clientId);
    this.opts.src = this.opts.src.replace('[KEY]', this.opts.clientKey);

    // lets load the storm reports
    if (this.opts.autoLoad) this.loadData();

    return this;
}

/*
    Clear the layer from the leaflet map & clear the
    refresh timer
 */
AerisStormReports.prototype.clear = function () {

    if (this.layer) {
        this.lMap.removeLayer(this.layer);
        this.layer = null;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abort = true;
};


/*
    Load the data and add to the map.
    Enables a refresh timer for auto updating the data.

 */
AerisStormReports.prototype.loadData = function () {
    var self = this;

    this.abort = false;
    var url = self.opts.src.replace('[FROM]', self.opts.reportsFrom);
    url = url.replace('[TO]', self.opts.reportsTo);

    $.ajax({
        'dataType': "json",
        'url': url,
        'success': function (data) {

            // Check to see if we should abort.
            // i.e. clear was called during an existing data fetch request
            // Useful to prevent redrawing on map, if user removes layer
            // during an auto refresh
            if (self.abort) {
                self.abort = false;
                return;
            }
            self.clear();
            if (data['features']) {
                myLayer = L.geoJson(data.features, {
                    'pointToLayer': function (feature, latlng) {
                        var props = feature.properties;
                        var cat = props.report.cat;

                        // determine the styles
                        // combining the default with the overriding styles
                        // for the storm report category (if one)
                        var tOpt = {};
                        if (self.opts.styles.hasOwnProperty(cat)) {
                            tOpt = $.extend({}, self.opts.styles.default, self.opts.styles[cat]);
                        }
                        else {
                            tOpt = self.opts.styles.default;
                        }

                        // create our circle marker with the specific styles
                        var marker = L.circleMarker(latlng, tOpt);

                        // add a simple popup. Expand to display more info.
                        var srType = props.report.type.replace(/\b[a-z]/g, function (letter) {
                            return letter.toUpperCase();
                        });
                        var comments = (props.report.hasOwnProperty('comments')) ? props.report.comments : '';

                        marker.bindPopup('<strong>' + srType + '</strong><br/>' + comments);

                        // this code will allow the pop up on mouse over
                        marker.on('mouseover', function () {
                            this.openPopup();
                        });

                        return marker;
                    }
                });

                myLayer.getAttribution = function () { return self.opts.attribution;};

                // add the layer to the map and
                // save a local reference. We use a timer to auto refresh
                // the points every xx minutes.
                myLayer.addTo(self.lMap);
                self.layer = myLayer;


                self.timer = setTimeout(function () {
                    if (self.layer) self.loadData();
                }, self.opts.refreshInterval);

            }
        }
    }).error(function () {
        console.log('error loading StormCellSummary');
    });
};

AerisStormReports.prototype.setFrom = function (s) {
    this.opts.reportsFrom = s;
};

AerisStormReports.prototype.setTo = function (s) {
    this.opts.reportsTo = s;
};
