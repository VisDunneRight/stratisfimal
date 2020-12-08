class SimpleGraph {
    constructor(){
        this.nodes = [];
        this.edges = [];
        this.nodeIndex = [];
        this.edgeIndex = [];
        this.groups = [];

        this.fakeNodeCount = 0;
        this.groupIdCounter = 0;
    }

    addNode(node){
        // if (this.nodes.name.find(n => n.name == node.name) != undefined) 
        // fix when it becomes a problem
        if (node.id == undefined) node.id = node.name;

        this.nodes.push(node);
        this.addLevelsToNodeIndex(node.depth);
        this.nodeIndex[node.depth].push(node);
    }

    addNodes(nodeArr){
        for (let node of nodeArr) this.addNode(node);
    }

    addLevelsToNodeIndex(depth){
        while (this.nodeIndex.length <= depth){
            this.nodeIndex.push([]);
        }
    }

    addEdge(edge){
        this.edges.push(edge);
    }

    addGroup(group){
        group.id = this.groupIdCounter++;
        this.groups.push(group);
    }

    addAnchors(){
        for (let e of this.edges){
            if (Math.abs(e.nodes[0].depth - e.nodes[1].depth) > 1) {
                let minDepth = Math.min(e.nodes[0].depth, e.nodes[1].depth)
                let maxDepth = Math.max(e.nodes[0].depth, e.nodes[1].depth)
                let newanchors = [];

                for (let i = minDepth + 1; i<maxDepth; i++){
                    let n = {depth: i, name: 'a' + this.fakeNodeCount++, type: 'fake'};
                    this.addNode(n);
                    newanchors.push(n);
                }

                let firstEdge = {nodes:[e.nodes[0], newanchors[0]]};
                let lastEdge = {nodes:[newanchors[newanchors.length - 1], e.nodes[1]]};  

                if (e.value != undefined){
                    firstEdge.value = e.value;
                    lastEdge.value = e.value;
                }

                this.addEdge(firstEdge);
                this.addEdge(lastEdge);

                for (let i = 1; i < newanchors.length; i++){
                    let newEdge = {nodes: [newanchors[i-1], newanchors[i]]}; 
                    if (e.value != undefined) newEdge.value = e.value;
                    
                    this.addEdge(newEdge);
                }
            }
        }

        this.edges = this.edges.filter(e => Math.abs(e.nodes[0].depth - e.nodes[1].depth) <= 1);

        // note: this is important
        this.groups = this.groups.sort((a, b) => a.nodes.length > b.nodes.length)

        for (let g of this.groups){
            let minRank = Math.min.apply(0, g.nodes.map(n => n.depth))
            let maxRank = Math.max.apply(0, g.nodes.map(n => n.depth))
            let maxNodesInRank = 0;
            for (let r = minRank; r <= maxRank; r++){
                if (g.nodes.filter(n => n.depth == r).length > maxNodesInRank) maxNodesInRank = g.nodes.filter(n => n.depth == r).length;
            }
            for (let r = minRank; r <= maxRank; r++){
                while (g.nodes.filter(n => n.depth == r).length < maxNodesInRank){
                    let n = {depth: r, name: 'a' + this.fakeNodeCount++, type: 'fake'};
                    for (let gr of this.groups){
                        if (g.nodes.every(val => gr.nodes.includes(val)) && gr != g) gr.nodes.push(n);
                    }
                    g.nodes.push(n);
                    this.addNode(n);
                }
            }
        }

        let maxNodesInRank = Math.max.apply(0, this.nodeIndex.map(n => n.length))
        for (let r in this.nodeIndex){
            if (this.groups.length == 0) continue;
            while (this.nodeIndex[r].length < maxNodesInRank){
                this.addNode({depth: r, name: 'a' + this.fakeNodeCount++, type: 'fake'});
            }
        }
    }

    draw(svg, nodeXDistance = 50, nodeYDistance = 50){

        let getNodeCoordX = (node) => (20 + nodeXDistance * (node.depth));
        let getNodeCoordY = (node) => {
            if (node.y != undefined) return 20 + node.y * nodeYDistance;
            else return 20 + this.nodeIndex[node.depth].indexOf(node) * nodeYDistance
        };
        let line = d3.line().curve(d3.curveBasis);

        for (let edge of this.edges){
            svg.append('path')
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('d', () => {
                    let m = 0;
                    let s1 = 0;
                    let s2 = 0;
                    if (edge.nodes[0].depth == edge.nodes[1].depth) m = 20 + (Math.abs(getNodeCoordY(edge.nodes[0]) - getNodeCoordY(edge.nodes[1]))/(nodeYDistance/4));
                    else {
                        s1 = 20;
                        s2 = -20;
                    }
                    return line([
                        [getNodeCoordX(edge.nodes[0]), getNodeCoordY(edge.nodes[0])], 
                        [getNodeCoordX(edge.nodes[0]) + m + s1, getNodeCoordY(edge.nodes[0])], 
                        [getNodeCoordX(edge.nodes[1]) + m + s2, getNodeCoordY(edge.nodes[1])],
                        [getNodeCoordX(edge.nodes[1]), getNodeCoordY(edge.nodes[1])]
                    ])
                })
        }

        for (let depth in this.nodeIndex){
            for (let node of this.nodeIndex[depth]){
                let g = svg.append('g')
                    .attr('transform', 'translate(' + (getNodeCoordX(node)) + ',' + getNodeCoordY(node) +')')
                    .attr('opacity', () => {return node.type == "fake"? 0.3 : 1})

                g.append('circle')
                    .datum(node)
                    .attr('class', 'node')
                    .attr('fill', '#ccc')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 2)
                    .attr('r', 5)
                    .attr('cx', 0)
                    .attr('cy', 0)

                g.append('text')
                    .text(node.name)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 'small')
                    .attr('y', -10)
            }
        }

        for (let group of this.groups){
            if (group.nodes == undefined || group.nodes.length == 0) continue;
            let top = Math.min.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let bottom = Math.max.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let left = Math.min.apply(0, group.nodes.map(n => getNodeCoordX(n)));
            let right = Math.max.apply(0, group.nodes.map(n => getNodeCoordX(n)));

            let groupMargin = 5;
            for (let gr of this.groups){
                if (group.nodes.every(n => gr.nodes.includes(n)) && gr != group) groupMargin -= 3;
            }

            svg.append('rect')
                .attr('stroke', 'black')
                .attr('x', left - 10 - groupMargin)
                .attr('y', top - 8 - groupMargin)
                .attr('opacity', 0.2)
                .attr('width', right - left + 20 + groupMargin*2)
                .attr('height', bottom - top + 16 + groupMargin*2)
                .attr('fill', 'none')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3 3')
        }
    }
}

