importScripts("https://mnutze.github.io/bsc.course-monitoring/libs/js/logic.js");
importScripts("https://mnutze.github.io/bsc.monitors/libs/cmMonitorHelper.js");

self.addEventListener("message", function (event) {
    // assign log data
    let data = event.data.data.log;
    let filter = event.data.filter;
    let subject = event.data.subject;

    if (data.length < 1)
        return;

    if (Object.keys(filter).length === 0 )
        filter = { and: [ {} ] };

    let subjectFilter;
    if (subject && subject.values && subject.values.length > 0)
        subjectFilter = [{ "or": subject.values.map(subject => ({ "===" : [ { var : subject.key }, subject ] }) ) }];

    if (subjectFilter)
        subjectFilter.forEach(filter => {
            if (!filter.and.includes(filter))
                filter.and.push(filter);
        });

    // filter data against rules
    data = cmMonitorHelper.data.filter(data, filter);

    // reverse data, so get newest data first
    data = data.reverse();

    data = data.slice(0, 50);

    self.postMessage({ aggregated: data, filterAbility: true });

}, false);