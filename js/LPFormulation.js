class LPFormulation {
    constructor (g) {
        this.g = g;
        this.mip = true;
        this.verbose = false;
        this.elapsedTime = 0
    }

    arrange(){

        let startTime = new Date().getTime()

        // build model from graph
        let model = {}

        this.fillModel(model)
        let prob = this.modelToString(model)

        //console.log(this.modelToString(model))

        // solve
        let result = {}, objective, i;

        if (this.verbose) glp_set_print_func(console.log);

        let lp = glp_create_prob();
        glp_read_lp_from_string(lp, null, prob);

        glp_scale_prob(lp, GLP_SF_AUTO);
            
        let smcp = new SMCP({presolve: GLP_ON});
        glp_simplex(lp, smcp);

        if (this.mip){
            glp_intopt(lp);
            objective = glp_mip_obj_val(lp);

            for(i = 1; i <= glp_get_num_cols(lp); i++){
                result[glp_get_col_name(lp, i)] = glp_mip_col_val(lp, i);
            }
        } else {
            objective = glp_get_obj_val(lp);
            for(i = 1; i <= glp_get_num_cols(lp); i++){
                result[glp_get_col_name(lp, i)] = glp_get_col_prim (lp, i);
            }
        }

        //console.log(result)
        this.apply_solution(result)

        this.elapsedTime = new Date().getTime() - startTime
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
                for (let j=0; j<layerTables.length; j++){
                    if (i==j) continue
                    let t2 = layerTables[j]
                    if (t1 != t2){
                        model.subjectTo += "x_T" + t1.name + "_T" + t2.name 
                            + " + x_T" + t2.name + "_T" + t1.name + " = 1\n"

                        // add vars to bounds
                        model.bounds += "binary x_T" + t1.name + "_T" + t2.name + "\n"
                        model.bounds += "binary x_T" + t2.name + "_T" + t1.name + "\n"
                    }
                }
            }
        }

        // transitivity of relationship above
        for (let k=0; k < this.g.maxDepth + 1; k++){
             let layerTables = this.g.tableIndex[k];
             for (let i = 0; i < layerTables.length; i++){
                 let t1 = layerTables[i];
                 for (let j =0; j < layerTables.length; j++){
                    if (i==j) continue
                    let t2 = layerTables[j];

                    for (let m = j + 1; m < layerTables.length; m++){
                        let t3 = layerTables[m];

                        model.subjectTo += "x_T" + t3.name + "_T" + t1.name + " - x_T" + t3.name + "_T" 
                            + t2.name + " - x_T" + t2.name + "_T" + t1.name + " >= - 1\n" 
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
                            + "x_T" + attr1.table.name + "_T" + attr2.table.name + " = 0\n"
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
                        //model.bounds += "binary x_T" + t3.name + "_T" + t1.name + "\n"
                        //model.bounds += "binary x_T" + t3.name + "_T" + t2.name + "\n"
                        //model.bounds += "binary x_T" + t2.name + "_T" + t1.name + "\n"
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
                        // I am still doubtful about this needing to be declared for inverted left-right edges or not...

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
                        let u1 = u1v1.leftAttribute.name 
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        model.subjectTo += "c_" + u1 + v1  
                            + "_" + u2 + v2 
                            + " + x_" + u2 + "_" + u1 
                            + " + x_" + v1 + "_" + u2 
                            + " >= 1\n"
                    }
                }
            }
        }

    }

    modelToString(model){
        return model.minimize + model.subjectTo + model.bounds + '\nEnd\n'
    }

    apply_solution(solution){
        window.solution = solution
        for (let i=0; i<this.g.maxDepth + 1; i++){
            let layerTables = this.g.tableIndex[i];

            layerTables.sort((a, b) => {
                if (solution["x_T" + a.name + "_T" + b.name] == 1) return 1
            })

            if (i==1) {
                window.layerTables = layerTables
                window.solution = solution
            }

            for (let k in layerTables){
                layerTables[k].weight = k;
            }

            for (let table of layerTables){
                table.attributes.sort((a, b) => {
                    if (solution["x_" + a.name + "_" + b.name] == 1) return 1
                })

                for (let j=0; j<table.attributes.length; j++){
                    table.attributes[j].weight = j;
                }
            }
        }
    }
}