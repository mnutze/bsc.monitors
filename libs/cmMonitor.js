/* globals define,module */
/*
Using a Universal Module Loader that should be browser, require, and AMD friendly
http://ricostacruz.com/cheatsheets/umdjs.html
*/
;(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['d3'], factory);
        define(['moment'], factory);
        define(['jsonLogic'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('d3'));
        module.exports = factory(require('moment'));
        module.exports = factory(require('jsonLogic'));
    } else {
        root.Monitor = factory(root.d3, root.moment, root.jsonLogic);
    }
}(this, function(d3, moment, jsonLogic){

    return function (instance) {

        this.helper = {
            filterData: (data, rules) => {
                if (!data)
                    return data;
                if (!rules)
                    return;
                return data.filter(dataset => jsonLogic.apply(rules, dataset));
            },
            setTeamId: data => { // connect log-data of user with their team
                return data.map(dataset => {
                    if (dataset.user && dataset.user.user)
                        dataset.team = self.course.learners[dataset.user.user] ?
                            self.course.learners[dataset.user.user] : undefined;
                    return dataset
                });
            }
        };

        this.init = async () => {
            // make sure that "highcharts.js" library is executed only once
            !window.Highcharts && await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/highcharts.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/exporting.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/data.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/drilldown.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/highcharts-more.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/networkgraph.js" );
            await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/heatmap.js" );

            // load jsonLogic only once
            !window.jsonLogic && await self.ccm.load("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");

            // make sure that "d3.js" library is executed only once
            !window.d3 && await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js" );

            // make sure that "d3.js" library is executed only once
            !window.moment && await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.js" );
            await self.ccm.load("https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.13/moment-timezone-with-data-2012-2022.min.js");

            // load cmMonitorHelper only once
            !window.cmMonitorHelper && await self.ccm.load("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

            // set Highcharts options
            Highcharts.dateFormats = { W: timestamp => moment(timestamp).isoWeek() };
            Highcharts.setOptions( { time: { timezone: 'Europe/Berlin' } } );

            // extend jsonLogic-Filter by custom
            function range (start, end) { return (new Date(this.created_at) > start && new Date(this.created_at) < end); }
            jsonLogic.add_operation("has", key => !!$.deepValue(this, key) );
            jsonLogic.add_operation("range", range);
        };

        this.start = async () => {
            // put main HTML structure into frontend
            $.setContent( self.element, $.html( self.html.main, { loading: $.loading() } ) );

            // set monitor size
            if (!self.size) {
                // stand-alone monitor running -> set height to full viewport height
                self.element.style = "height: 100vh;";
                self.size = self.element.getBoundingClientRect();
            } else
                self.element.style = $.format("height: %height%px; width: %width%px", {
                    height: self.size.height - 50,
                    width: self.size.width - 30
                });

            // if dashboard widget -> validate initial monitor data if submitted
            if (self.sources) {
                let __sources = Object.keys(self.sources);
                __sources.forEach(src => {
                    if (!self.data[self.sources[src].name])
                        self.data[self.sources[src].name] = [];
                    self.data[self.sources[src].name] = self.helper.filterData(self.data[self.sources[src].name], self.sources[src].filter);
                });
            }

            await self.monitor.update();

            /** if monitor don't get data from a central (dashboard) instance by self.update
             * monitor must have at least one store! if realtime monitor -> register store onchange listener */
            if ($.isObject(self.stores) && Object.keys(self.stores).length > 0) {
                let keys = Object.keys(self.stores);
                for (let key of keys)
                    if ($.isDatastore(self.stores[key].store))
                        self.stores[key].store.onchange = async dataset => await self.monitor.update(dataset, {
                            name: key, filter: self.stores[key].onchangeFilter});
            }

            if (self.runtimeOptions) {
                $.setContent(self.element.querySelector("#optionsControl"), $.html(self.templates.nav.wrapper));

                navContainer = {
                    options: self.element.querySelector(".monitorOptions"),
                    filter: self.element.querySelector(".monitorFilter")
                };

                self.element.querySelector("#optionsControl").querySelector("#close-options").addEventListener("click", ev => {
                    self.element.querySelector("#toggle-sidebar").checked = false;
                });
            }
        };

        this.update = async (dataset, source, flag) => {
            if (!dataset) {
                self.element.style = $.format("height: %height%px; width: %width%px", {
                    height: self.size.height - 50,
                    width: self.size.width - 30
                });
                self.blockRendering = true;
            }
            else if (dataset && $.isObject(dataset)) {
                if ($.isObject(source))
                    dataset = self.helper.filterData([dataset], source.filter)[0];
                else
                    dataset = self.helper.filterData([dataset])[0];

                if (!dataset)
                    return;

                if (self.teams) // extend log entries with a property team and the user corresponding team-value
                    dataset = self.helper.setTeamId([dataset])[0];

                /**
                 * @info source.name === "log" -> log-entries must not be checked, if these are an update for
                 * an existing dataset. Log-entries are stacked (old->new) and may not modified. So skip the modify-check
                 */
                if ($.isObject(source) && source.name !== "log") { //
                    let __replaced = false;
                    self.data[source.name] = self.data[source.name].reduce((prev, curr) => {
                        if (curr.key === dataset.key) {
                            curr = dataset;
                            __replaced = true;
                        }
                        return prev.concat(curr);
                    }, []);
                    if (!__replaced)
                        self.data[source.name].push(dataset);
                } else
                    self.data[source.name].push(dataset);
            }
            else if (Array.isArray(dataset) && !flag) {
                self.data[source.name] = self.data[source.name].concat(self.helper.filterData(dataset, source.filter));
                if (self.teams) // extend log entries with a property team and the user corresponding team-value
                    self.data[source.name] = self.helper.setTeamId(self.data[source.name]);
            } else if (Array.isArray(dataset) && flag) { // data already filtered by parent
                self.data[source.name] = self.data[source.name].concat(dataset);
                if (self.teams) // extend log entries with a property team and the user corresponding team-value
                    self.data[source.name] = self.helper.setTeamId(self.data[source.name]);
            }

            let data = self.data;

            if (self.worker)
                self.worker.postMessage({
                    colors: cmMonitorHelper.colors,
                    course: self.course ? self.course : undefined,
                    data: data,
                    groupBy: self.groupBy ? self.groupBy : undefined,
                    filter: self.filter,
                    incompleteLog: self.incompleteLog ? self.incompleteLog : false,
                    interval: self.interval ? self.interval : undefined,
                    limit: self.limit ? self.limit : undefined,
                    processing: self.processing ? self.processing : undefined,
                    profile: self.profile ? self.profile : undefined,
                    range: self.range ? self.range : undefined,
                    render: self.render ? self.render : undefined,
                    size: self.size ? self.size : undefined,
                    sort: self.sort ? self.sort : undefined,
                    subject: self.subject ? self.subject : undefined,
                    teams: self.teams ? self.teams : undefined
                });

        };

        /** work around for cross domain web(shared) workers
         * https://benohead.com/cross-domain-cross-browser-web-workers/ */
        this.createWorkerFallback = function (workerUrl) {
            let worker = null;
            try {
                let blob;
                try {
                    blob = new Blob(["importScripts('" + workerUrl + "');"], { "type": 'application/javascript' });
                } catch (e) {
                    let blobBuilder = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
                    blobBuilder.append("importScripts('" + workerUrl + "');");
                    blob = blobBuilder.getBlob('application/javascript');
                }
                let url = window.URL || window.webkitURL;
                let blobUrl = url.createObjectURL(blob);
                worker = new Worker(blobUrl);
            } catch (e1) {
                //if it still fails, there is nothing much we can do
            }
            return worker;
        };

        this.testSameOrigin = function (url) {
            let loc = window.location;
            let a = document.createElement('a');
            a.href = url;
            return a.hostname === loc.hostname && a.port === loc.port && a.protocol === loc.protocol;
        }

        this.render = {
            highcharts: async data => {
                if (self["no-rlt"] && !self.blockRendering)
                    return;

                let buttonsSettings = {
                    x: [76, 20],
                    y: [0, 0],
                    theme: {
                        "stroke-width": 1,
                        stroke: "#dadade",
                        r: 0,
                        padding: 5,
                        height: 12,
                        "font-size": "10px"
                    },
                }, intervalButton = {}, rangeButton = {};

                if (self.interval && self.interval.enabled)
                    intervalButton = {
                        "exporting.buttons.interval" : {
                            align: 'left',
                            x: buttonsSettings.x.pop(),
                            y: buttonsSettings.y.pop(),
                            theme: buttonsSettings.theme,
                            text: "Interval",
                            menuItems: function () {
                                let bc = [];
                                cmMonitorHelper.time.interval.forEach((value, key) => {
                                    if (!self.interval.exclude.includes(key))
                                        bc.push({
                                            text: key,
                                            theme: {"font-size": "8px"},
                                            onclick: (ev) => {
                                                self.interval.current = key;
                                                self.rerender();
                                            }});
                                });
                                return bc;
                            }()
                        }
                    };

                if (self.range && self.range.enabled)
                    rangeButton = {
                        "exporting.buttons.range": {
                            align: 'left',
                            height: 14,
                            x: buttonsSettings.x.pop(),
                            y: buttonsSettings.y.pop(),
                            className: "cm-hc-custom-range",
                            theme: buttonsSettings.theme,
                            text: self.range.range === "lessons" && self.course && self.course.lessons ? "Unit" : "Time-Range",
                            menuItems: function () {
                                // Calendar weeks
                                if (self.range.range === "weeks") {
                                    if (data.rangeValues)
                                        self.range.values = data.rangeValues;
                                    return self.range.values.map(range => ({
                                        text: "W-" + moment(range.x0).isoWeek(),
                                        theme: {"font-size": "8px"},
                                        onclick: (ev) => {
                                            self.range.current = [range.x0, range.x1];
                                            self.rerender()
                                        }
                                    }));
                                }
                                if (self.range.range === "lessons" && self.course && self.course.lessons) {
                                    return Object.keys(self.course.lessons).map((lesson, id) => ({
                                        text: "" + (id+1),
                                        theme: { "font-size": "8px" },
                                        onclick: (ev) => {
                                            self.range.current = { [lesson]: self.course.lessons[lesson] };
                                            self.rerender()
                                        }
                                    }));
                                }

                                let ranges = [];
                                cmMonitorHelper.time.range.forEach((value, key) => {
                                    ranges.push({
                                        text: key,
                                        theme: {"font-size": "8px"},
                                        onclick: (ev) => {
                                            //self.monitor.filter = self.monitor.filter.concat([value(new Date)]);
                                            self.range.range = key;
                                            self.rerender();
                                        }
                                    });
                                });
                                return ranges;
                            }()
                        }
                    };

                let settings = {
                    chart: {
                        styledMode: false,
                        zoomType: 'x',
                        backgroundColor: "#ffffff",
                        width: self.size.width - 50,
                        height: self.size.height - 50,
                        marginTop: 50,
                        resetZoomButton:{
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
                                "font-size": "10px",
                                "zIndex": 6
                            }
                        }
                    },
                    colors: cmMonitorHelper.colors,
                    credits: { enabled: false },
                    "exporting.buttons.contextButton.enabled": false,
                    legend: {
                        enabled: false,
                        align: 'right',
                        verticalAlign: 'top',
                        borderWidth: 0,
                        symbolHeight: 0,
                        symbolPadding: 0,
                        symbolRadius: 0,
                        x: -25
                    },
                    navigator: { enabled: false, },
                    plotOptions: { series: { states: { inactive: { opacity: 1 } } } },
                    rangeSelector: { enabled: false },
                    responsive: {
                        rules: [{
                            condition: { maxWidth: 500 },
                            chartOptions: {
                                legend: {
                                    align: 'center',
                                    verticalAlign: 'bottom',
                                    layout: 'horizontal'
                                },
                                xAxis: { "labels.step": 5 },
                                credits: { enabled: false }
                            }
                        }]
                    },
                    scrollbar: { enabled: false, },
                    title: { text: "" },
                    "tooltip.valueDecimals": 2,
                    xAxis: { maxPadding: 0.02 },
                };

                settings = $.convertObjectKeys(Object.assign(settings, intervalButton, rangeButton));

                settings = $.convertObjectKeys(Object.assign(settings, data));

                if ($.isObject(self.render.highcharts))
                    settings = $.convertObjectKeys(Object.assign(settings, self.render.highcharts));

                if (!self.visualization) {
                    self.blockRendering = false;
                    const div = document.createElement( 'div' );
                    self.visualization = Highcharts.chart(div, settings);
                    $.setContent( self.element.querySelector( "#main" ), div );
                } else if (self.blockRendering) {
                    self.blockRendering = false;
                    const div = document.createElement( 'div' );
                    self.visualization = Highcharts.chart(div, settings);
                    $.setContent( self.element.querySelector( "#main" ), div );
                }
                else {
                    self.visualization.series.forEach((series, i) => series ?
                        series.setData(data.series[i].data): null);
                }
            }

        };

        const self = instance;
        const $ = self.ccm.helper;

    };
}));