ccm.files['configs.js'] = {
    'demo': {
        'key': 'demo',
        'course': {}, // course script
        'incompleteLog': true,
        'interval': { 'enabled': true, 'current': '2h', 'exclude': [] },
        'range': { 'enabled': true, 'range': 'lessons' },
        'render': { 'key': 'highcharts' },
        'sources': {
            'log': {
                'filter': { // jsonLogic filter definition
                    'and': [
                        { "has": [ "user" ] },
                        /** @info currently active cause of ccm.user in se1 is not configured
                         * to be assignable to a specific context */
                        { "!==" : [ { "var" : "event" }, "login" ] }
                    ]
                }
            }
        },
        'stores': {
            'log': {
                'store': [ 'ccm.store', { 'name': 'mnutze2s_activity_log', 'url': 'https://ccm2.inf.h-brs.de' } ],
                'key': { // mongodb query language
                    '$and': [
                        { 'user': { '$exists': true } },
                        { 'event': { '$ne': 'login' } }
                    ]
                }
            },
        },
        'user': [ 'ccm.instance', 'https://ccmjs.github.io/akless-components/user/versions/ccm.user-9.0.1.js', {
            'realm': 'hbrsinfpseudo', 'logged_in': true
        } ],
    }
};