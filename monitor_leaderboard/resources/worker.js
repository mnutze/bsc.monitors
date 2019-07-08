importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js");
importScripts("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.js");
importScripts("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

self.addEventListener("message", function (event) {

    let colors = event.data.colors;
    let course = event.data.course;
    let data = event.data.data;
    let groupByConfig = event.data.groupBy;
    let limitConfig = event.data.limit;
    let rangeConfig = event.data.range;
    let renderConfig = event.data.render;
    let sortConfig = event.data.sort;
    let subjectConfig = event.data.subject;

    // assign log data
    data = data.log;

    if (!data || data.length < 1)
        return;
    
    if (rangeConfig.range === "lessons") {
        let lessons = course.lessons;
        if (!rangeConfig.current) {
            let today = new Date();
            rangeConfig.current = Object.entries(lessons)
                .filter(lesson => (today > new Date(lesson[1].start) && (today < new Date(lesson[1].deadline))))[0];
            if (!rangeConfig.current)
                rangeConfig.current = {[Object.keys(lessons)[Object.keys(lessons).length-1]]: lessons[Object.keys(lessons)[Object.keys(lessons).length-1]]};
            if (Array.isArray(rangeConfig.current))
                rangeConfig.current = { [rangeConfig.current[0]]: rangeConfig.current[1] };
        }
        let filter = Object.keys(rangeConfig.current[Object.keys(rangeConfig.current)[0]].content).reduce((prev, curr) => {
            prev.push({ "===": [ { var : "parent.descr" }, curr ] });
            prev.push({ "===": [ { var : "parent.id" }, curr ] });
            return prev;
        }, []);
        filter = { or: filter };
        data = data.filter(entry => jsonLogic.apply(filter, entry));
    }
    else if (rangeConfig.range === null) {
        //data = cmMonitorHelper.data.filter(data, { range: helper.timeRanges.get("last 7d")(new Date) } );
        data = data.filter(dataset => jsonLogic.apply({ range: cmMonitorHelper.time.range.get("last 7d")(new Date) }, dataset) );
        rangeConfig.range = "last 7d";
    } else
        //data = cmMonitorHelper.data.filter(data, { range: helper.timeRanges.get(rangeConfig.range)(new Date) } );
        data = data.filter(dataset => jsonLogic.apply({ range: cmMonitorHelper.time.range.get(rangeConfig.range)(new Date) }, dataset) );

    let subtitle;

    if (subjectConfig && subjectConfig.values && subjectConfig.values.length > 0 && Array.isArray(subjectConfig.values)) {
        let __filter = {
            or: subjectConfig.values.map(value => ({
                "===" : [
                    { var : subjectConfig.key }, subjectConfig.teams ? Object.values(course.teams).filter(team => team.name === value)[0].key : value
                ]
            }) )
        };
        data = data.filter(dataset => jsonLogic.apply(__filter, dataset));
    }
        

    let groupByPrimary = groupByConfig.key,
        groupBySecondary = groupByConfig.groupBy ? groupByConfig.groupBy.key : undefined,
        limit = limitConfig,
        sort = sortConfig === "Highest" ? d3.descending : d3.ascending,
        chart = renderConfig.type;

    if (groupByPrimary === "user.user" && subjectConfig.teams)
        groupByPrimary = subjectConfig.key;
    if (groupBySecondary === "user.user" && subjectConfig.teams)
        groupBySecondary = subjectConfig.key;


    data = data.reduce((prev, curr) => {
        let key;
        if (groupByPrimary.indexOf(",") > 1)
            key = cmMonitorHelper.deepValue(curr, groupByPrimary.split(",")[0]) ?
                cmMonitorHelper.deepValue(curr, groupByPrimary.split(",")[0]) : cmMonitorHelper.deepValue(curr, groupByPrimary.split(",")[1]);
        else
            key =  cmMonitorHelper.deepValue(curr, groupByPrimary);
        if (!prev[key])
            prev[key] = [curr];
        else
            prev[key].push(curr);
        return prev;
    }, {});

    // sort
    data = new Map([
        ...(Object.entries(data)
            .sort((x,y) => sort(x[1].length, y[1].length))
            .slice(0, limit))
    ]);

    let y = [];

    if (groupBySecondary)
        data.forEach((value, key) => {
            value = value.reduce((prev, curr) => {
                let _secKey;
                if (groupBySecondary.indexOf(",") > 1)
                    _secKey = cmMonitorHelper.deepValue(curr, groupBySecondary.split(",")[0]) ?
                        cmMonitorHelper.deepValue(curr, groupBySecondary.split(",")[0]) :
                        cmMonitorHelper.deepValue(curr, groupBySecondary.split(",")[1]);
                else
                    _secKey =  cmMonitorHelper.deepValue(curr, groupBySecondary);
                if (!y.includes(_secKey))
                    y.push(_secKey);
                if (!prev.has(_secKey))
                    prev.set(_secKey, [curr]);
                else
                    prev.set(_secKey, prev.get(_secKey).concat(curr));
                return prev;
            }, new Map());
            data.set(key, value);
        });

    let x;

    if (!subjectConfig)
        x = [...data.keys()];
    else if (!subjectConfig.teams)
         x = [...data.keys()];
    else
        x = Array.from(data.keys()).map(key => Object.values(course.teams).filter(team => team.key === key)[0].name);

    if (rangeConfig.range === "lessons")
        subtitle = rangeConfig.current[Object.keys(rangeConfig.current)[0]].label;
    else
        subtitle = rangeConfig.range;

    let settings = {
        "xAxis.categories": x,
        "legend.reversed": true,
        "plotOptions.series.stacking": "normal",
        "yAxis.min": 0,
        "subtitle.text": subtitle,
        "subtitle.align": "right",
        "subtitle.style": { fontWeight: "bold" },
        "tooltip.shared": true,
        "chart.type": chart,
        series: []
    };

    switch(chart) {
        case "bar":
            if (!groupBySecondary) {
                settings.series[0] = {name: "Actions", color: colors[0], data: []};
                data.forEach((value, key)=>settings.series[0].data.push(value.length));
            } else {
                settings.series = y.map((second, i) => ( {
                    name: second,
                    color: colors[i % colors.length],
                    data: Array.from(data).map(primary =>
                        primary[1].has(second) ? primary[1].get(second).length : 0 )
                } ) )
            }
            // send processed to main thread
            self.postMessage(settings);
            break;
        case "column":
            if (!groupBySecondary) {
                settings.series[0] = {name: "Actions", color: colors[0], data: []};
                data.forEach((value, key)=>settings.series[0].data.push(value.length));
            } else {
                settings.series = y.map((second, i) => ( {
                    name: second,
                    color: colors[i % colors.length],
                    data: Array.from(data).map(primary =>
                        primary[1].has(second) ? primary[1].get(second).length : 0 )
                } ) )
            }
            // send processed to main thread
            self.postMessage(settings);
            break;
        case "pie":
            if (!groupBySecondary) {
                /*
                settings.series[0] = {name: "Actions", color: colors[0], data: []};
                data.forEach((value, key)=>settings.series[0].data.push(value.length));
                */
            } else {
                function sum (prev, curr) {
                    return prev + Array.from(curr[1]).reduce((p,c)=> p + c[1].length, 0);
                }
                settings = {
                    "chart.type": "bar",
                    plotOptions: {
                        //series: { dataLabels: { enabled: true, format: '{point.name}: {point.y}x' } },
                        series: {
                            borderWidth: 0,
                            dataLabels: {
                                enabled: true,
                                format: '{point.y:.1f}%'
                            }
                        }
                    },
                    "xAxis.type": "category",
                    responsive: {
                        rules: [{
                            condition: { maxWidth: 500 },
                            chartOptions: {
                                xAxis: { "labels.step": 5 },
                                credits: { enabled: false }
                            }
                        }]
                    },
                    "subtitle.align": "right",
                    "subtitle.text": subtitle,
                    "subtitle.style": { fontWeight: "bold" },
                    tooltip: {
                        headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
                        pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f} %<br/>'
                    },
                };
                settings.series = [{
                    name: "Events",
                    colorByPoint: true,
                    data: Array.from(data).map(element => ({
                        name: element[0],
                        tooltip: { valueDecimals: 2 },
                        drilldown: element[0],
                        y: Array.from(element[1])
                            .reduce((prev, curr) => prev + curr[1].length, 0) / Array.from(data).reduce(sum, 0) * 100
                    }))
                }];
                settings.drilldown = {
                    drillUpButton:{
                        position:{
                            x:-10,
                            y: -40,
                        },
                        theme: {
                            'stroke-width': 1,
                            stroke: "#dadade",
                            r: 0,
                            padding: 5,
                            height: 12,
                            "font-size": "10px"
                        }
                    },
                    series: Array.from(data).map(element => ({
                        name: element[0],
                        id: element[0],
                        tooltip: { valueDecimals: 2 },
                        data: Array.from(element[1]).map(drilled => [
                            drilled[0],
                            drilled[1].length / Array.from(element[1]).reduce((p,c)=> p + c[1].length, 0) * 100
                        ])
                    }))
                };
                // send processed to main thread
                self.postMessage(settings);
            }
            break;
        default: break;
    }
}, false);