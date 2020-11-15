class SimpleGraph {
    constructor(){
        this.nodes = [];
        this.edges = [];
        this.nodeIndex = [];
        this.edgeIndex = [];
        this.groups = [];
    }

    addNode(node){
        // if (this.nodes.name.find(n => n.name == node.name) != undefined) 
        // fix when it becomes a problem
        node.id = node.name;

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
        this.groups.push(group);
    }

    draw(svg){

        let getNodeCoordX = (node) => (20 + 50 * (node.depth));
        let getNodeCoordY = (node) => (20 + this.nodeIndex[node.depth].indexOf(node) * 50);
        let line = d3.line().curve(d3.curveBasis);

        for (let edge of this.edges){
            svg.append('path')
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('d', () => {
                    return line([
                        [getNodeCoordX(edge.nodes[0]), getNodeCoordY(edge.nodes[0])], 
                        [getNodeCoordX(edge.nodes[1]), getNodeCoordY(edge.nodes[1])]])
                })
        }

        for (let depth in this.nodeIndex){
            for (let node of this.nodeIndex[depth]){
                let g = svg.append('g')
                    .attr('transform', 'translate(' + (getNodeCoordX(node)) + ',' + getNodeCoordY(node) +')');

                g.append('circle')
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
            let top = Math.min.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let bottom = Math.max.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let left = Math.min.apply(0, group.nodes.map(n => getNodeCoordX(n)));
            let right = Math.max.apply(0, group.nodes.map(n => getNodeCoordX(n)));

            console.log(top, bottom, group.nodes.map(n => getNodeCoordY(n)));

            svg.append('rect')
                .attr('stroke', 'black')
                .attr('x', left - 10)
                .attr('y', top - 10)
                .attr('width', right - left + 20)
                .attr('height', bottom - top + 20)
                .attr('fill', 'none')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3 3')
        }
    }
}

