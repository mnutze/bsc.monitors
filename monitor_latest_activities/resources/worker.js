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
        subjectFilter = [{ "or": subject.values.map(_subject => ({ "===" : [ { var : subject.key }, _subject ] }) ) }];

    if (subjectFilter)
        subjectFilter.forEach(_filter => {
            if (!filter.and.includes(_filter))
                filter.and.push(_filter);
        });

    // filter data against rules
    data = cmMonitorHelper.data.filter(data, filter);

    // reverse data, so get newest data first
    data = data.reverse();

    data = data.slice(0, 50);

    self.postMessage({ aggregated: data, filterAbility: true, filter: filter });

}, false);