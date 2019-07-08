/**
 * @overview ccm template component
 * @author Michael Nutzenberger <michael.nutzenberger@smail.inf.h-brs.de> 2019
 * @license
 * Creative Commons Attribution-NonCommercial 3.0: https://creativecommons.org/licenses/by-nc/3.0/
 * Only for not-for-profit educational use.
 *
 * This ccm component uses „Highstock JS“: https://www.highcharts.com
 * Make sure that you have a valid license of „Highstock JS“ before using this ccm component.
 *
 * The developer Michael Nutzenberger of this component has a valid license of „Highstock JS“ for
 * Personal/Student Use|Not-for-Profit Educational Institution use for the following product(s): Highcharts, Highstock
 * @version latest (1.0.0)
 */
( function () {
    const component = {

        name: "monitor",

        ccm: "https://ccmjs.github.io/ccm/ccm.js",

        config: {

            css: {
                default: [ "ccm.load", [
                    { url: "https://mnutze.github.io/bsc.monitors/resources/monitor.css" },
                    { url: "https://mnutze.github.io/bsc.monitors/resources/cm-highcharts.css" }
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
                                render()[self.render.key](data);
                        }, false);
                    } catch (e) {
                        self.worker = createWorkerFallback(self.worker);
                    }

                // make sure that "highcharts.js" library is executed only once
                !window.Highcharts && await self.ccm.load( this.ccm.components[ component.index ].lib || "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/highcharts.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/exporting.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/data.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/drilldown.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/highcharts-more.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/networkgraph.js" );
                await self.ccm.load( "https://cdnjs.cloudflare.com/ajax/libs/highcharts/7.1.2/modules/heatmap.js" );

                // load jsonLogic only once
                !window.jsonLogic && await self.ccm.load("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");

                // make sure that "d3.js" library is executed only once
                !window.d3 && await self.ccm.load( this.ccm.components[ component.index ].lib || "https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js" );

                // make sure that "d3.js" library is executed only once
                !window.moment && await self.ccm.load( this.ccm.components[ component.index ].lib || "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.js" );
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
                        render()[self.render.key](data);
                }
            };

            // kill process worker
            this.terminateWorker = async () => await self.worker.terminate();

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
                        render()[self.render.key](data);
                }
            }

            function render() {
                return {
                    custom: data => {
                        $.setContent( self.element.querySelector( "#main" ), $.html(data, {
                            height: self.size.height - 50
                        } ) );
                    },
                    forceDirected: async data => {
                        // @TODO inspired by https://bl.ocks.org/mapio/53fed7d84cd1812d6a6639ed7aa83868
                        // @License GNU General Public License, version 3
                        let width = {svg: self.size.width - 50},
                            height = self.size.height - 50,
                            color = d3.scaleOrdinal(d3.schemeCategory10);

                        width.select = 200;
                        //width.svg -= width.select;

                        $.setContent(navContainer.options, $.html({
                            "id": "subject-selection",
                            "class": "force-directed-control",
                            "style": "width: " + width.select + "px;",
                            "inner": [
                                {
                                    "inner": [
                                        {
                                            "tag": "label",
                                            "class": "small control-label",
                                            "style": "width: " + width.select + "px;",
                                            "inner": "Selection on",
                                            "for": "subject-type"
                                        },
                                        {
                                            "tag": "select",
                                            "class": "small form-control",
                                            "style": "width: " + width.select + "px;",
                                            "type": "text",
                                            "name": "subject-type",
                                            "id": "subject-type",
                                            "inner": [
                                                { "tag": "option", "value": "course", "inner": "Course" },
                                                { "tag": "option", "value": "learners", "inner": "Learner(s)" },
                                                { "tag": "option", "value": "teams", "inner": "Team(s)" }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "inner": [
                                        {
                                            "tag": "label",
                                            "class": "small control-label",
                                            "style": "width: " + width.select + "px;",
                                            "inner": "Select your subject(s)",
                                            "for": "subjects"
                                        },
                                        {
                                            "tag": "select",
                                            "disabled": true,
                                            "multiple": true,
                                            "class": "small form-control",
                                            "style": "height: " + (height - 150) +"px; width: " + width.select + "px;",
                                            "type": "text",
                                            "name": "subjects",
                                            "id": "subjects"
                                        }
                                    ]
                                },
                                {
                                    "inner": {
                                        "tag": "button",
                                        "id": "apply-selection",
                                        "class": "small form-control",
                                        "inner": "Apply"
                                    }
                                }

                            ]
                        }));

                        navContainer.options.querySelector("#subject-selection")
                            .querySelector("#subject-type")
                            .addEventListener("change", function (event) {
                                let subjectType = navContainer.options.querySelector("#subject-selection")
                                    .querySelector("#subjects");
                                let subjects = navContainer.options.querySelector("#subject-selection")
                                    .querySelector("#subjects");
                                if (this.value === "course") {
                                    subjects.disabled = true;
                                    while(subjects.firstChild)
                                        subjects.remove(subjects.firstChild);
                                    return;
                                }

                                subjects.disabled = false;
                                while(subjects.firstChild)
                                    subjects.remove(subjects.firstChild);

                                if (this.value === "teams")
                                    Object.keys(self.course.teams).forEach(subject =>
                                        subjects.appendChild($.html({
                                            tag: "option",
                                            style: self.course.teams[subject].members[self.profile ? self.profile.user : null] ?
                                                "font-weight: bold; background-color: #6DAD53;" : "",
                                            value: subject,
                                            inner: self.course.teams[subject].members[self.profile ? self.profile.user : null] ?
                                                self.course.teams[subject].name + " (yours)" :
                                                self.course.teams[subject].name
                                        })));

                                else
                                    Object.keys(self.course.learners).forEach(learner =>
                                        subjects.appendChild($.html({
                                            tag: "option",
                                            style: (learner === (self.profile ? self.profile.user : null)) ? "font-weight: bold; background-color: #6DAD53;" : "",
                                            value: learner,
                                            inner: (learner === (self.profile ? self.profile.user : null)) ? "you" : self.course.humanReadable.learners[learner]
                                        })));
                        });

                        navContainer.options.querySelector("#subject-selection")
                            .querySelector("#apply-selection")
                            .addEventListener("click", function (event) {
                                let subjects = Array.from(navContainer.options.querySelector("#subjects").selectedOptions)
                                    .reduce((p,c) => p.concat(c.value), []);
                                if (navContainer.options.querySelector("#subject-type").value === "teams")
                                    subjects = subjects
                                        .reduce((p,c) => p.concat(Object.keys(self.course.teams[c].members)), []);
                                subjects = { key: "user.user", values: subjects };
                                self.subject = subjects;
                                self.rerender();
                        });

                        navContainer.filter.classList.add("hide");
                        
                        if (!data.nodes) {
                            $.setContent(self.element.querySelector("#main"), "You did not communicate with others");
                            return;
                        }

                        let graph = data;

                        let label = {
                            'nodes': [],
                            'links': []
                        };

                        graph.nodes.forEach(function(d, i) {
                            label.nodes.push({node: d});
                            label.nodes.push({node: d});
                            label.links.push({
                                source: i * 2,
                                target: i * 2 + 1
                            });
                        });

                        let labelLayout = d3.forceSimulation(label.nodes)
                            .force("charge", d3.forceManyBody().strength(-50))
                            .force("link", d3.forceLink(label.links).distance(0).strength(2));

                        let graphLayout = d3.forceSimulation(graph.nodes)
                            .force("charge", d3.forceManyBody().strength(-3000))
                            .force("center", d3.forceCenter(width.svg / 2, height / 2))
                            .force("x", d3.forceX(width.svg / 2).strength(1))
                            .force("y", d3.forceY(height / 2).strength(1))
                            .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(50).strength(1))
                            .on("tick", ticked);

                        let adjlist = [];

                        graph.links.forEach(function(d) {
                            adjlist[d.source.index + "-" + d.target.index] = true;
                            adjlist[d.target.index + "-" + d.source.index] = true;
                        });

                        let neigh = (a, b) => a === b || adjlist[a + "-" + b];

                        const div = document.createElement( 'div' );
                        
                        div.appendChild(document.createElementNS("http://www.w3.org/2000/svg","svg"));
                        $.setContent( self.element.querySelector( "#main" ), div );

                        //self.element.querySelector("#main").appendChild(document.createElementNS("http://www.w3.org/2000/svg","svg"));
                        let svg = d3.select(div.querySelector("svg")).attr("width", width.svg).attr("height", height);
                        let container = svg.append("g");

                        svg.call(
                            d3.zoom()
                                .scaleExtent([.1, 4])
                                .on("zoom", function() { container.attr("transform", d3.event.transform); })
                        );
                        let chats = [];
                        let link = container.append("g").attr("class", "links")
                            .selectAll("line")
                            .data(graph.links)
                            .enter()
                            .append("line")
                            .attr("stroke", function (d) {
                                if (chats.indexOf(d.chat) < 0)
                                    chats.push(d.chat);
                                return cmMonitorHelper.colors[chats.indexOf(d.chat) % cmMonitorHelper.colors.length];
                            })
                            .attr("stroke-width", "1px");

                        let node = container.append("g").attr("class", "nodes")
                            .selectAll("g")
                            .data(graph.nodes)
                            .enter()
                            .append("circle")
                            .attr("r", function (d) {
//                                console.log(self.subject, d.uid, d.id, d.group)
                                if (self.subject && self.subject.values && self.subject.values.indexOf(d.uid) > -1)
                                    return 10;
                                return 5;
                            })
                            .attr("fill", function(d) { return color(d.group); })

                        node.on("mouseover", focus).on("mouseout", unfocus);

                        node.call(
                            d3.drag()
                                .on("start", dragstarted)
                                .on("drag", dragged)
                                .on("end", dragended)
                        );

                        let labelNode = container.append("g").attr("class", "labelNodes")
                            .selectAll("text")
                            .data(label.nodes)
                            .enter()
                            .append("text")
                            .text(function(d, i) { return i % 2 == 0 ? "" : d.node.id; })
                            .style("fill", function (d) {
                                if (self.subject && self.subject.values && self.subject.values.indexOf(d.node.uid) > -1)
                                    return "#000";
                                return "#555";
                            })
                            .style("font-family", "Arial")
                            .style("font-size", 12)
                            .style("font-size", function (d) {
                                if (self.subject && self.subject.values && self.subject.values.indexOf(d.node.uid) > -1)
                                    return 14;
                                return 12;
                            })
                            .style("font-weight", function (d) {
                                if (self.subject && self.subject.values && self.subject.values.indexOf(d.node.uid) > -1)
                                    return "bold";
                                return "normal";
                            })
                            .style("pointer-events", "none"); // to prevent mouseover/drag capture

                        node.on("mouseover", focus).on("mouseout", unfocus);

                        function ticked() {

                            node.call(updateNode);
                            link.call(updateLink);

                            labelLayout.alphaTarget(0.3).restart();
                            labelNode.each(function(d, i) {
                                if(i % 2 == 0) {
                                    d.x = d.node.x;
                                    d.y = d.node.y;
                                } else {
                                    let b = this.getBBox();

                                    let diffX = d.x - d.node.x;
                                    let diffY = d.y - d.node.y;

                                    let dist = Math.sqrt(diffX * diffX + diffY * diffY);

                                    let shiftX = b.width * (diffX - dist) / (dist * 2);
                                    shiftX = Math.max(-b.width, Math.min(0, shiftX));
                                    let shiftY = 16;
                                    this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
                                }
                            });
                            labelNode.call(updateNode);

                        }

                        let fixna = x => isFinite(x) ? x : 0;

                        function focus(d) {
                            let index = d3.select(d3.event.target).datum().index;
                            node.style("opacity", function(o) {
                                return neigh(index, o.index) ? 1 : 0.1;
                            });
                            labelNode.attr("display", function(o) {
                              return neigh(index, o.node.index) ? "block": "none";
                            });
                            link.style("opacity", function(o) {
                                return o.source.index == index || o.target.index == index ? 1 : 0.1;
                            });
                        }

                        function unfocus() {
                           labelNode.attr("display", "block");
                           node.style("opacity", 1);
                           link.style("opacity", 1);
                        }

                        function updateLink(link) {
                            link.attr("x1", function(d) { return fixna(d.source.x); })
                                .attr("y1", function(d) { return fixna(d.source.y); })
                                .attr("x2", function(d) { return fixna(d.target.x); })
                                .attr("y2", function(d) { return fixna(d.target.y); });
                        }

                        function updateNode(node) {
                            node.attr("transform", function(d) {
                                return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
                            });
                        }

                        function dragstarted(d) {
                            d3.event.sourceEvent.stopPropagation();
                            if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
                            d.fx = d.x;
                            d.fy = d.y;
                        }

                        function dragged(d) {
                            d.fx = d3.event.x;
                            d.fy = d3.event.y;
                        }

                        function dragended(d) {
                            if (!d3.event.active) graphLayout.alphaTarget(0);
                            d.fx = null;
                            d.fy = null;
                        }
                    },
                    highcharts: async data => {
                        if (self["no-rlt"] && !rerender)
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

                        //if (!self.interval && !self.range)
                        //    settings.chart.marginTop = 20;

                        //console.log(settings); // @TODO remove debug print before live
                        if (!self.visualization) {
                            rerender = false;
                            const div = document.createElement( 'div' );
                            self.visualization = Highcharts.chart(div, settings);
                            $.setContent( self.element.querySelector( "#main" ), div );
                        } else if (rerender) {
                            rerender = false;
                            const div = document.createElement( 'div' );
                            self.visualization = Highcharts.chart(div, settings);
                            $.setContent( self.element.querySelector( "#main" ), div );
                        }
                        else {
                            self.visualization.series.forEach((series, i) => series ?
                                series.setData(data.series[i].data): null);
                        }
                    },
                    none: data => {
                        $.setContent( self.element.querySelector( "#main" ), "" );
                    },
                    table: data => {
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
                    },
                };
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