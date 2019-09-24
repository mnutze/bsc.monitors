ccm.files['configs.js'] = {
    'demo': {
        'key': 'demo',
        // initial configuration
        'sources': {
            'log': {
                'filter': { // jsonLogic filter definition
                    'and': [
                        { 'has': [ 'user' ] },
                        { 'or': [
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'youtube' ] }, { '===' : [ { 'var' : 'event' }, 'onStateChange' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'quiz' ] }, { '===' : [ { 'var' : 'event' }, 'finish' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'live_poll' ] }, { '===' : [ { 'var' : 'event' }, 'finish' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'feedback' ] }, { '===' : [ { 'var' : 'event' }, 'create' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'comment' ] }, { '===' : [ { 'var' : 'event' }, 'create' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'submit' ] }, { '===' : [ { 'var' : 'event' }, 'submit' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'cloze' ] }, { '===' : [ { 'var' : 'event' }, 'finish' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'regex' ] }, { '===' : [ { 'var' : 'event' }, 'plus' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'regex' ] }, { '===' : [ { 'var' : 'event' }, 'eval' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'quick_decide' ] }, { '===' : [ { 'var' : 'event' }, 'click' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'quick_decide' ] }, { '===' : [ { 'var' : 'event' }, 'finish' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'fast_poll' ] }, { '===' : [ { 'var' : 'event' }, 'click' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'fast_poll' ] }, { '===' : [ { 'var' : 'event' }, 'finish' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'pdf_viewer' ] }, { '===' : [ { 'var' : 'event' }, 'goto' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'pdf_viewer' ] }, { '===' : [ { 'var' : 'event' }, 'next' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'pdf_viewer' ] }, { '===' : [ { 'var' : 'event' }, 'prev' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'kanban_board' ] }, { '===' : [ { 'var' : 'event' }, 'add' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'kanban_board' ] }, { '===' : [ { 'var' : 'event' }, 'drop' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'kanban_board' ] }, { '===' : [ { 'var' : 'event' }, 'del' ] } ] },
                            { 'and': [ { '===' : [ { 'var' : 'parent.name' }, 'kanban_card' ] }, { '===' : [ { 'var' : 'event' }, 'change' ] } ] },
                        ] }
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
                        { 'created_at': { '$lte': '2019-09-22'} },
                        {
                            '$or': [
                                { '$and': [ { 'parent.name': 'youtube' }, { 'event': 'onStateChange'  } ] },
                                { '$and': [ { 'parent.name': 'quiz' }, { 'event': 'finish' } ] },
                                { '$and': [ { 'parent.name': 'live_poll' }, { 'event': 'finish' } ] },
                                { '$and': [ { 'parent.name': 'feedback' }, { 'event': 'create' } ] },
                                { '$and': [ { 'parent.name': 'comment' }, { 'event': 'create' } ] },
                                { '$and': [ { 'parent.name': 'submit' }, { 'event': 'submit' } ] },
                                { '$and': [ { 'parent.name': 'cloze' }, { 'event': 'finish' } ] },
                                { '$and': [ { 'parent.name': 'regex' }, {  'event': 'plus' } ] },
                                { '$and': [ { 'parent.name': 'regex' }, {  'event': 'eval' } ] },
                                { '$and': [ { 'parent.name': 'quick_decide' }, {  'event': 'click' } ] },
                                { '$and': [ { 'parent.name': 'quick_decide' }, {  'event': 'finish' } ] },
                                { '$and': [ { 'parent.name': 'fast_poll' }, {  'event': 'click' } ] },
                                { '$and': [ { 'parent.name': 'fast_poll' }, {  'event': 'finish' } ] },
                                { '$and': [ { 'parent.name': 'pdf_viewer' }, {  'event': 'goto' } ] },
                                { '$and': [ { 'parent.name': 'pdf_viewer' }, {  'event': 'next' } ] },
                                { '$and': [ { 'parent.name': 'pdf_viewer' }, {  'event': 'prev' } ] },
                                { '$and': [ { 'parent.name': 'kanban_board' }, {  'event': 'add' } ] },
                                { '$and': [ { 'parent.name': 'kanban_board' }, {  'event': 'drop' } ] },
                                { '$and': [ { 'parent.name': 'kanban_board' }, {  'event': 'del' } ] },
                                { '$and': [ { 'parent.name': 'kanban_card' }, {  'event': 'change' } ] }
                            ]
                        }
                    ]
                }
            },
        },
        'subject': {
            'key': 'user.user'
        },
        'runtimeOptions': true,
        'range': { 'enabled': true, 'value': 1200, 'type': 'number'}, // range in minutes
        'render': {
            'key': 'table',
            'columns': {
                'order': [ 'datetime', 'learner', 'component', 'event', 'context' ],
                'datetime': { 'key': 'created_at', 'label': 'Datetime', },
                'learner': { 'key': 'user.user', 'label': 'Learner', 'filter': true },
                'component': { 'key': 'parent.name', 'label': 'Resource-Type', 'filter': true },
                'event': { 'key': 'event', 'label': 'Action', 'filter': true },
                'context': { 'key': 'parent.descr,parent.id', 'label': 'Context', 'filter': true } // @TODO -> combine showing Resource-Type+Context to 'Resource'
            }
        },
        'user': [ 'ccm.instance', 'https://ccmjs.github.io/akless-components/user/versions/ccm.user-9.0.1.js', {
            'realm': 'hbrsinfpseudo', 'logged_in': true
        } ],
    }
};