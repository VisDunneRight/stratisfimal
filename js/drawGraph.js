let find_negative_vertical_space = (g) => {
    let minVal = Infinity;

    for (d of g.tables){
        let tmpval = g.tableIndex[d.depth].indexOf(d) * table_vert_space + d.verticalAttrOffset * attr_height;
        if (tmpval < minVal) minVal = tmpval;
    }

    return minVal
}

let drawGraph = (svg, g, algorithm = undefined) => {
    let line = d3.line()
        .curve(d3.curveBasis);

    let straightline = d3.line()

    table_vert_space = g.baseRowDistance * attr_height

    let negative_vert_space = find_negative_vertical_space(g) // TODO: temporary fix

    visg = svg.append('g')
        .attr('transform', 'translate(20, ' + (20 - negative_vert_space) + ')')

    svg.append('defs')
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', [0, 0, 10, 10])
        .attr('refX', 5)
        .attr('refY', 5)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', d3.line()([[0, 0], [0, 10], [10, 5]]))
        .attr('stroke', 'black');

    // temp grid indicator
    for (let i in [ ... Array(10).keys()]){
        visg.append('path')
            .attr('stroke-width', 1)
            .attr('stroke', '#ccc')
            .attr('fill', 'none')
            .style("stroke-dasharray", ("5, 3"))
            .attr('d', straightline([[0, attr_height*g.baseRowDistance*i], [1000, attr_height*g.baseRowDistance*i]]))
    }

    // *****
    // tables
    // *****
    tablegroups = visg.selectAll(".tables")
        .data(g.tables)
        .enter()
        .append('g')
        .attr('class', 'tablegroup')
        .attr('id', d => 'tablegroup_' + d.name)
        .style('visibility', d => d.visibility)
        .attr('transform', d => 
            "translate(" + (d.depth*depth_distance) + "," 
            + (g.tableIndex[d.depth].indexOf(d) * table_vert_space + d.verticalAttrOffset * attr_height) + ")" )

    tablegroups.append('rect')
        .attr('width', table_width)
        .attr('height', d => d.attributes.length * attr_height + header_height)  
        .attr('fill', d => d.type == "groupheader"? "#eee" : 'black')
        .attr('stroke', 'gray')
        .on('click', d => console.log(d))

    tablegroups.append('text')
        .attr('x', table_width/2)
        .attr('y', attr_height/2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.type == "groupheader"? "black" : 'white')
        .attr('font-size', '0.7em')
        .attr("font-family", "Arial")
        .text(d => d.header /*+ " w:" + d.weight*/)
    
    // *****
    // attributes
    // *****
    attrgroups = tablegroups.selectAll('.attrs')
        .data(d => d.attributes)
        .enter()
        .append('g')
        .attr('transform', (d, i) => "translate(0, " + (header_height + (i)*attr_height) + ")")
        
    attrgroups.append("rect")
        .attr("width", table_width)
        .attr("height", attr_height)
        .attr("fill", d => d.type == "constraint"? "#FFFF73" : "#ccc")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on('click', d => console.log(d))

    attrgroups.append('text')
        .attr('x', table_width/2)
        .attr('y', attr_height/2 + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.7em')
        .attr("font-family", "Arial")
        .text(d => d.attr /*+ " w:" + d.weight*/) 

    let get_1st_coord = (d) => 
        [d.leftTable.depth * depth_distance + table_width,
        d.leftTable.attributes.indexOf(d.leftAttribute)*attr_height + header_height + attr_height/2 + g.tableIndex[d.leftTable.depth].indexOf(d.leftTable)*table_vert_space + d.leftTable.verticalAttrOffset*attr_height]
   
    let get_2nd_coord = (d) => {
        if (d.leftTable.depth != d.rightTable.depth)
            return [d.rightTable.depth * depth_distance, 
                d.rightTable.attributes.indexOf(d.rightAttribute)*attr_height + header_height + attr_height/2 + g.tableIndex[d.rightTable.depth].indexOf(d.rightTable)*table_vert_space + d.rightTable.verticalAttrOffset*attr_height]
        else return [d.leftTable.depth * depth_distance + table_width,
            d.rightTable.attributes.indexOf(d.rightAttribute)*attr_height + header_height + attr_height/2 + g.tableIndex[d.rightTable.depth].indexOf(d.rightTable)*table_vert_space + d.rightTable.verticalAttrOffset*attr_height]    
    }

    // *****
    // groups
    // *****
    g.updateGroupCoords()
    visg.selectAll('.grouprects') 
        .data(g.groups)
        .enter()
        .append('path')
        .attr('class', 'grouplines')
        .attr('stroke-width', 2)
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .style("stroke-dasharray", ("5, 3"))
        .attr('d', d => { return straightline(d.coords) })


    // *****
    // edges
    // *****
    edges = visg.selectAll('.edges')
        .data(g.edges)
        .enter()
        .append('path')
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('marker-end', d => d.type == "directed"? 'url(#arrow)' : "")
        .attr('d', d => {
            first = get_1st_coord(d)
            second = get_2nd_coord(d)
            return line(
                [first, 
                [first[0] + depth_distance*0.2, first[1]],
                [second[0] + (d.leftTable.depth == d.rightTable.depth ? 1 : -1)*depth_distance*0.2, second[1]],
                second]
            )
        })

    edgeLabels = visg.selectAll('.edgeLabels')
        .data(g.edges.filter(e => e.label != undefined))
        .enter()
        .append('text')
        .text(e => e.label)
        .style('font-size', 'small')
        .style('text-anchor', 'middle')
        .attr('transform', d => {
            first = get_1st_coord(d)
            second = get_2nd_coord(d)
            return 'translate(' + (first[0]/2 + second[0]/2 + (d.leftTable.depth == d.rightTable.depth ? 1 : 0)*depth_distance*0.16) + ',' + (-2 + first[1]/2 + second[1]/2) + ')';
        })

    d3.select(svg.node().parentNode)
        .append('div').append('text')
        .text('crossings: ' + g.getEdgeCrossings() + ', tables: ' + g.tables.length + ', edges: ' + g.edges.length)
        .style('font-family', 'Arial')
        .attr('class', 'crossing_count')

    if (algorithm != undefined && algorithm.elapsedTime != undefined){
        d3.select(svg.node().parentNode)
            .append('div').append('text')
            .text('time: ' + algorithm.elapsedTime + 'ms')
            .style('font-family', 'Arial')
            .attr('class', 'crossing_count')

        if (algorithm.iterations != undefined){

            d3.select(svg.node().parentNode)
                .append('text')
                .text('⏹️')

            d3.select(svg.node().parentNode)
                .append('text')
                .text('⏪')
                .on('click', () => {
                    algorithm.cur_iteration--;
                    algorithm.apply_iteration(algorithm.cur_iteration);

                    svg.selectAll('.tablegroup')
                        .transition()
                        .duration(750)
                        .attr('transform', d => 
                        'translate(' + (d.depth*depth_distance) + ' ,  ' + (algorithm.g.tableIndex[d.depth].indexOf(d) * table_vert_space)  + ' )')

                    // d3.selectAll
                    // .attr('transform', d => 
                    //     // "translate(" + (d.depth*depth_distance) + "," 
                    //     // + algorithm.g.tableIndex[d.depth].indexOf(d) * table_vert_space + ")" )
                    //     "translate(0, 0)"
                    //     )
                })

            d3.select(svg.node().parentNode)
                .append('text')
                .text(algorithm.cur_iteration)
            
            d3.select(svg.node().parentNode)
                .append('text')
                .text('⏩')
                .on('click', () => {

                })

            d3.select(svg.node().parentNode)
                .append('text')
                .text('▶️')
        }
    }
}