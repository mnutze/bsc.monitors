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
    root.cmMonitorHelper = factory(root.d3, root.moment, root.jsonLogic);
  }
}(this, function(d3, moment, jsonLogic) {
    let range = function(start, end) {
        return (new Date(this.created_at) > start && new Date(this.created_at) < end)
    };
    if (jsonLogic)
        jsonLogic.add_operation("range", range);

    let cmMonitorHelper = {};
    
    cmMonitorHelper.colors = [
        "#00698B", "#6ea03c", "#7c7c7c", "#E46C16",
        "#9A4483","#F0BD00", "#d62728",  "#8c564b",
        "#17becf", "#2ca02c", "#ff7f0e", "#9467bd",
        "#1f77b4", "#bcbd22"
    ];
    
    cmMonitorHelper.data = {
        filter: (data, rules) => {
            if (!data)
                return data;
            if (!rules)
                return;
            return data.filter(dataset => jsonLogic.apply(rules, dataset));
        }
    };
    
    /** @from ccm.js
     * @summary get or set the value of a deeper object property
     * @param {Object} obj - object that contains the deeper property
     * @param {string} key - key path to the deeper property in dot notation
     * @param {*} [value] - value that should be set for the deeper property
     * @returns {*} value of the deeper property
     * @example
     * var obj = {
     *   test: 123,
     *   foo: {
     *     bar: 'abc',
     *     baz: 'xyz'
     *   }
     * };
     * var result = ccm.helper.deepValue( obj, 'foo.bar' );
     * console.log( result ); // => 'abc'
     * @example
     * var obj = {};
     * var result = ccm.helper.deepValue( obj, 'foo.bar', 'abc' );
     * console.log( obj );    // => { foo: { bar: 'abc' } }
     * console.log( result ); // => 'abc'
     */
    cmMonitorHelper.deepValue = function ( obj, key, value ) {
        return recursive( obj, key.split( '.' ), value );
        /**
         * recursive helper function, key path is given as array
         */
        function recursive( obj, key, value ) {
            if ( !obj ) return;
            var next = key.shift();
            if ( key.length === 0 )
                return value !== undefined ? obj[ next ] = value : obj[ next ];
            if ( !obj[ next ] && value !== undefined ) obj[ next ] = isNaN( key[ 0 ] ) ? {} : [];
            return recursive( obj[ next ], key, value );  // recursive call
        }
    };

    cmMonitorHelper.humanReadableSubject = function (course, subject) {
        if (course && course.humanReadable && course.humanReadable.learners && course.humanReadable.learners[subject])
            return course.humanReadable.learners[subject];
        return subject;
    };

    if (d3)
        cmMonitorHelper.time = {
            domain: data => d3.extent(data, dataset => new Date(dataset.created_at)),
            histogram: (data, domain, unit, value) => {
                if (!domain)
                    domain = d3.extent(data, dataset => new Date(dataset.created_at));
                let x = d3.scaleTime().domain(domain);

                // create histogram function
                let histogram = d3.histogram()
                    .value(dataset => new Date(dataset.created_at))
                    .domain(domain)
                    .thresholds(x.ticks(unit, value));

                return histogram(data);
            },
            interval: new Map([
                /*["1m", [d3.timeMinute, 1]]["5m", [d3.timeMinute, 5]],*/["10m", [d3.timeMinute, 10]],
                /*["15m", [d3.timeMinute, 15]],*/ ["30m", [d3.timeMinute, 30]], ["1h", [d3.timeHour, 1]],
                ["2h", [d3.timeHour, 2]], ["6h", [d3.timeHour, 6]], ["12h", [d3.timeHour, 12]], ["1d", [d3.timeDay, 1]],
                ["2d", [d3.timeDay, 2]], ["1w", [d3.timeWeek, 1]], ["1M", [d3.timeMonth, 1]]
            ]),
            mondayWeek: () => d3.timeMonday,
            range: new Map([
                ["Today", now => [new Date(moment(now).startOf("day")), now]],
                ["Yesterday", now => [new Date(moment().subtract(1, 'days').startOf('day')), new Date(moment().subtract(1, 'days').endOf('day'))]],
                ["last 24h", now => [new Date(moment(now).subtract(1, "day")), now]],
                ["last 48h", now => [new Date(moment(now).subtract(2, "day")), now]],
                ["last 7d", now => [new Date(moment(now).subtract(1, "week")), now]],
                ["last 14d", now => [new Date(moment(now).subtract(2, "week")), now]],
                ["last month", now => [new Date(moment(now).subtract(1, "month")), now]],
                ["last 2 month", now => [new Date(moment(now).subtract(2, "month")), now]],
                ["last 6 month", now => [new Date(moment(now).subtract(6, "month")), now]]
            ])
        };
    
    return cmMonitorHelper;
}));
