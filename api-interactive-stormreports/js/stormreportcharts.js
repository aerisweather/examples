/**
 * Created by Lee on 5/12/16.
 */

// Adjust the following to your client ID and client secret
var AWClientID = "XXXXXXX";
var AWClientSecret = "YYYYYY";


// preset source variables
var stormReportSrc = "https://api.aerisapi.com/stormreports/search?query=country:us&from=-7days&to=now&limit=1000&sort=dt&client_id=" + AWClientID + "&client_secret=" + AWClientSecret;
var topoSrc = 'data/usstates.json';

// set color scale for bar chart
var stormReportColorScale = d3.scale.ordinal().domain(["Avalanche", "Blizzard", "Flood", "Flood", "Fog", "Ice", "Hail", "Lightning", "Rain", "Snow", "Tides", "Tornado", "Wind", 'Marine', 'Dust', 'Fire', 'Other'])
    .range(["#89c1ef", "#6800e6", "#138b00", "#767676", "#e700e5", "#77e3f7", "#8c8c8c", "#45e300", "#2379f0", "#51dc97", "#d10000", "#ded000", '#07fff3', '#767676', '#e4087d', '#555c69']);


// initialize the charts
var dataCountChart = dc.dataCount('#dc-datacount');
var catRowChart = dc.rowChart('#dc-cat-chart');
var stateChart = dc.geoChoroplethChart('#dc-state-chart');
var dayChart = dc.barChart('#dc-day-chart');
var hourChart = dc.barChart('#dc-hour-chart');


// fetch the data
queue()
    .defer(d3.json, topoSrc)
    .defer(d3.json, stormReportSrc)
    .await(createCharts);


// plot the charts
function createCharts(error, us, data) {

    // simple error handler
    if (error) {
        alert("Error fetching storm reports. Make sure to set the client id and key.");
        return;
    }


    // clean up data
    var reports = data.response;
    reports.forEach(function (d) {
        var cat = d.report.cat;
        if (!cat) cat = 'other';
        d.cat = cat.replace(/^([a-z])|\s+([a-z])/g, function ($1) {
            return $1.toUpperCase();
        });

        d.validTime = new Date(d.report.timestamp * 1000);
    });

    // run data through crossfilter
    var facts = crossfilter(reports);
    var all = facts.groupAll();

    // create dimensions and groups

    // report categories
    var reportCat = facts.dimension(function (d) {
        return d.cat;
    });
    var reportCatGroup = reportCat.group();


    // state group. Used for conus map, # storms per state
    var state = facts.dimension(function (d) {
        return d.place.state;
    });
    var statesGroup = state.group()
        .reduceCount(function (d) {
            return d.place.state;
        });

    // define a daily volume Dimension
    var day = facts.dimension(function (d) {
        return d3.time.day(d.validTime);
    });
    // map/reduce to group sum
    var dayGroup = day.group()
        .reduceCount(function (d) {
            return d.validTime;
        });

    // by hours group
    var hour = facts.dimension(function (d) {
        return d.validTime.getHours();
    });
    var hourGroup = hour.group();

    // data count
    dataCountChart
        .dimension(facts)
        .group(all);


    // category chart
    // calculate the max Count to set the domain of the x axis.
    var maxTypeCount = d3.max(reportCatGroup.all().map(function (d, i) {
            return d.value;
        })) + 25;
    catRowChart
        .height(275)
        .margins({top: 5, right: 10, bottom: 20, left: 5})
        .transitionDuration(1000)
        .dimension(reportCat)
        .group(reportCatGroup)
        .colors(function (d) {
            return stormReportColorScale(d);
        })
        .x(d3.scale.sqrt().domain([0, maxTypeCount]).range([0, 290]))
        .elasticX(false);
    catRowChart.xAxis().ticks(5);


    // state chart
    // calculate the max Count to set the domain of the x axis.
    var maxStates = d3.max(statesGroup.all().map(function (d, i) {
        return d.value;
    }));
    stateChart
        .width(500)
        .height(400)
        .transitionDuration(1000)
        .dimension(state)
        .group(statesGroup)
        .colors(d3.scale.linear().domain([0, maxStates]).range(['azure', 'blue']))

        .colorDomain([0, maxStates])
        .colorCalculator(function (d) {
            if (typeof(d) == 'undefined') return '#fff';
            return d ? stateChart.colors()(d) : '#fff';
        })
        .projection(d3.geo.albersUsa()
            .scale(600)
            .translate([250, 200
            ]))
        .overlayGeoJson(topojson.feature(us, us.objects.usStates).features, 'state', function (d) {
            return d.properties.STATE_ABBR.toLowerCase();
        });


    // day chart
    // calculate the max Count to set the domain of the x axis.
    var dayExtent = d3.extent(reports, function (d) {
        return d.validTime;
    });
    var diffDays = Math.round(Math.abs((dayExtent[0].getTime() - dayExtent[1].getTime()) / 86400000));
    if (diffDays > 10) diffDays = 10;

    var maxDayCount = d3.max(dayGroup.all().map(function (d, i) {
        return (d.key > 0) ? d.value : 0;
    }));

    dayChart
        .height(200)
        .margins({top: 10, right: 10, bottom: 35, left: 35})
        .dimension(day)
        .group(dayGroup)
        .centerBar(true)
        .gap(50)
        .x(d3.time.scale().domain(dayExtent))
        .y(d3.scale.sqrt().domain([0, maxDayCount]))
        .elasticY(false)
        .xUnits(d3.time.days)
        .round(d3.time.day.round)
        .alwaysUseRounding(true)
        .renderHorizontalGridLines(true)
    ;
    dayChart.yAxis().ticks(5);
    dayChart.xAxis().ticks(diffDays);


    // hour chart
    // calculate the max Count to set the domain of the x axis.
    var maxHourCount = d3.max(hourGroup.all().map(function (d, i) {
        return (d.key > 0) ? d.value : 0;
    }));
    hourChart
        .height(200)
        .margins({top: 10, right: 10, bottom: 35, left: 35})
        .dimension(hour)
        .group(hourGroup)
        .centerBar(true)
        .x(d3.scale.linear().domain([-.5, 23.5]))
        .y(d3.scale.sqrt().domain([0, maxHourCount]))
        .elasticY(false)
        .renderHorizontalGridLines(true)
    ;
    hourChart.yAxis().ticks(5);
    hourChart.xAxis().ticks(24);

    // Draw the charts!
    dc.renderAll();
}