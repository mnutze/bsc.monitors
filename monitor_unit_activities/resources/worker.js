importScripts("https://cdnjs.cloudflare.com/ajax/libs/d3/5.9.2/d3.min.js");
importScripts("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");
importScripts("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

self.addEventListener("message", function (event) {

    let data = event.data.data;
    let colors = event.data.colors;
    let log = data.log;
    let course = event.data.course;
    let lessons = course.lessons;
    let range = event.data.range;
    let interval = event.data.interval;

    if (!lessons) {
        console.error("No Units available / defined");
        self.postMessage({});
        return;
    }

    if (log.length < 1)
        return;

    if (!range)
        return;

    if (!range.current) {
        let today = new Date();
        range.current = Object.entries(lessons)
            .filter(lesson => (today > new Date(lesson[1].start) && (today < new Date(lesson[1].deadline))))[0];
        if (!range.current)
            range.current = {[Object.keys(lessons)[Object.keys(lessons).length-1]]: lessons[Object.keys(lessons)[Object.keys(lessons).length-1]]};
        if (Array.isArray(range.current))
            range.current = { [range.current[0]]: range.current[1] };
    }

    let filter = Object.keys(range.current[Object.keys(range.current)[0]].content).reduce((prev, curr) => {
        prev.push({ "===": [ { var : "parent.descr" }, curr ] });
        prev.push({ "===": [ { var : "parent.id" }, curr ] });
        return prev;
    }, []);

    filter = { or: filter };
    let activities = {
        and: [
            { or: [
                { and: [ { "===" : [ { var : "parent.name" }, "youtube" ] }, { "===" : [ { var : "event" }, "onStateChange" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "quiz" ] }, { "===" : [ { var : "event" }, "finish" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "live_poll" ] }, { "===" : [ { var : "event" }, "finish" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "feedback" ] }, { "===" : [ { var : "event" }, "create" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "comment" ] }, { "===" : [ { var : "event" }, "create" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "submit" ] }, { "===" : [ { var : "event" }, "submit" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "cloze" ] }, { "===" : [ { var : "event" }, "finish" ] } ] },
                //{ and: [ { "===" : [ { var : "parent.name" }, "regex" ] }, { "===" : [ { var : "event" }, "regex" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "regex" ] }, { "===" : [ { var : "event" }, "plus" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "regex" ] }, { "===" : [ { var : "event" }, "eval" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "quick_decide" ] }, { "===" : [ { var : "event" }, "click" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "quick_decide" ] }, { "===" : [ { var : "event" }, "finish" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "fast_poll" ] }, { "===" : [ { var : "event" }, "click" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "fast_poll" ] }, { "===" : [ { var : "event" }, "finish" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "pdf_viewer" ] }, { "===" : [ { var : "event" }, "goto" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "pdf_viewer" ] }, { "===" : [ { var : "event" }, "next" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "pdf_viewer" ] }, { "===" : [ { var : "event" }, "prev" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "kanban_board" ] }, { "===" : [ { var : "event" }, "add" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "kanban_board" ] }, { "===" : [ { var : "event" }, "drop" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "kanban_board" ] }, { "===" : [ { var : "event" }, "del" ] } ] },
                { and: [ { "===" : [ { var : "parent.name" }, "kanban_card" ] }, { "===" : [ { var : "event" }, "change" ] } ] },
            ] }
        ]
    };

    log = log.filter(entry => jsonLogic.apply(filter, entry));
    let histogram = cmMonitorHelper.time.histogram(log, cmMonitorHelper.time.domain(log), ...cmMonitorHelper.time.interval.get(interval.current));

    let processed = {
        activities: {
            name: "\u2140 Activities",
            type: "column",
            color: colors[0],
            data: []
        },
        submits: {
            name: "\u2140 Submits",
            type: "column",
            color: colors[6],
            data: []
        },
        learners_online: {
            name: "\u2140 Learners online",
            type: "areaspline",
            color: "#000",
            fillColor: "#ccc",
            fillOpacity: 0.7,
            lineWidth: .5,
            dashStyle: "LongDash",
            yAxis: 1,
            states: { hover: { lineWidth: .5}},
            data: []
        }
    };
    histogram.forEach(slice => {
        let values = slice.reduce((prev, curr) => {
            if (jsonLogic.apply(activities, curr))
                prev.activities += 1;
            if (curr.event === "submit" && curr.parent.name === "submit")
                prev.submits += 1;
            if (!prev.learners[curr.user.user])
                prev.learners[curr.user.user] = true;
            return prev;
        }, { submits: 0, activities: 0, learners: {} });
        values.learners = Object.keys(values.learners).length;
        processed.activities.data.push([Date.parse(slice.x1), values.activities]);
        processed.submits.data.push([Date.parse(slice.x1), values.submits]);
        processed.learners_online.data.push([Date.parse(slice.x1), values.learners]);
    });

    self.postMessage({
            "tooltip.enabled": true,
            "tooltip.shared": true,
            series: [ processed.learners_online, processed.activities, processed.submits ],
            "plotOptions.series.marker.enabled": false,
            "subtitle.align": "right",
            "subtitle.text": range.current[Object.keys(range.current)[0]].label,
            "subtitle.style": { fontWeight: "bold" },
            "xAxis.type": "datetime",
            yAxis: [
                { title: { text: 'activities \\ ' + interval.current } },
                { title: { text: "learners \\ " + interval.current }, opposite: true }
            ]
        });
}, false);