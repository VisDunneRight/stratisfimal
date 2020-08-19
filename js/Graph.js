class Graph {
    constructor(obj){
        if (obj == undefined){
            this.edges = []; 
            this.tables = []; 
            this.tableIndex = []; 
            this.edgeIndex = [];
            this.maxDepth = 0;
            this.groups = [];
            this.baseRowDistance = 6;
            this.newLayer();
        } else {
            obj && Object.assign(this, obj);
        }
        
    }

    addGroup(group){
        this.groups.push(group);
    }

    updateGroupCoords(){
        for (let group of this.groups){
            group.updateCoords();
        }
    }

    newLayer(){
        this.tableIndex.push([])
        this.edgeIndex.push([])
    }

    addTable(table){
        while(this.maxDepth < table.depth){
            this.maxDepth+=1;
            this.newLayer();
        }

        table.graph = this;

        this.tables.push(table);
        this.tableIndex[table.depth].push(table);
    }

    addEdge(edge){
        this.edges.push(edge)
        this.edgeIndex[edge.leftTable.depth].push(edge)
    }

    ensureUniqueEdges(){
        // finish
    }

    getEdgeCrossings(){
        let count = 0;
        for (let d in this.edgeIndex) count += this.getEdgeCrossingsAtDepth(d);
        return count;
    }

    getEdgeCrossingsAtDepth(d, verbose=false){
        let crossings = 0;
        let layerEdges = this.edgeIndex[d];

        for (let i in layerEdges){
            let currEdge = layerEdges[i];
            for (let j = parseFloat(i)+1; j < layerEdges.length; j++){
                let otherEdge = layerEdges[j];
                if (currEdge.crosses(otherEdge)){
                    if (verbose) console.log("Edge " + currEdge.leftAttribute.name + currEdge.rightAttribute.name + " crosses " + otherEdge.leftAttribute.name + otherEdge.rightAttribute.name)
                    crossings+=1;
                }
            }
        }
        
        return crossings
    }

    sortGraph(){
        for (let t of this.tables){
            if (!t.main) {
                t.attributes = t.attributes.sort((a, b) => a.weight > b.weight? 1 : -1)
            }
        }

        this.tables = this.tables.sort((a, b) => a.weight > b.weight? 1 : -1)

        for (let t_ind of this.tableIndex){
            t_ind.sort((a, b) => a.weight > b.weight? 1 : -1)
        }
    }

    setExactWeights(){
        for (let i in this.tableIndex){
            let layerTables = this.tableIndex[i];
            layerTables = layerTables.sort((a, b) => {
                return a.weight > b.weight? 1 : -1
            })
            
            for (let j in layerTables){
                let table = layerTables[j]
                table.weight = parseFloat(j)

                let attrs = table.attributes;
                attrs = attrs.sort((a, b) => {
                    return a.weight > b.weight? 1 : -1
                })
                
                for (let k in attrs){
                    attrs[k].weight = parseFloat(k)
                }
            }
        }
    
        this.updateGroupCoords()

    }

    getNumStraightEdges(){
        let res = 0;
        for (let i in this.edgeIndex){
            res += this.getNumStraightEdgesAtDepth(i)
        }
        return res;
    }

    getNumStraightEdgesAtDepth(i){
        let res = 0
        for (let e of this.edgeIndex[i]){
            if (e.leftTable.weight == e.rightTable.weight) res += 1
        }
        return res;
    }

    adjustTableYPosition(){
        let improved = true;
        
        // while (improved){
        //     improved = false;     

        //     for (let i=1; i<this.tableIndex.length; i++){
        //         let tableCol = this.tableIndex[i];
        //         let initColLength = tableCol.length;

        //         let bestPosition = undefined;
        //         let bestNumOfStraightEdges = this.getNumStraightEdges();
    
        //         let curStraightEdges = this.getNumStraightEdges();
                
        //         for (let j=0; j<initColLength; j++){
        //             let temptable = new Table('blank_' + i + "_" + j, 'blank_' + i + "_" + j, false, i);
        //             temptable.weight = j - 0.5;
    
        //             this.addTable(temptable);
        //             this.setExactWeights();

        //             if (this.getNumStraightEdges() > bestNumOfStraightEdges){
        //                 bestPosition = j;
        //                 bestNumOfStraightEdges = this.getNumStraightEdges();
        //                 improved = true;
        //             }

        //             this.tables.splice(this.tables.indexOf(temptable), 1);
        //             tableCol.splice(tableCol.indexOf(temptable), 1);
        //             this.setExactWeights();
        //         }

        //         if (bestPosition != undefined){
        //             let temptable = new Table('blank_' + i + "_" + bestPosition, 'blank_' + i + "_" + bestPosition, false, i);
        //             temptable.weight = bestPosition - 0.5;
        //             temptable.visibility = 'hidden';

        //             this.addTable(temptable);
        //             this.setExactWeights();
        //             this.updateGroupCoords();
        //         }  
        //     }
        // }

        this.adjustAttrOffset()
    }

    getBendLeft(table){
        let depth = table.depth;

        let edgeColLeft = this.edgeIndex[depth-1];
        let edgesLeft = edgeColLeft.filter(e => e.rightTable == table && !e.isSameRankEdge());

        if (edgesLeft.length == 0) return 0
        else return Math.abs(edgesLeft.map(e => e.getBendiness()).reduce((a, b) => {
            return Math.round(a*1000 + b*1000)/1000;
        }));
    }

    getBendRight(table){
        let depth = table.depth;
        let edgeColRight = this.edgeIndex[depth];
        let edgesRight = edgeColRight.filter(e => e.leftTable == table && !e.isSameRankEdge());

        if (edgesRight.length == 0) return 0;
        else return Math.abs(edgesRight.map(e => e.getBendiness()).reduce((a, b) => {
            return Math.round(a*1000 + b*1000)/1000;
        }));
    }

    getTableBendiness(table){
        let depth = table.depth;

        if (depth == 0) return Math.round(this.getBendRight(table)*1000)/1000;
        else return Math.round(this.getBendLeft(table)*1000 + this.getBendRight(table)*1000)/1000;
    }

    getGraphTotalEdgeBendiness(){
        return Math.round(1000*this.tables.map(t => this.getTableBendiness(t)).reduce((a, b) => a + b))/1000;
    }

    adjustAttrOffset(){
        let improved = true;
        let cycleIndex = 0;

        let getUpperBound = (tableCol, k) => {
            let upperBound = -2;
            if (k == 0) upperBound = 0;
            else upperBound = tableCol[k-1].verticalAttrOffset - this.baseRowDistance + tableCol[k-1].attributes.length + 2; 
            return upperBound;
        }

        let getLowerBound = (tableCol, k) => {
            let lowerBound = 2;
            if (tableCol.length == 1 || tableCol[k+1] == undefined) lowerBound = 20; // random big number
            else lowerBound = tableCol[k+1].verticalAttrOffset + this.baseRowDistance - tableCol[k].attributes.length - 2; 
            //if (tableCol[k+1] != undefined) console.log(tableCol[k+1], tableCol[k+1].verticalAttrOffset, this.baseRowDistance, table.attributes.length)
            return lowerBound
        }

        let swipeRight = () => {
            for (let i=0; i<this.tableIndex.length; i++){
                let tableCol = this.tableIndex[i];
                for (let k=0; k<tableCol.length; k++){
                    let table = tableCol[k];
                    let currBendinessSum = this.getTableBendiness(table);
                    //let currBendinessSum = this.getBendRight(table);
                    let currBestOffset = table.verticalAttrOffset;

                    let upperBound = getUpperBound(tableCol, k);
                    let lowerBound = getLowerBound(tableCol, k);

                    // if (i == 3 && tableCol[k+1] != undefined) console.log(table.name, 'lower bound', lowerBound,
                    //     'next offset', tableCol[k+1].verticalAttrOffset, 'attributes', tableCol[k].attributes.length)

                    for (let j = upperBound; j <= lowerBound; j++){
                        table.verticalAttrOffset = j;
                        let tempBendinessSum = this.getTableBendiness(table);
                        //let tempBendinessSum = this.getBendRight(table);

                        // if (i == 3) console.log(table.name, 'change proposal', j, 'bends' ,tempBendinessSum)
                        
                        if (tempBendinessSum <= currBendinessSum){
                            currBestOffset = j;
                            currBendinessSum = tempBendinessSum;
                            improved = true;
                            // if (i == 3) console.log(table.name, 'change accepted')
                        }
                    }
    
                    table.verticalAttrOffset = currBestOffset;
                }
            }
        }

        let swipeLeft = () => {
            for (let i = this.tableIndex.length - 1; i>0; i--){
                let tableCol = this.tableIndex[i];

                for (let k=tableCol.length - 1; k >= 0; k--){
                    let table = tableCol[k];
                    let currBendinessSum = this.getTableBendiness(table);
                    //let currBendinessSum = this.getBendLeft(table);
                    let currBestOffset = table.verticalAttrOffset;

                    let upperBound = getUpperBound(tableCol, k);
                    let lowerBound = getLowerBound(tableCol, k);

                    

                    for (let j = upperBound; j <= lowerBound; j++){
                        table.verticalAttrOffset = j;
                        let tempBendinessSum = this.getTableBendiness(table);

                        //if (table.name == "T1y0") console.log('proposal', j, 'proposal bend', tempBendinessSum, this.baseRowDistance);
                        
                        if (tempBendinessSum < currBendinessSum){
                            currBestOffset = j;
                            currBendinessSum = tempBendinessSum;
                        }
                    }
    
                    table.verticalAttrOffset = currBestOffset;
                }
            }
        }

        while (cycleIndex < 10){
            //console.log(cycleIndex, (cycleIndex % 2 == 0? 'right' : 'left'), this.getGraphTotalEdgeBendiness());
            cycleIndex++;

            if (cycleIndex % 2 == 0) swipeRight()
            else swipeLeft()
        }

        this.updateGroupCoords();
    }
}

