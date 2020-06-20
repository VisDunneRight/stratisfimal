class LPFormulation {
    constructor (g) {
        this.g = g;
    }

    arrange(){
        let model = {}

        this.fillModel(model)
        this.printModel(model)
    }

    fillModel(model){
        model.minimize = "Minimize \ncrossings: "
        model.subjectTo = "Subject To \n"
        model.bounds = "\nBounds \n"

        // objective function
        for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerEdges = this.g.edgeIndex[k]
            for (let i=0; i<layerEdges.length; i++){
                for (let j=0; j<layerEdges.length; j++){
                    if (layerEdges[i] != layerEdges[j]){
                        let crossvar = "c_" + layerEdges[i].leftAttribute.name + layerEdges[i].rightAttribute.name 
                            + "_" + layerEdges[j].leftAttribute.name + layerEdges[j].rightAttribute.name
                        model.minimize += crossvar + ' + '
                
                        model.bounds += "binary " + crossvar + "\n"
                    }
                }
            }      
        }

        model.minimize = model.minimize.substring(0, model.minimize.length - 2) + '\n\n';
        
        // each table must be above or below another one
        for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            for (let i=0; i<layerTables.length; i++){
                let t1 = layerTables[i]
                for (let j=i+1; j<layerTables.length; j++){
                    let t2 = layerTables[j]
                    if (t1 != t2){
                        model.subjectTo += "x_" + t1.name + "_" + t2.name 
                            + " + x_" + t2.name + "_" + t1.name + " = 1\n"

                        // add vars to bounds
                        model.bounds += "binary x_" + t1.name + "_" + t2.name + "\n"
                        model.bounds += "binary x_" + t2.name + "_" + t1.name + "\n"
                    }
                }
            }
        }

        // transitivity of relationship above
        for (let k=0; k < this.g.maxDepth + 1; k++){
             let layerTables = this.g.tableIndex[k];
             for (let i = 0; i < layerTables.length; i++){
                 let t1 = layerTables[i];
                 for (let j = i + 1; j < layerTables.length; j++){
                    let t2 = layerTables[j];

                    for (let m = j + 1; m < layerTables.length; m++){
                        let t3 = layerTables[m];

                        model.subjectTo += "x_" + t3.name + "_" + t1.name + " - x_" + t3.name + "_" 
                            + t2.name + " - x_" + t2.name + "_" + t1.name + " >= - 1\n" 
                    }
                 }
            }
        }

        // each attribute must be above or below another one
        for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            for (let i=0; i<layerAttributes.length; i++){
                let t1 = layerAttributes[i]
                for (let j=i+1; j<layerAttributes.length; j++){
                    let t2 = layerAttributes[j]
                    if (t1 != t2){
                        model.subjectTo += "x_" + t1.name + "_" + t2.name 
                            + " + x_" + t2.name + "_" + t1.name + " = 1\n"
                    }
                }
            }
        }

        // grouping constraint of attributes within tables
        for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            for (let attr1 of layerAttributes){
                for (let attr2 of layerAttributes){
                    if (attr1.table != attr2.table){
                        model.subjectTo += "x_" + attr1.name + "_" + attr2.name + " - "
                            + "x_" + attr1.table.name + "_" + attr2.table.name + " = 0\n"
                    }
                }
            }
        }


        // transitivity of relationship above
        for (let k=0; k < this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            for (let i = 0; i < layerAttributes.length; i++){
                let t1 = layerAttributes[i];
                for (let j = 0; j < layerAttributes.length; j++){
                    let t2 = layerAttributes[j];
                    if (i == j) continue 

                    for (let m = 0; m < layerAttributes.length; m++){
                        if (m == i || m == j) continue

                        let t3 = layerAttributes[m];

                        model.subjectTo += "x_" + t3.name + "_" + t1.name + " - x_" + t3.name + "_" 
                           + t2.name + " - x_" + t2.name + "_" + t1.name + " >= - 1\n" 

                        // add vars to bounds
                        model.bounds += "binary x_" + t3.name + "_" + t1.name + "\n"
                        model.bounds += "binary x_" + t3.name + "_" + t2.name + "\n"
                        model.bounds += "binary x_" + t2.name + "_" + t1.name + "\n"
                   }
                }
           }
       }

        // attribute positions determine crossings for non-same-rank edges
        for (let k=0; k < this.g.maxDepth; k++){
            let layerEdges = this.g.edgeIndex[k]
            for (let i=0; i<layerEdges.length; i++){
                let u1v1 = layerEdges[i]
                for (let j=0; j<layerEdges.length; j++){
                    if (i==j) continue
                    let u2v2 = layerEdges[j]

                    // leave same rank edges out for now
                    if (u1v1.leftTable.depth == u1v1.rightTable.depth || u2v2.leftTable.depth == u2v2.rightTable.depth) continue

                    let u1 = u1v1.leftAttribute.name 
                    let v1 = u1v1.rightAttribute.name
                    let u2 = u2v2.leftAttribute.name
                    let v2 = u2v2.rightAttribute.name

                    model.subjectTo += "c_" + u1 + v1  
                        + "_" + u2 + v2 
                        + " + x_" + u2 + "_" + u1 
                        + " + x_" + v1 + "_" + v2 
                        + " >= 1\n"

                    model.subjectTo += "c_" + u1 + v1  
                        + "_" + u2 + v2 
                        + " + x_" + u1 + "_" + u2 
                        + " + x_" + v2 + "_" + v1 
                        + " >= 1\n"
                }
            }
        }

        // same rank edges
        for (let k=0; k < this.g.maxDepth + 1; k++){

            let layerEdges = this.g.edgeIndex[k];
            
            for (let i=0; i<layerEdges.length; i++){
                let u1v1 = layerEdges[i]
                
                for (let j=0; j<layerEdges.length; j++){
                    let u2v2 = layerEdges[j]

                    if (u1v1 == u2v2) continue

                    // if they are both same rank edges
                    if (u1v1.leftTable.depth == u1v1.rightTable.depth && u2v2.leftTable.depth == u2v2.rightTable.depth){
                        let u1 = u1v1.leftAttribute.name 
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        model.subjectTo += "c_" + u1 + v1  
                            + "_" + u2 + v2 
                            + " + x_" + u1 + "_" + u2 
                            + " + x_" + v1 + "_" + v2 
                            + " + x_" + u2 + "_" + v1 
                            + " >= 1\n"

                        model.subjectTo += "c_" + u1 + v1  
                            + "_" + u2 + v2 
                            + " + x_" + u1 + "_" + u2 
                            + " + x_" + v1 + "_" + v2 
                            + " + x_" + v2 + "_" + u1 
                            + " >= 1\n"

                    // if u1v1 is the same rank edge and the other is not
                    } else if (u1v1.isSameRankEdge() && !u2v2.isSameRankEdge()){
                        console.log(u1v1)
                    }
                }
            }
        }

    }

    printModel(model){
        //console.log(model.minimize + model.subjectTo + model.bounds + '\nEnd\n')
    }
}