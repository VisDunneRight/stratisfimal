class GansnerSameRank {
    constructor(graph){
        this.g = graph;
        this.max_iterations = 2;
        this.elapsedTime = 0;
    }

    median(array) {
        array = array.sort();
        if (array.length % 2 === 0) {
          return (array[array.length/2] + array[(array.length / 2) - 1]) / 2;
        }
        else return array[(array.length - 1) / 2]; 
      }

    applyArrangement(cloneGraph){
        for (let table of cloneGraph.tables){
            let table2 = this.g.tables.find(t => t.name == table.name)
            table2.weight = table.weight;

            for (let attribute of table.attributes){
                let attribute2 = table2.attributes.find(a => a.name == attribute.name)
                attribute2.weight = attribute.weight
                attribute2.assignedWeight = attribute.assignedWeight
            }
        }
    }

    arrange(){
        let startTime = new Date().getTime()

        this.g.setExactWeights();

        let best_crossings = this.g.getEdgeCrossings()

        for (let i=0; i<this.max_iterations; i++){
            let cloneGraph = _.cloneDeep(this.g)
            
            if (i%2 == 0) {
                this.arrangeLeft(cloneGraph)
            } else this.arrangeRight(cloneGraph)

            //this.transpose(cloneGraph);

            let cur_crossings = cloneGraph.getEdgeCrossings()
            
            if (cur_crossings <= best_crossings) {
                this.applyArrangement(cloneGraph)
                best_crossings = cur_crossings
            }
        }

        this.elapsedTime = new Date().getTime() - startTime;
    }

    // arrangeLeft(g){
    //     for (let i=1; i<=g.maxDepth + 1; i++){
    //         let layerTables = g.tableIndex[i];
    //         let layerEdges = g.edgeIndex[i-1];
    //         let thisLayerEdges = g.edgeIndex[i];

    //         for (let table of layerTables){
    //             let weights = layerEdges
    //                 .filter(e => e.rightTable == table && e.leftTable.depth != e.rightTable.depth)
    //                 .map(e => parseFloat(e.leftTable.weight))
    //             table.weight = this.median(weights)

    //             for (let attribute of table.attributes){
    //                 let tableWeights = layerEdges
    //                     .filter(e => e.rightAttribute == attribute  && e.leftTable.depth != e.rightTable.depth)
    //                     .map(e => parseFloat(e.leftTable.weight))

    //                 let attributeWeights = layerEdges
    //                     .filter(e => e.rightAttribute == attribute  && e.leftTable.depth != e.rightTable.depth)
    //                     .map(e => parseFloat(e.leftAttribute.weight))

    //                 //console.log(attributeWeights, tableWeights)
    //                 //console.log(this.median(tableWeights), this.median(attributeWeights))

    //                 //if (tableWeights.length != 0){
    //                     attribute.weight = parseFloat(this.median(tableWeights)) + parseFloat(this.median(attributeWeights)/table.attributes.length)
    //                     attribute.assignedWeight = parseFloat(this.median(tableWeights)) + parseFloat(this.median(attributeWeights)/table.attributes.length)
    //                 //}

    //                 //console.log(isNaN(attribute.weight))
    //             }
    //         }

    //         g.setExactWeights()
    //     }
    // }

    arrangeLeft(g){

        let tmpWeightsTables = [];
        let tmpAttributeWeights = {};

        for (let i=1; i<=g.maxDepth + 1; i++){
            let layerTables = g.tableIndex[i];
            let layerEdges = g.edgeIndex[i-1];
            tmpWeightsTables[i] = [];

            for (let t in layerTables){
                let table = layerTables[t];

                let weights = layerEdges
                    .filter(e => e.rightTable == table && !this.isSameRankEdge(e))
                    .map(e => e.leftTable.weight)
       
                tmpWeightsTables[i].push(this.median(weights))

                for (let attribute of table.attributes){
                    let tableWeights = layerEdges
                        .filter(e => e.rightAttribute == attribute  && !this.isSameRankEdge(e))
                        .map(e => parseFloat(e.leftTable.weight))

                    let attributeWeights = layerEdges
                        .filter(e => e.rightAttribute == attribute  && !this.isSameRankEdge(e))
                        .map(e => parseFloat(e.leftAttribute.weight))

                    // complete here
                }
            }
        }

        for (let i in tmpWeightsTables){
            for (let j in tmpWeightsTables[i]){
                g.tableIndex[i][j].weight = tmpWeightsTables[i][j];
            }
        }

        g.setExactWeights()
    }

    arrangeRight(g){

        let tmpWeightsTables = {};
        let tmpAttributeWeights = {};

        for (let i=g.maxDepth; i>=0; i--){
            let layerTables = g.tableIndex[i];
            let layerEdges = g.edgeIndex[i];

            for (let table of layerTables){
                let weights = layerEdges
                    .filter(e => e.leftTable == table)
                    .map(e => parseFloat(e.rightTable.weight))

                tmpWeightsTables[table.name] = this.median(weights)
                tmpAttributeWeights[table.name] = {};

                for (let attribute of table.attributes){
                    let tableWeights = layerEdges
                        .filter(e => e.leftAttribute == attribute)
                        .map(e => parseFloat(e.rightTable.weight))

                    let attributeWeights = layerEdges
                        .filter(e => e.leftAttribute == attribute)
                        .map(e => parseFloat(e.rightAttribute.weight))

                    if (table.name == "T1y1") console.log(attributeWeights, tableWeights)

                    tmpAttributeWeights[table.name][attribute.name] = parseFloat(this.median(tableWeights)) + parseFloat(this.median(attributeWeights)/table.attributes.length);
                }
            }
        }

        this.reorder(g, tmpWeightsTables, tmpAttributeWeights)
        //g.setExactWeights()
    }

    isSameRankEdge(e){
        return e.leftTable.depth == e.rightTable.depth;
    }

    reorder(g, tmpWeightsTables, tmpAttributeWeights){
        for (let i in g.tableIndex){
            for (let j in g.tableIndex[i]){
                let tabl = g.tableIndex[i][j]
                tabl.weight = tmpWeightsTables[tabl.name];

                for (let k in tabl.attributes){
                    let attr = tabl.attributes[k]
                    attr.weight = tmpAttributeWeights[tabl.name][attr.name]
                }

                tabl.attributes.sort((a, b) => {
                    if (isNaN(a.weight) || isNaN(b.weight)) return 0;
                    else return a.weight > b.weight ? 1 : -1;
                })
            }

            g.tableIndex[i].sort((a, b) => {
                if (isNaN(a.weight) || isNaN(b.weight)) return 0;
                else return a.weight > b.weight ? 1 : -1;
            })
        }
    }

    // arrangeRight(g){
    //     for (let i=g.maxDepth; i>0; i--){
    //         let layerTables = g.tableIndex[i];
    //         let layerEdges = g.edgeIndex[i];

    //         for (let table of layerTables){
    //             let weights = layerEdges
    //                 .filter(e => e.leftTable == table)
    //                 .map(e => parseFloat(e.rightTable.weight))

    //             table.weight = this.median(weights)

    //             for (let attribute of table.attributes){
    //                 let tableWeights = layerEdges
    //                     .filter(e => e.leftAttribute == attribute)
    //                     .map(e => parseFloat(e.rightTable.weight))

    //                 let attributeWeights = layerEdges
    //                     .filter(e => e.leftAttribute == attribute)
    //                     .map(e => parseFloat(e.rightAttribute.weight))

    //                 //if (tableWeights.length != 0) {
    //                     attribute.weight = parseFloat(this.median(tableWeights)) + parseFloat(this.median(attributeWeights)/table.attributes.length)
    //                     attribute.assignedWeight = parseFloat(this.median(tableWeights)) + parseFloat(this.median(attributeWeights)/table.attributes.length)
    //                 //}
    //             }
    //         }

    //         g.setExactWeights()
    //     }
    // }

    transpose(g){
        let improved = true;
        while (improved){
            improved = false;
            for (let i=0; i<=g.maxDepth; i++){

                let initCrossings = g.getEdgeCrossingsAtDepth(i);

                let layerTables = g.tableIndex[i];
                
                for (let j = 0; j < layerTables.length - 1; j++){
                    let table1 = layerTables[j];
                    let table2 = layerTables[j+1];

                    this.swap(table1, table2);

                    let curCrossings = g.getEdgeCrossingsAtDepth(i) + g.getEdgeCrossingsAtDepth(i+1)

                    if (curCrossings < initCrossings){
                        improved = true;
                    } else this.swap(table1, table2)
                }

                for (let table of layerTables){
                    
                    for (let k=0; k < table.attributes.length - 1; k++){
                        let attr1 = table.attributes[k]
                        let attr2 = table.attributes[k+1]

                        this.swap(attr1, attr2)

                        let curCrossings2 = g.getEdgeCrossingsAtDepth(i) + g.getEdgeCrossingsAtDepth(i+1)

                        if (curCrossings2 < initCrossings){
                            improved = true;
                        } else this.swap(attr1, attr2)
                    }
                }
            }
        }
    }

    swap(w1, w2){
        let tmpw = w1.weight;
        w1.weight = w2.weight;
        w2.weight = tmpw;
    }
}