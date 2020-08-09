let drawGraph = (svg, g, algorithm = undefined) => {
    let line = d3.line()
        .curve(d3.curveBasis);

    let straightline = d3.line()

    visg = svg.append('g')
        .attr('transform', 'translate(20, 20)')

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
            + g.tableIndex[d.depth].indexOf(d) * table_vert_space + ")" )

    tablegroups.append('rect')
        .attr('width', table_width)
        .attr('height', d => d.attributes.length * attr_height + header_height)  
        .attr('fill', 'black')
        .attr('stroke', 'gray')
        .on('click', d => console.log(d))

    tablegroups.append('text')
        .attr('x', table_width/2)
        .attr('y', attr_height/2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '0.7em')
        .attr("font-family", "Arial")
        .text(d => d.header + " w:" + d.weight)
    
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
        .attr("fill", "#ccc")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on('click', d => console.log(d))

    attrgroups.append('text')
        .attr('x', table_width/2)
        .attr('y', attr_height/2 + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.7em')
        .attr("font-family", "Arial")
        .text(d => d.attr + " w:" + d.weight) 

    let get_1st_coord = (d) => 
        [d.leftTable.depth * depth_distance + table_width,
        d.leftTable.attributes.indexOf(d.att1)*attr_height + header_height + attr_height/2 + g.tableIndex[d.leftTable.depth].indexOf(d.leftTable)*table_vert_space]
   
    let get_2nd_coord = (d) => {
        if (d.leftTable.depth != d.rightTable.depth)
            return [d.rightTable.depth * depth_distance, 
                d.rightTable.attributes.indexOf(d.att2)*attr_height + header_height + attr_height/2 + g.tableIndex[d.rightTable.depth].indexOf(d.rightTable)*table_vert_space]
        else return [d.leftTable.depth * depth_distance + table_width,
            d.rightTable.attributes.indexOf(d.att2)*attr_height + header_height + attr_height/2 + g.tableIndex[d.rightTable.depth].indexOf(d.rightTable)*table_vert_space]    
    }



    // *****
    // groups
    // *****
    visg.selectAll('.grouprects') 
        .data(g.groups)
        .enter()
        .append('path')
        .attr('class', 'grouplines')
        .attr('stroke-width', 3)
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