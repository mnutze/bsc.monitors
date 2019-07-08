importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js");
importScripts("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.js");
importScripts("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

self.addEventListener("message", function (event) {

    let profile = event.data.profile;
    let range = event.data.range;
    let subject = event.data.subject;
    let teams = event.data.teams;
    let course = event.data.course;

    let data = event.data.data;
    // assign log data
    data = data.log;

    if (!data || data.length < 1)
        return;

    let domain = [ new Date(data[0].created_at), new Date(data[data.length-1].created_at)];

    let emptyHistogram = cmMonitorHelper.time.histogram([], domain, cmMonitorHelper.time.mondayWeek(), 1);

    if (range && range.range === "weeks")
        range.values = emptyHistogram;

    let aggregated = data.reduce((prev, curr) => { // @TODO make it subject ready
        if(!prev[cmMonitorHelper.deepValue(curr, subject.key)])
            prev[cmMonitorHelper.deepValue(curr, subject.key)] = [{...curr}];
        else
            prev[cmMonitorHelper.deepValue(curr, subject.key)].push({...curr});
        return prev;
    },{});

    let subjects = Object.entries(aggregated).map(subject => ({
        key: subject[0],
        histograms: cmMonitorHelper.time.histogram(subject[1], domain, cmMonitorHelper.time.mondayWeek(), 1)
    }));

    let weekSelector = 0;
    if (!range.current)
        emptyHistogram.forEach((histogram, id) => {
            if (moment(new Date()).subtract(7, "day") > histogram.x0 &&
                moment(new Date()).subtract(7, "day") < histogram.x1)
                weekSelector = id;
        });
    else
        emptyHistogram.forEach((histogram, id) => {
            if (range.current[0] >= histogram.x0 &&
                range.current[1] <= histogram.x1)
                weekSelector = id;
        });
    let classificationLegend = "Q1: heading | Q2: lowering | Q3: at risk | Q4: improving";

    function humanReadable (key) {
        if ( checkSubject(key) && key === profile.user )
            return "You";
        else if (course.humanReadable && course.humanReadable.learners && course.humanReadable.learners[key])
            return course.humanReadable.learners[key];
        else
            return key;
    }

    let series = subjects.map(subject => ({
        name: teams ? course.teams[subject.key].name : humanReadable(subject.key),
        color: checkSubject(subject.key) ? cmMonitorHelper.colors[6] : "#000",
        marker: checkSubject(subject.key) ? { radius: 4 } : {},
        zIndex: checkName(subject.key) ? teams ? 9999 : 9999 : undefined,
        data: [[subject.histograms[weekSelector].length, subject.histograms.slice(0,weekSelector+1).reduce((prev, curr) => curr.length + prev, 0)/weekSelector+1]]
    }));

    let maxY = Math.max(...series.map(point => point.data[0][1]));
    let maxX = Math.max(...series.map(point => point.data[0][0]));

    let weekLabel = range.current ?
        "W " + moment(range.current[0]).isoWeek() + "/" + moment(range.current[0]).format('YYYY') :
        "W " + moment(range.values[weekSelector].x0).isoWeek() + "/" + moment(range.values[weekSelector].x0).format('YYYY');

    self.postMessage({
        "chart.type": "scatter",
        "subtitle.text": "<b>" + weekLabel + "</b><br/>" + classificationLegend,
        "subtitle.align": "right",
        xAxis: {
            gridLineWidth: 0,
            title: { enabled: true, text: "\u2140 Activities - " + weekLabel, offset: 25 },
            plotLines: [ { color: "#ccc", value: maxX/2, width: 1 } ],
        },
        yAxis: {
            title: { text: "\u00D8 Activities per week", offset: 40 },
            max: null,
            endOnTick: false,
            gridLineWidth: 0,
            plotLines: [
                { color: "#ccc", value: maxY/2, width: 1 },
                { value: 0, label: { text: "<b>Q4</b>", useHTML: true, align: 'right', x: -5, y: -10 } },
                { value: maxY, label: { text: "<b>Q1</b>", useHTML: true, align: 'right', x: -5, y: -5 } },
                { value: maxY, label: { text: "<b>Q2</b>", useHTML: true, x: -5, y: -5 } },
                { value: 0, label: { text: "<b>Q3</b>", useHTML: true, x: -5, y: -10 } }
            ],
        },
        legend: { enabled: false },
        plotOptions: {
            scatter: {
                marker: { symbol: "circle", radius: 2 },
                tooltip: {
                    headerFormat: "<b>{series.name}</b><br>",
                    pointFormat: "\u2140 {point.x} Activities  " + weekLabel + " | \u00D8 {point.y} Activities per week",
                }
            }
        },
        rangeValues: range.values,
        series: series
    });

    function checkSubject (val) {
        if (subject.values && subject.values.includes(val))
            return true;
        else if (!profile)
            return false;
        else if (profile.user !== val)
            return false;
        else
            return true;
    }

    function checkName (val) {
        if (subject.values && subject.values.includes(val))
            return true;
        if (!profile)
            return false;
        else return !(profile.name.length < 1 || profile.user !== val);
    }
}, false);
