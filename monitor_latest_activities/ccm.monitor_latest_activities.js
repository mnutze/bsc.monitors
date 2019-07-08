/**
 * @overview ccm latest activities monitor
 * @author Michael Nutzenberger <michael.nutzenberger@smail.inf.h-brs.de> 2019
 * @license MIT
 * @version latest (1.0.0)
 */
( function () {
    const component = {

        name: "monitor_latest_activities",

        ccm: "https://ccmjs.github.io/ccm/ccm.js",

        config: {

            css: {
                default: [ "ccm.load", [
                    { url: "https://mnutze.github.io/bsc.monitors/resources/monitor.css" }
                ] ],
                extern: [ "ccm.load", [
                    { url: "https://mnutze.github.io/bsc.course-monitoring/libs/css/delos.css" },
                    { url: "https://mnutze.github.io/bsc.course-monitoring/libs/css/delos_cont.css" },
                    { url: "https://mnutze.github.io/bsc.course-monitoring/libs/css/fonts.css" },

                ] ]
            },

            html: {
                main: {
                    tag: "body", style: "position: relative;",
                    inner: [
                        {
                            tag: "nav",
                            id: "optionsControl"
                        },
                        {
                            id: "main",
                            inner: {
                                id: "ccm_keyframe",
                                inner: "%loading%"
                            }
                        }
                    ]
                }
            },

            debug: true,

            stores: {
                // log: undefined, // level-3 store
                // local: undefined, // level-2 store
            },

            templates: [ "ccm.load", { url: "https://mnutze.github.io/bsc.monitors/resources/templates.js" } ],

            user: [ "ccm.instance", "https://ccmjs.github.io/akless-components/user/versions/ccm.user-9.0.1.js", {
                realm: "hbrsinfpseudo",
                logged_in: true
            } ],
        },

        Instance: function () {

            const self = this;
            let $, navContainer, rerender = true;

            this.init = async () => {

                // creates process worker
                if (self.worker)
                    try {
                        let workerUrl = self.worker;
                        if (testSameOrigin(workerUrl)) {
                            self.worker = new Worker(workerUrl);
                            self.worker.onerror = function (event) {
                                event.preventDefault();
                                self.worker = createWorkerFallback(workerUrl);
                            };
                        } else {
                            self.worker = createWorkerFallback(workerUrl);
                        }
                        self.worker.addEventListener('message', function(event) {
                            let data = event.data;
                            if (self["no-rlt"] && !rerender)
                                return;

                            if (data)
                                render()(data);
                        }, false);
                    } catch (e) {
                        self.worker = createWorkerFallback(self.worker);
                    }

                // load jsonLogic only once
                !window.jsonLogic && await self.ccm.load("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");

                // make sure that "d3.js" library is executed only once
                !window.d3 && await self.ccm.load( this.ccm.components[ component.index ].lib || "https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js" );

                // make sure that "d3.js" library is executed only once
                !window.moment && await self.ccm.load( this.ccm.components[ component.index ].lib || "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.js" );
                await self.ccm.load("https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.13/moment-timezone-with-data-2012-2022.min.js");

                // load cmMonitorHelper only once
                !window.cmMonitorHelper && await self.ccm.load("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

                // extend jsonLogic-Filter by custom
                function range (start, end) { return (new Date(this.created_at) > start && new Date(this.created_at) < end); }
                jsonLogic.add_operation("has", key => !!$.deepValue(this, key) );
                jsonLogic.add_operation("range", range);

            };

            this.ready = async () => {
                // set shortcut to help functions
                $ = self.ccm.helper;

                // if monitor got no uid from config -> call helper.generateKey()
                if (!self.widget)
                    self.widget = "m" + $.generateKey();

                if (!self.data)
                    self.data = {};

                if (!self.filter)
                    self.filter = {};

                if ($.isObject(self.stores) && Object.keys(self.stores).length > 0) {
                    let keys = Object.keys(self.stores);
                    for (let key of keys) {
                        if ($.isDatastore(self.stores[key].store))
                            self.data[key] = await self.stores[key].store.get(self.stores[key].key);
                    }
                }

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

                await update();

                /** if monitor don't get data from a central (dashboard) instance by self.update
                 * monitor must have at least one store! if realtime monitor -> register store onchange listener */
                if ($.isObject(self.stores) && Object.keys(self.stores).length > 0) {
                    let keys = Object.keys(self.stores);
                    for (let key of keys)
                        if ($.isDatastore(self.stores[key].store))
                            self.stores[key].store.onchange = async dataset => await update(dataset, {
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

            this.rerender = () => {
                self.element.style = $.format("height: %height%px; width: %width%px", {
                    height: self.size.height - 50,
                    width: self.size.width - 30
                });

                rerender = true;
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
                else {
                    if (self.process)
                        data = self.process(data, self);

                    if (self["no-rlt"] && !rerender)
                        return;

                    if (data)
                        render(data);
                }
            };

            // kill process worker
            this.terminateWorker = () => self.worker.terminate();

            this.update = async (dataset, source, flag) => await update(dataset, self.sources[source], flag);

            async function update (dataset, source, flag) {
                //console.log(dataset, source);
                if (dataset && $.isObject(dataset)) {
                    if ($.isObject(source))
                        dataset = self.helper.filterData([dataset], source.filter)[0];
                    else
                        dataset = self.helper.filterData([dataset])[0];

                    //console.log(self.widget, dataset);
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
                    //console.log(self.widget, dataset);
                    self.data[source.name] = self.data[source.name].concat(self.helper.filterData(dataset, source.filter));
                    if (self.teams) // extend log entries with a property team and the user corresponding team-value
                        self.data[source.name] = self.helper.setTeamId(self.data[source.name]);
                } else if (Array.isArray(dataset) && flag) { // data already filtered by parent
                    self.data[source.name] = self.data[source.name].concat(dataset);
                    if (self.teams) // extend log entries with a property team and the user corresponding team-value
                        self.data[source.name] = self.helper.setTeamId(self.data[source.name]);
                }

                let data = self.data;

                //console.debug("processing " + debug().sizeOf(data) + " bytes");

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
                else {
                    if (self.process)
                        data = self.process(data, self);

                    if (self["no-rlt"] && !rerender)
                        return;

                    if (data)
                        render(data);
                }
            }

            function render(data) {
                if (!data)
                    return;

                function setCell (dataset, key, link) {
                    if (!Array.isArray($.deepValue(dataset, key))) {
                        if (link === "subject")
                            return {
                                tag: "a",
                                id: $.deepValue(dataset, key),
                                inner: self.course ?
                                    self.course.humanReadable.learners[$.deepValue(dataset, key)] ?
                                        self.course.humanReadable.learners[$.deepValue(dataset, key)] :
                                        $.deepValue(dataset, key) : $.deepValue(dataset, key),
                                onclick: function (event) {
                                    if (self.parent && self.parent.createBoardPanel)
                                        self.parent.createBoardPanel(dataset.key, self.subject, !!self.teams);
                                }
                        };
                        if (link === "learner")
                            return self.course ? self.course.humanReadable.learners[$.deepValue(dataset, key)] ?
                                self.course.humanReadable.learners[$.deepValue(dataset, key)] :
                                $.deepValue(dataset, key) : $.deepValue(dataset, key);
                        if (key === "created_at" || key === "updated_at")
                            return $.deepValue(dataset, key).replace("T", " ").slice(0,19);
                        if (key.indexOf(",") > 1)
                            return $.deepValue(dataset, key.split(",")[0]) ?
                                $.deepValue(dataset, key.split(",")[0]) : $.deepValue(dataset, key.split(",")[1]);
                        return $.deepValue(dataset, key);
                    }
                    else if (Array.isArray($.deepValue(dataset, key)) && key.indexOf("profile") !== -1 ) {
                        let width = 100,
                            height = 30;
                        const div = document.createElement( 'div' );
                        let svg = d3.select(div).append("svg")
                            .attr("width", width)
                            .attr("height", height);

                        svg.append("g").classed("line", true);

                        let x = data.x;
                        x.rangeRound([0, width]);

                        let y = d3.scaleLinear()
                            .domain([0, 1.05*d3.max($.deepValue(dataset, key), el => el.length)])
                            .range([height, 0]);
                        let line = d3.line().x(d => x(d.x1)).y(d => y(d.length));

                        // Add the valueline path.
                        svg.select(".line")
                            .append("path") // mean-line
                            .data([$.deepValue(dataset, key)])
                            .attr("class", "line")
                            .attr("style", "fill: none; stroke-width: 1px;")
                            .attr("stroke", cmMonitorHelper.colors[0])
                            .attr("d", line);

                        return div;
                    }
                }

                let columns = self.render.columns;

                let rows = Object.values(data.aggregated).reduce((prev, subject) => {
                    prev = prev.concat(
                        { tag: "tr", inner: columns.order.map(td => $.format(self.templates.tables.td, {
                                tdInner: function () {
                                    if (!columns[td].filter)
                                        return [
                                            {
                                            tag: "span",
                                            class: "cm_table_cell",
                                            inner: setCell(subject, columns[td].key, td)
                                        }];
                                    let value, __path = columns[td].key;
                                    if (columns[td].key.indexOf(",") > 1) {
                                        if ($.deepValue(subject, columns[td].key.split(",")[0])) {
                                            value = $.deepValue(subject, columns[td].key.split(",")[0]);
                                            __path = columns[td].key.split(",")[0];
                                        } else {
                                            value = $.deepValue(subject, columns[td].key.split(",")[1]);
                                            __path = columns[td].key.split(",")[1]
                                        }
                                    }
                                    else
                                        value = $.deepValue(subject, columns[td].key);
                                    return [
                                        {
                                            tag: "span",
                                            class: "cm_table_cell",
                                            inner: setCell(subject, columns[td].key, td)
                                        },
                                        {
                                            tag: "span",
                                            class: "cm_table_cell_filter",
                                            inner: [
                                                {
                                                    tag: "span",
                                                    class: "glyphicon glyphicon-zoom-in",
                                                    onclick: () => config().filter.add(__path, value, true, columns[td].label)
                                                },
                                                {
                                                    tag: "span",
                                                    class: "glyphicon glyphicon-zoom-out",
                                                    onclick: () => config().filter.add(__path, value, false, columns[td].label)
                                                }
                                            ]
                                        }
                                    ]
                                } ()
                            }))},
                    );
                    return prev;
                }, [] ) ;

                let table = $.html(self.templates.tables.table, {
                    width: self.size.width - 30,
                    height: self.size.height - 60,
                    thead: columns.order.map(th => ( {
                        tag: "th",
                        style: "position: sticky; top: 0; z-index: 10;",
                        inner: "<span>" + columns[th].label + "</span><span class='glyphicon glyphicon-sort-by-attributes-alt ilDclSelectRecord cm-small'></span>"
                    } ) ),
                    tbody: rows
                });
                $.setContent( self.element.querySelector( "#main" ), table );

                /**@THX to Nick Grealy (https://stackoverflow.com/users/782034/nick-grealy)
                 * by contributing his table sort algorithm
                 * https://stackoverflow.com/questions/14267781/sorting-html-table-with-javascript?answertab=votes#tab-top
                 */
                const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

                const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
                    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
                    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

                // do the work...
                self.element.querySelectorAll('th').forEach(th => th.addEventListener('click', function (event) {
                    this.parentNode.querySelectorAll(".glyphicon")
                        .forEach(sortIcon => sortIcon.classList.remove("text-info"));
                    let icon = this.querySelector(".glyphicon");
                    if (icon.classList.contains("glyphicon-sort-by-attributes")) {
                        icon.classList.remove("glyphicon-sort-by-attributes");
                        icon.classList.add("glyphicon-sort-by-attributes-alt");
                    }
                    else {
                        icon.classList.remove("glyphicon-sort-by-attributes-alt");
                        icon.classList.add("glyphicon-sort-by-attributes");
                    }
                    icon.classList.add("text-info");
                    const table = th.closest('table');
                    const tbody = table.querySelector("tbody");
                    Array.from(tbody.querySelectorAll('tr:nth-child(n+1)'))
                        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
                        .forEach(tr => tbody.appendChild(tr) );
                }));
            }

            function config() {
                return {
                    filter: {
                        add: (path, value, boolean, label) => {
                            if(!self.filter)
                                self.filter = { and: [ ] };

                            let filter;
                            if (boolean)
                                filter = { "===" : [ { var : path }, value ] };
                            else
                                filter = { "!==" : [ { var : path }, value ] };
                            self.filter.and.push(filter);

                            if (!self.filterGUI)
                                self.filterGUI = [{label: label, filter: filter}];
                            else
                                self.filterGUI.push({label: label, filter: filter});

                            config().filter.render();
                        },
                        remove: filter => {
                            self.filter.and = self.filter.and.filter(arr => JSON.stringify(arr) !== JSON.stringify(filter.filter));
                            self.filterGUI = self.filterGUI.filter(arr => JSON.stringify(arr) !== JSON.stringify(filter));
                            config().filter.render();
                        },
                        render: () => {
                            let boolean = {
                                "===": true,
                                "!==": false
                            };
                            let content = [ ];

                            self.filterGUI.forEach(filter => {
                                content.push($.format({
                                    tag: "span",
                                    class: boolean[Object.keys(filter.filter)[0]] ? "btn-default badge" : "btn-danger badge",
                                    style: "position: unset; margin-left: 7px",
                                    inner: filter.label + ": " +  Object.values(filter.filter)[0][1] ,
                                    onclick: "%click%"
                                }, { click: ev => config().filter.remove(filter)}));
                            });

                            $.setContent( navContainer.filter.querySelector("#monitorFilterList"), $.html(content));

                            self.rerender();
                        }
                    }
                }
            }

            function debug() {
                return {
                    typeSizes: {
                        "undefined": () => 0,
                        "boolean": () => 4,
                        "number": () => 8,
                        "string": item => 2 * item.length,
                        "object": item => !item ? 0 : Object
                        .keys(item)
                        .reduce((total, key) => debug().sizeOf(key) + debug().sizeOf(item[key]) + total, 0)
                    },
                    sizeOf: value => debug().typeSizes[typeof value](value)
                }
            }

            /** work around for cross domain web(shared) workers
             * https://benohead.com/cross-domain-cross-browser-web-workers/ */
            function createWorkerFallback (workerUrl) {
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
            }

            function testSameOrigin (url) {
                let loc = window.location;
                let a = document.createElement('a');
                a.href = url;
                return a.hostname === loc.hostname && a.port === loc.port && a.protocol === loc.protocol;
            }
        }

    };

    let b="ccm."+component.name+(component.version?"-"+component.version.join("."):"")+".js";if(window.ccm&&null===window.ccm.files[b])return window.ccm.files[b]=component;(b=window.ccm&&window.ccm.components[component.name])&&b.ccm&&(component.ccm=b.ccm);"string"===typeof component.ccm&&(component.ccm={url:component.ccm});let c=(component.ccm.url.match(/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)||["latest"])[0];if(window.ccm&&window.ccm[c])window.ccm[c].component(component);else{var a=document.createElement("script");document.head.appendChild(a);component.ccm.integrity&&a.setAttribute("integrity",component.ccm.integrity);component.ccm.crossorigin&&a.setAttribute("crossorigin",component.ccm.crossorigin);a.onload=function(){window.ccm[c].component(component);document.head.removeChild(a)};a.src=component.ccm.url}
} )();