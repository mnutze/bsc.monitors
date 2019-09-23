/**
 * @overview ccm subject activities classification
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
 * @version latest (2.0.0)
 */
( function () {
    const component = {

        name: "monitor_subject_activities_classification",

        ccm: "https://ccmjs.github.io/ccm/versions/ccm-21.1.2.js",

        version: [2, 0, 0],

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

            monitor: [ "ccm.load", { url: "https://mnutze.github.io/bsc.monitors/libs/cmMonitor.js" } ],

            stores: {
                // log: undefined, // level-3 store
                // local: undefined, // level-2 store
            },

            templates: [ "ccm.load", { url: "https://mnutze.github.io/bsc.monitors/resources/templates.js" } ],

            user: [ "ccm.instance", "https://ccmjs.github.io/akless-components/user/versions/ccm.user-9.0.1.js", {
                realm: "hbrsinfpseudo",
                logged_in: true
            } ],

            worker: "https://mnutze.github.io/bsc.monitors/monitor_subject_activities_classification/resources/worker.js"
        },

        Instance: function () {

            const self = this;
            let $, navContainer;

            this.init = async () => {

                self.monitor = new Monitor(self);

                self.helper = self.monitor.helper;

                // creates process worker
                try {
                    let workerUrl = self.worker;
                    if (self.monitor.testSameOrigin(workerUrl)) {
                        self.worker = new Worker(workerUrl);
                        self.worker.onerror = function (event) {
                            event.preventDefault();
                            self.worker = self.monitor.createWorkerFallback(workerUrl);
                        };
                    } else {
                        self.worker = self.monitor.createWorkerFallback(workerUrl);
                    }
                    self.worker.addEventListener('message', function(event) {
                        let data = event.data;
                        if (self["no-rlt"] && !self.blockRendering)
                            return;

                        if (data)
                            render(data);
                    }, false);
                } catch (e) {
                    self.worker = self.monitor.createWorkerFallback(self.worker);
                }

                await self.monitor.init();
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

            this.start = async () => await self.monitor.start();

            this.blockRendering = true;

            this.rerender = async () => await self.monitor.update();

            // kill process worker
            this.terminateWorker = async () => await self.worker.terminate();

            this.update = async (dataset, source, flag) => await self.monitor.update(dataset, self.sources[source], flag);
            
            const render = async data => await self.monitor.render.highcharts(data);
            // const render = async data => { /* your custom render script */ }

        }

    };

    let b="ccm."+component.name+(component.version?"-"+component.version.join("."):"")+".js";if(window.ccm&&null===window.ccm.files[b])return window.ccm.files[b]=component;(b=window.ccm&&window.ccm.components[component.name])&&b.ccm&&(component.ccm=b.ccm);"string"===typeof component.ccm&&(component.ccm={url:component.ccm});let c=(component.ccm.url.match(/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)||["latest"])[0];if(window.ccm&&window.ccm[c])window.ccm[c].component(component);else{var a=document.createElement("script");document.head.appendChild(a);component.ccm.integrity&&a.setAttribute("integrity",component.ccm.integrity);component.ccm.crossorigin&&a.setAttribute("crossorigin",component.ccm.crossorigin);a.onload=function(){window.ccm[c].component(component);document.head.removeChild(a)};a.src=component.ccm.url}
} )();