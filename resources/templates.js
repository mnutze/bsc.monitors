ccm.files[ "templates.js" ] = {
    table: {
        // id: "il_center_col", class: "col-sm-12"
        id: "", class: "", inner: {
            class: "ilTableOuter", inner: {
                class: "table-responsive", style:"overflow-y: scroll; height:%height%px; width: %width%px;", inner: {
                    tag: "table", class: "table table-striped fullwidth", inner: [
                        { tag: "thead", inner: { tag: "tr", inner: "%thead%" } },
                        { tag: "tbody", inner: "%tbody%" }
                    ]
                }
            }
        }
    },
    tables: {
        table: {
            id: "", class: "", inner: {
                class: "ilTableOuter", inner: {
                    class: "table-responsive", style:"overflow-y: scroll; height:%height%px; width: %width%px;", inner: {
                        tag: "table", class: "table table-striped fullwidth", inner: [
                            { tag: "thead", inner: { tag: "tr", inner: "%thead%" } },
                            { tag: "tbody", inner: "%tbody%" }
                        ]
                    }
                }
            }
        },
        rowSet: [
            { tag: "tr", inner: "%content%" },
            { tag: "tr", class: "hide", inner: "%details%" },
            { tag: "tr", class: "hide" }
        ],
        td: {
            tag: "td", class: "sm-cell small", inner: "%tdInner%", style: "font-size: 80%"
        }
    },
    row: {
        tag: "tr", inner: "%content%"
    },
    rowSet: [
        { tag: "tr", inner: "%content%" },
        { tag: "tr", class: "hide", inner: "%details%" },
        { tag: "tr", class: "hide" }
    ],
    separator: {
        tag: "tr", inner: {
            tag: "td", colspan: "%colspan%"
        }
    },
    cell: {
        tag: "td", class: "small %ext%", inner: "%text%", onclick: "%click%"
    },
    filterValues: [
        {
            tag: "span",
            class: "cm_table_cell",
            inner: "%value%"
        },
        {
            tag: "span",
            class: "cm_table_cell_filter",
            inner: [
                {
                    tag: "span",
                    class: "glyphicon glyphicon-zoom-in",
                    onclick: "%filterValueIn%"
                },
                {
                    tag: "span",
                    class: "glyphicon glyphicon-zoom-out",
                    onclick: "%filterValueOut%"
                }
            ]
        }
    ],

    nav: {
        wrapper: [
            {
                tag: "input", type: "checkbox", name: "toggle-sidebar", id: "toggle-sidebar"
            },
            {
                tag: "label", for: "toggle-sidebar", class: "open", inner: {
                    tag: "span", class: "glyphicon shadow glyphicon-filter"
                }
            },
            {
                class: "cm-monitor-sidebar",
                inner: [
                    {
                        class: "monitorOptions",
                        style: "text-align: left; padding: 4px;",
                    },
                    {
                        class: "monitorFilter",
                        style: "text-align: left; padding: 4px; overflow-y: scroll",
                        inner: [
                            { tag: "span", style: "font-size: smaller; display: block; font-weight: bold;", inner: "Filter" },
                            { id: "monitorFilterList" }
                        ]
                    },
                    {
                        style: "position: absolute; bottom: 5px; right: 10px",
                        inner: [
                            /*{
                                tag: "span",
                                id: "apply-options",
                                class: "glyphicon glyphicon-ok",
                                style: "text-align: left; padding-right: 10px;"
                            },*/
                            {
                                tag: "span",
                                id: "close-options",
                                class: "glyphicon glyphicon-remove",
                                style: "text-align: left;"
                            }
                        ]
                    }
                ]
            }
        ],
        filter: {
            range: {
        inner: [
            //"Limit - Sort - First by Second"
            {
                inner: "Range",
                tag: "span",
                style: "font-size: smaller; display: block; font-weight: bold;"
            },
            {
                tag: "label",
                for: "from",
                inner: "from",
                class: "conrol-label",
                style: "font-size: smaller; margin-right: 5px;"
            },
            {
                tag: "input",
                type: "datetime-local",
                id: "from",
                style: "margin-right: 10px; height: 20px; font-size: x-small; width: 130px;"
            },
            {
                tag: "label",
                for: "to",
                inner: "to",
                class: "conrol-label",
                style: "font-size: smaller; margin-right: 5px;"
            },
            {
                tag: "input",
                type: "datetime-local",
                id: "to",
                style: "margin-right: 10px; height: 20px; font-size: x-small; width: 130px;"
            }
        ]
    },
            values: [
                {
                    tag: "span",
                    class: "cm_table_cell",
                    inner: "%value%"
                },
                {
                    tag: "span",
                    class: "cm_table_cell_filter",
                    inner: [
                        {
                            tag: "span",
                            class: "glyphicon glyphicon-zoom-in",
                            onclick: "%filterValueIn%"
                        },
                        {
                            tag: "span",
                            class: "glyphicon glyphicon-zoom-out",
                            onclick: "%filterValueOut%"
                        }
                    ]
                }
            ],
        }
    }
};