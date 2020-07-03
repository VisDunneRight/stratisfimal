class LPFormulation {
    constructor (g) {
        this.g = g;
        this.mip = true;
        this.verbose = true;
        this.elapsedTime = 0
    }

    async arrange(){
        // var script = document.createElement('script');
        // script.src = "./lib/glpk.min.js";
        // document.head.appendChild(script);

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
        model.minimize = "Minimize \n"
        model.subjectTo = "Subject To \n"
        model.bounds = "\nBounds \n"

        let definitions = {}
        let crossing_vars = {}

        let mkc = (u1, v1, u2, v2) => {
            let res = "c_" + u1 + v1 + "_" + u2 + v2;
            crossing_vars[res] = ""
            return res
        }

        let mkx = (u1, u2, pre="") => {
            let res = "x_" + pre + u1 + "_" + pre + u2
            let oppositeres = "x_" + pre + u2 + "_" + pre + u1
            let offset = 0

            if (definitions[oppositeres] != undefined){
                offset -= 1
                return [" - " + oppositeres, offset]
            } else if (definitions[res] == undefined){
                //definitions[res] = ''
            }
            return [" + " + res, offset]
        }

        let mkxBase = (u1, u2, pre="") => {
            return "x_" + pre + u1 + "_" + pre + u2
        }

        // store all variable names in order
        for (let k=0; k < this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat();

            // store tables
            for (let i=0; i<layerTables.length; i++){
                let t1 = layerTables[i].name;
                for (let j=i+1; j<layerTables.length; j++){
                    let t2 = layerTables[j].name;
                    definitions[mkxBase(t1, t2, 'T')] = ''
                }
            }

            // store attributes
            for (let i=0; i<layerAttributes.length; i++){
                let a1 = layerAttributes[i].name;
                for (let j=i+1; j<layerAttributes.length; j++){
                    let a2 = layerAttributes[j].name;
                    definitions[mkxBase(a1, a2)] = ''
                }
            }
        }

        
        for (let k=0; k < this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            
            // global ordering of tables
        //     for (let i = 0; i < layerTables.length; i++){
        //         let t1 = layerTables[i].name;
                
        //         for (let j = i+1; j < layerTables.length; j++){
        //            let t2 = layerTables[j].name;

        //            for (let m = j + 1; m < layerTables.length; m++){
        //                let t3 = layerTables[m].name;

        //             model.subjectTo += ""
        //                + mkx(t3, t1, 'T')[0] 
        //                + mkx(t2, t3, 'T')[0] 
        //                + mkx(t2, t1, 'T')[0] 
        //                + " >= " + (1 + mkx(t3, t1, 'T')[1] + mkx(t2, t3, 'T')[1] + mkx(t2, t1, 'T')[1]) + "\n"

        //            }
        //         }
        //    }

            // global ordering of tables 
            for (let i=0; i<layerTables.length; i++){
                let t1 = layerTables[i].name;

                for (let j = i+1; j < layerTables.length; j++){
                    let t2 = layerTables[j].name;

                    for (let m = j + 1; m < layerTables.length; m++){
                        let t3 = layerTables[m].name;

                        model.subjectTo += ""
                            + mkxBase(t1, t2, 'T')
                            + " + " + mkxBase(t2, t3, 'T')
                            + " - " + mkxBase(t1, t3, 'T')
                            + " >= 0\n"

                        model.subjectTo += ""
                            + "- " + mkxBase(t1, t2, 'T')
                            + " - " + mkxBase(t2, t3, 'T')
                            + " + " + mkxBase(t1, t3, 'T')
                            + " >= -1\n"
                    }
                }
            }

            // global ordering of attributes
            for (let i = 0; i < layerAttributes.length; i++){
                let t1 = layerAttributes[i].name;
                
                for (let j = i+1; j < layerAttributes.length; j++){
                    let t2 = layerAttributes[j].name;
                    if (i == j) continue;

                    if (layerAttributes[i].table.name != layerAttributes[j].table.name) continue

                    for (let m = j+1; m < layerAttributes.length; m++){
                        if (m == j || m == i) continue

                        if (layerAttributes[m].table.name != layerAttributes[i].table.name) continue
                        if (layerAttributes[m].table.name != layerAttributes[j].table.name) continue

                        let t3 = layerAttributes[m].name;

                        // model.subjectTo += ""
                        //     + mkx(t3, t1)[0] 
                        //     + mkx(t2, t3)[0] 
                        //     + mkx(t2, t1)[0] 
                        //     + " >= " + (1 + mkx(t3, t1)[1] + mkx(t2, t3)[1] + mkx(t2, t1)[1]) + "\n"

                        model.subjectTo += ""
                            + mkxBase(t1, t2)
                            + " + " + mkxBase(t2, t3)
                            + " - " + mkxBase(t1, t3)
                            + " >= 0\n"

                        model.subjectTo += ""
                            + "- " + mkxBase(t1, t2)
                            + " - " + mkxBase(t2, t3)
                            + " + " + mkxBase(t1, t3)
                            + " >= -1\n"
                    }
                }
            }
        }

        // determining crossings
        for (let k=0; k < this.g.maxDepth + 1; k++){
            let layerEdges = this.g.edgeIndex[k]

            for (let i=0; i<layerEdges.length; i++){
                let u1v1 = layerEdges[i];

                for (let j=i+1; j<layerEdges.length; j++){
                    let u2v2 = layerEdges[j];

                    if (!this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){
                        let u1 = u1v1.leftAttribute.name
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        if (u1 == u2 || v1 == v2) continue

                        let p1 = mkc(u1, v1, u2, v2)
                        let finalsum = 1
                        model.subjectTo += p1 + ""
                        let p2 = mkxBase(u2, u1)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u1, u2)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }
                        
                        let p3 = mkxBase(v1, v2)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            p3 = mkxBase(v2, v1)
                            finalsum -= 1
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"


                        p1 = mkc(u1, v1, u2, v2)
                        finalsum = 1
                        model.subjectTo += p1 + ""
                        p2 = mkxBase(u1, u2)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u2, u1)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }
                        
                        p3 = mkxBase(v2, v1)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            p3 = mkxBase(v1, v2)
                            finalsum -= 1
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"
                        
                    // if they are both same rank edges
                    } else if (this.isSameRankEdge(u1v1) && this.isSameRankEdge(u2v2)) {
                        let u1 = u1v1.leftAttribute.name
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        let p1 = mkc(u1, v1, u2, v2)
                        let finalsum = 1
                        model.subjectTo += p1 + ""
                        let p2 = mkxBase(u1, u2)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u2, u1)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        let p3 = mkxBase(v1, v2)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(v2, v1)
                            model.subjectTo += " - " + p3
                        }

                        let p4 = mkxBase(u2, v1)
                        if (definitions[p4] != undefined){
                            model.subjectTo += p4
                        } else {
                            finalsum -= 1
                            p4 = mkxBase(v1, u2)
                            model.subjectTo += " + " + p4
                        }
                        model.subjectTo += " >= " + finalsum + "\n"


                        p1 = mkc(u1, v1, u2, v2)
                        finalsum = 1
                        model.subjectTo += p1 + ""
                        p2 = mkxBase(u1, u2)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u2, u1)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        p3 = mkxBase(v1, v2)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(v2, v1)
                            model.subjectTo += " - " + p3
                        }

                        p4 = mkxBase(v2, u1)
                        if (definitions[p4] != undefined){
                            model.subjectTo += p4
                        } else {
                            finalsum -= 1
                            p4 = mkxBase(u1, v2)
                            model.subjectTo += " + " + p4
                        }
                        model.subjectTo += " >= " + finalsum + "\n"

                    } else if (this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)) {
                        let u1 = u1v1.leftAttribute.name
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        let p1 = mkc(u1, v1, u2, v2)
                        let finalsum = 1
                        model.subjectTo += p1 + ""
                        let p2 = mkxBase(u2, u1)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u1, u2)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        let p3 = mkxBase(v1, u2)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(u2, v1)
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"


                        p1 = mkc(u1, v1, u2, v2)
                        finalsum = 1
                        model.subjectTo += p1 + ""
                        p2 = mkxBase(u2, v1)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(v1, u2)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        p3 = mkxBase(u1, u2)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(u2, u1)
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"

                    } else if (!this.isSameRankEdge(u1v1) && this.isSameRankEdge(u2v2)) {
                        let u1 = u1v1.leftAttribute.name
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        let p1 = mkc(u1, v1, u2, v2)
                        let finalsum = 1
                        model.subjectTo += p1 + ""
                        let p2 = mkxBase(u1, u2)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(u2, u1)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        let p3 = mkxBase(v2, u1)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(u1, v2)
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"


                        p1 = mkc(u1, v1, u2, v2)
                        finalsum = 1
                        model.subjectTo += p1 + ""
                        p2 = mkxBase(u1, v2)
                        if (definitions[p2] != undefined){
                            model.subjectTo += " + " + p2
                        } else {
                            p2 = mkxBase(v2, u1)
                            finalsum -= 1
                            model.subjectTo += " - " + p2
                        }

                        p3 = mkxBase(u2, u1)
                        if (definitions[p3] != undefined){
                            model.subjectTo += " + " + p3
                        } else {
                            finalsum -= 1
                            p3 = mkxBase(u1, u2)
                            model.subjectTo += " - " + p3
                        }
                        model.subjectTo += " >= " + finalsum + "\n"
                    }
                }
            }
        }


       // grouping constraint of attributes within tables
       for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            
            for (let i=0; i<layerAttributes.length; i++){
                let attr1 = layerAttributes[i].name;
                let t1 = layerAttributes[i].table.name;

                for (let j=i+1; j<layerAttributes.length; j++){
                    let attr2 = layerAttributes[j].name;
                    let t2 = layerAttributes[j].table.name

                    if (t1 != t2){
                        // model.subjectTo += "x_" + attr1.name + "_" + attr2.name + " - "
                        //     + "x_T" + attr1.table.name + "_T" + attr2.table.name + " = 0\n"

                        model.subjectTo += mkxBase(attr1, attr2) + ""
                            + " - " + mkxBase(t1, t2, 'T') 
                            + " = 0\n"
                    }
                }
            }
        }

        // determining crossings
        // for (let k=0; k < this.g.maxDepth; k++){
        //     let layerEdges = this.g.edgeIndex[k]
            
        //     for (let i=0; i<layerEdges.length; i++){
        //         let u1v1 = layerEdges[i]
                
        //         for (let j=0; j<layerEdges.length; j++){
        //             let u2v2 = layerEdges[j]

        //             let u1 = u1v1.leftAttribute.name 
        //             let v1 = u1v1.rightAttribute.name
        //             let u2 = u2v2.leftAttribute.name
        //             let v2 = u2v2.rightAttribute.name

        //             // edges with the same source or the same target can't cross
        //             if (u1 == u2 || v1 == v2) continue

        //             // leave same rank edges out for now
        //             if (!this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){

        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u2 + "_" + u1 
        //                 //     + " + x_" + v1 + "_" + v2 
        //                 //     + " >= 1\n"

        //                 model.subjectTo += mkc(u1, v1, u2, v2) + ""
        //                     + mkx(u2, u1)[0]
        //                     + mkx(v1, v2)[0]
        //                     + " >= " + (1 + mkx(u2, u1)[1] + mkx(v1, v2)[1]) + "\n"
            
        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u1 + "_" + u2 
        //                 //     + " + x_" + v2 + "_" + v1 
        //                 //     + " >= 1\n"

        //                 model.subjectTo += mkc(u1, v1, u2, v2) + ""
        //                     + mkx(u1, u2)[0]
        //                     + mkx(v2, v1)[0]
        //                     + " >= " + (1 + mkx(u1, u2)[1] + mkx(v2, v1)[1]) + "\n"

        //             // if they are both same rank edges
        //             } else if (this.isSameRankEdge(u1v1) && this.isSameRankEdge(u2v2)){
                        
        //                 // I am still doubtful about this needing to be declared for inverted left-right edges or not...

        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u1 + "_" + u2 
        //                 //     + " + x_" + v1 + "_" + v2 
        //                 //     + " + x_" + u2 + "_" + v1 
        //                 //     + " >= 1\n"

        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u1 + "_" + u2 
        //                 //     + " + x_" + v1 + "_" + v2 
        //                 //     + " + x_" + v2 + "_" + u1 
        //                 //     + " >= 1\n"

        //             // if u1v1 is the same rank edge and the other is not
        //             } else if (this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){

        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u2 + "_" + u1 
        //                 //     + " + x_" + v1 + "_" + u2 
        //                 //     + " >= 1\n"

        //                 // model.subjectTo += mkc(u1, v1, u2, v2) + ""
        //                 //     + mkx(u2, u1)[0]
        //                 //     + mkx(v1, u2)[0]
        //                 //     + " >= " + (1 + mkx(u2, u1)[1] + mkx(v1, u2)[1]) + "\n"

        //                 // model.subjectTo += "c_" + u1 + v1  
        //                 //     + "_" + u2 + v2 
        //                 //     + " + x_" + u2 + "_" + v1 
        //                 //     + " + x_" + u1 + "_" + u2 
        //                 //     + " >= 1\n"

        //                 // model.subjectTo += mkc(u1, v1, u2, v2) + ""
        //                 //     + mkx(u2, v1)[0]
        //                 //     + mkx(u1, u2)[0]
        //                 //     + " >= " + (1 + mkx(u2, v1)[1] + mkx(u1, u2)[1]) + "\n"
        //             }
        //         }
        //     }
        // }

        // fill function to minimize
        for (let elem in crossing_vars){
            model.minimize += elem + " + "
        }
        model.minimize = model.minimize.substring(0, model.minimize.length - 2) + "\n\n"

        for (let elem in definitions){
            model.bounds += "binary " + elem + "\n"
        }

        console.log(this.modelToString(model))
    }

    fillModel3(model){
        model.minimize = "Minimize \ncrossings: "
        model.subjectTo = "Subject To \n"
        model.bounds = "\nBounds \n"

        let exst_rel = []

        // objective function
        // for (let k=0; k<this.g.maxDepth + 1; k++){
        //     let layerEdges = this.g.edgeIndex[k]
        //     for (let i=0; i<layerEdges.length; i++){
        //         for (let j=0; j<layerEdges.length; j++){
        //             if (layerEdges[i] != layerEdges[j]){
        //                 let crossvar = "c_" + layerEdges[i].leftAttribute.name + layerEdges[i].rightAttribute.name 
        //                     + "_" + layerEdges[j].leftAttribute.name + layerEdges[j].rightAttribute.name
        //                 model.minimize += crossvar + ' + '
                
        //                 //model.bounds += "binary " + crossvar + "\n"
        //             }
        //         }
        //     }      
        // }

        //model.minimize = model.minimize.substring(0, model.minimize.length - 2) + '\n\n';

        let mkx = (firstElem, secondElem, pre = "") => {
            let res = ""
            if (exst_rel.indexOf("x_" + pre + secondElem + "_" + pre + firstElem) != -1)
                res = "1 - x_" + pre + secondElem + "_" + pre + firstElem;
            else {
                res = "x_" + pre + firstElem + "_" + pre + secondElem;
                if (exst_rel.indexOf(res) == -1) exst_rel.push(res)
            }
            return "" + res + "";
        }

        let mkxB = (firstElem, secondElem, pre = "") => {
            return "x_" + pre + firstElem + "_" + pre + secondElem;
        }

        let mkcB = (u1, v1, u2, v2) => {
            return "c_" + u1 + v1 + "_" + u2 + v2 
        }

        let mkc = (u1, v1, u2, v2) => {
            let index = -1;
            if (exst_rel.indexOf(mkcB(u2, v2, u1, v1)) != -1) index = exst_rel.indexOf(mkcB(u2, v2, u1, v1)) 
            else if (exst_rel.indexOf(mkcB(v2, u2, u1, v1)) != -1) index = exst_rel.indexOf(mkcB(v2, u2, u1, v1))
            else if (exst_rel.indexOf(mkcB(v2, u2, v1, u1)) != -1) index = exst_rel.indexOf(mkcB(v2, u2, v1, u1))
            else if (exst_rel.indexOf(mkcB(u2, v2, v1, u1)) != -1) index = exst_rel.indexOf(mkcB(u2, v2, v1, u1))
            else if (exst_rel.indexOf(mkcB(u1, v1, v2, u2)) != -1) index = exst_rel.indexOf(mkcB(u1, v1, v2, u2))
            else if (exst_rel.indexOf(mkcB(v1, u1, u2, v2)) != -1) index = exst_rel.indexOf(mkcB(v1, u1, u2, v2))
            else if (exst_rel.indexOf(mkcB(v1, u1, v2, u2)) != -1) index = exst_rel.indexOf(mkcB(v1, u1, v2, u2))
            else if (exst_rel.indexOf(mkcB(u1, v1, u2, v2)) != -1) index = exst_rel.indexOf(mkcB(u1, v1, u2, v2))
            else {
                exst_rel.push(mkcB(u1, v1, u2, v2))
                return mkcB(u1, v1, u2, v2)
            }
            return exst_rel[index]
        }

        let mkxstat = (el1, el2, pre = '') => {
            let offset = 0
            let res = ""

            // if the opposite exists in the recorded declared variables
            if (exst_rel.indexOf(mkxB(el2, el1, pre)) != -1) {
                offset -= 1
                res = " - " + mkxB(el2, el1, pre) 
            } else {
                res = " + " + mkxB(el1, el2, pre)
                // if it doesn't exist in recorded declarations, record it
                if (exst_rel.indexOf(mkxB(el1, el2, pre)) == -1) exst_rel.push(mkxB(el1, el2, pre))
            }

            return [res, offset]
        }

        let mkxstatB = (el1, el2, pre) => {
            let offset = 0
            let res = ""

            // if the opposite exists in the recorded declared variables
            if (exst_rel.indexOf(mkxB(el2, el1, pre)) != -1) {
                offset -= 1
                res = " + " + mkxB(el2, el1, pre) 
            } else {
                res = " - " + mkxB(el1, el2, pre)
                // if it doesn't exist in recorded declarations, record it
                if (exst_rel.indexOf(mkxB(el1, el2, pre)) == -1) exst_rel.push(mkxB(el1, el2, pre))
            }

            return [res, offset]
        }

        // transitivity of table relationship
        for (let k=0; k < this.g.maxDepth + 1; k++){
             let layerTables = this.g.tableIndex[k];
             for (let i = 0; i < layerTables.length; i++){

                 let t1 = layerTables[i].name;
                 
                 for (let j = i+1; j < layerTables.length; j++){
                    let t2 = layerTables[j].name;

                    for (let m = j + 1; m < layerTables.length; m++){
                        let t3 = layerTables[m].name;

                        // model.subjectTo += 
                        //     mkxstat(t3, t1, 'T') + " - " + mkx(t3, t2, 'T') + " - " + mkx(t2, t1, 'T') + " >= -1 \n"
                        
                        // model.subjectTo += "table_transitivity" + k + "," + i + "," + j + "," + m +": " 
                        //     + mkxstat(t3, t1, 'T')[0] 
                        //     + mkxstatB(t3, t2, 'T')[0] 
                        //     + mkxstatB(t2, t1, 'T')[0] 
                        //     + " >= " + (-1 + mkxstat(t3, t1, 'T')[1] + mkxstatB(t3, t2, 'T')[1] + mkxstatB(t2, t1, 'T')[1]) + "\n"

                        model.subjectTo += 
                            + mkxstat(t3, t1, 'T')[0] 
                            + mkxstat(t3, t2, 'T')[0] 
                            + mkxstat(t2, t1, 'T')[0] 
                            + " >= " + (-1 + mkxstat(t3, t1, 'T')[1] + mkxstat(t3, t2, 'T')[1] + mkxstat(t2, t1, 'T')[1]) + "\n"
                        
                        // model.subjectTo += "table_transitivity" + k + "," + i + "," + j + "," + m +"_2: " 
                        //     + mkxstat(t3, t1, 'T')[0] 
                        //     + mkxstat(t2, t3, 'T')[0] 
                        //     + mkxstat(t1, t2, 'T')[0] 
                        //     + " >= " + (1 + mkxstat(t3, t1, 'T')[1] + mkxstat(t2, t3, 'T')[1] + mkxstat(t1, t2, 'T')[1]) + "\n"
                    }
                 }
            }
        }


        // transitivity of attribute relationship
        for (let k=0; k < this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            
            for (let i = 0; i < layerAttributes.length; i++){
                let t1 = layerAttributes[i].name;
                
                for (let j = i+1; j < layerAttributes.length; j++){
                    let t2 = layerAttributes[j].name;

                    if (layerAttributes[i].table.name != layerAttributes[j].table.name) continue

                    for (let m = j+1; m < layerAttributes.length; m++){

                        if (layerAttributes[m].table.name != layerAttributes[i].table.name) continue
                        if (layerAttributes[m].table.name != layerAttributes[j].table.name) continue

                        let t3 = layerAttributes[m].name;

                        // model.subjectTo += "transitivity" + k + "," + i + "," + j + "," + m +": " 
                        //     + mkxstat(t3, t1)[0] 
                        //     + mkxstatB(t3, t2)[0] 
                        //     + mkxstatB(t2, t1)[0] 
                        //     + " >= " + (-1 + mkxstat(t3, t1)[1] + mkxstatB(t3, t2)[1] + mkxstatB(t2, t1)[1]) + "\n"

                        // model.subjectTo += "transitivity" + k + "," + i + "," + j + "," + m +"_2: " 
                        //     + mkxstat(t3, t1)[0] 
                        //     + mkxstatB(t2, t3)[0] 
                        //     + mkxstatB(t1, t2)[0] 
                        //     + " >= " + (-1 + mkxstat(t3, t1)[1] + mkxstatB(t2, t3)[1] + mkxstatB(t1, t2)[1]) + "\n"

                        // model.subjectTo += "transitivity" + k + "," + i + "," + j + "," + m +"_2: " 
                        //     + mkxstat(t3, t1)[0] 
                        //     + mkxstat(t3, t2)[0] 
                        //     + mkxstat(t2, t1)[0] 
                        //     + " >= " + (-1 + mkxstat(t3, t1)[1] + mkxstat(t3, t2)[1] + mkxstat(t2, t1)[1]) + "\n"

                        model.subjectTo += 
                            + mkxstat(t3, t1)[0] 
                            + mkxstat(t2, t3)[0] 
                            + mkxstat(t1, t2)[0] 
                            + " >= " + (1 + mkxstat(t3, t1)[1] + mkxstat(t2, t3)[1] + mkxstat(t1, t2)[1]) + "\n"
                   
                    }
                }
           }
       }

       // grouping constraint of attributes within tables
       for (let k=0; k<this.g.maxDepth + 1; k++){
            let layerTables = this.g.tableIndex[k];
            let layerAttributes = layerTables.map(t => t.attributes).flat()
            
            for (let i=0; i<layerAttributes.length; i++){
                let attr1 = layerAttributes[i].name;
                let t1 = layerAttributes[i].table.name;

                for (let j=i+1; j<layerAttributes.length; j++){
                    let attr2 = layerAttributes[j].name;
                    let t2 = layerAttributes[j].table.name

                    if (t1 != t2){
                        // model.subjectTo += "x_" + attr1.name + "_" + attr2.name + " - "
                        //     + "x_T" + attr1.table.name + "_T" + attr2.table.name + " = 0\n"

                        model.subjectTo += mkxstat(attr2, attr1)[0] + ""
                            + mkxstatB(t2, t1, 'T')[0] 
                            + " = " + (0 + mkxstat(attr2, attr1)[1] + mkxstatB(t2, t1, 'T')[1]) + "\n"

                        // model.subjectTo += mkxstat(attr2, attr1)[0] + ""
                        //     + mkxstat(t1, t2, 'T')[0] 
                        //     + " <= " + (1 + mkxstat(attr2, attr1)[1] + mkxstat(t1, t2, 'T')[1]) + "\n"
                    }
                }
            }
        }

        // attribute positions determine crossings for non-same-rank edges
        for (let k=0; k < this.g.maxDepth; k++){
            let layerEdges = this.g.edgeIndex[k]
            
            for (let i=0; i<layerEdges.length; i++){
                let u1v1 = layerEdges[i]
                
                for (let j=i+1; j<layerEdges.length; j++){
                    //if (i==j) continue
                    let u2v2 = layerEdges[j]

                    // leave same rank edges out for now
                    if (u1v1.leftTable.depth == u1v1.rightTable.depth || u2v2.leftTable.depth == u2v2.rightTable.depth) continue

                    let u1 = u1v1.leftAttribute.name 
                    let v1 = u1v1.rightAttribute.name
                    let u2 = u2v2.leftAttribute.name
                    let v2 = u2v2.rightAttribute.name

                    // model.subjectTo += "c_" + u1 + v1  
                    //     + "_" + u2 + v2 
                    //     + " + x_" + u2 + "_" + u1 
                    //     + " + x_" + v1 + "_" + v2 
                    //     + " >= 1\n"
            
                    let firstP = mkc(u1, v1, u2, v2)
                    let secondP = mkxstat(u2, u1)[0]
                    let thirdP = mkxstat(v1, v2)[0]
                    let lastP = 1 + mkxstat(u2, u1)[1] + mkxstat(v1, v2)[1]
                    
                    model.subjectTo += firstP + secondP + thirdP + " >= " + lastP + "\n"


                    // model.subjectTo += "c_" + u1 + v1  
                    //     + "_" + u2 + v2 
                    //     + " + x_" + u1 + "_" + u2 
                    //     + " + x_" + v2 + "_" + v1 
                    //     + " >= 1\n"

                    firstP = mkc(u1, v1, u2, v2)
                    secondP = mkxstat(u1, u2)[0]
                    thirdP = mkxstat(v2, v1)[0]
                    lastP = 1 + mkxstat(u1, u2)[1] + mkxstat(v2, v1)[1]

                    model.subjectTo += firstP + secondP + thirdP + " >= " + lastP + "\n"
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

                        // model.subjectTo += "c_" + u1 + v1  
                        //     + "_" + u2 + v2 
                        //     + " + x_" + u1 + "_" + u2 
                        //     + " + x_" + v1 + "_" + v2 
                        //     + " + x_" + u2 + "_" + v1 
                        //     + " >= 1\n"

                        model.subjectTo += mkc(u1, v1, u2, v2) + ""
                            + mkxstat(u1, u2)[0]
                            + mkxstat(v1, v2)[0]
                            + mkxstat(u2, v1)[0]
                            + " >= " + (1 + mkxstat(u1, u2)[1] + mkxstat(v1, v2)[1] + mkxstat(u2, v1)[1]) + "\n"

                        // model.subjectTo += "c_" + u1 + v1  
                        //     + "_" + u2 + v2 
                        //     + " + x_" + u1 + "_" + u2 
                        //     + " + x_" + v1 + "_" + v2 
                        //     + " + x_" + v2 + "_" + u1 
                        //     + " >= 1\n"

                        model.subjectTo += mkc(u1, v1, u2, v2) + ""
                            + mkxstat(u1, u2)[0]
                            + mkxstat(v1, v2)[0]
                            + mkxstat(v2, u1)[0]
                            + " >= " + (1 + mkxstat(u1, u2)[1] + mkxstat(v1, v2)[1] + mkxstat(v2, u1)[1]) + "\n"

                    // if u1v1 is the same rank edge and the other is not
                    } else if (this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){
                        let u1 = u1v1.leftAttribute.name 
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        // model.subjectTo += "c_" + u1 + v1  
                        //     + "_" + u2 + v2 
                        //     + " + x_" + u2 + "_" + u1 
                        //     + " + x_" + v1 + "_" + u2 
                        //     + " >= 1\n"

                        model.subjectTo += mkc(u1, v1, u2, v2) + ""
                            + mkxstat(u2, u1)[0]
                            + mkxstat(v1, u2)[0]
                            + " >= " + (1 + mkxstat(u2, u1)[1] + mkxstat(v1, u2)[1]) + "\n"

                        // model.subjectTo += "c_" + u1 + v1  
                        //     + "_" + u2 + v2 
                        //     + " + x_" + u2 + "_" + v1 
                        //     + " + x_" + u1 + "_" + u2 
                        //     + " >= 1\n"

                        model.subjectTo += mkc(u1, v1, u2, v2) + ""
                            + mkxstat(u2, v1)[0]
                            + mkxstat(u1, u2)[0]
                            + " >= " + (1 + mkxstat(u2, v1)[1] + mkxstat(u1, u2)[1]) + "\n"
                    }
                }
            }
        }

        for (let elem of exst_rel){
            model.bounds += "binary " + elem + "\n"
            if (elem[0] == "c") model.minimize += elem + ' + '
        }

        model.minimize = model.minimize.substring(0, model.minimize.length - 2) + '\n\n';

        console.log(this.modelToString(model))

    }


    fillModel2(model){
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
                    } else if (this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){
                        let u1 = u1v1.leftAttribute.name 
                        let v1 = u1v1.rightAttribute.name
                        let u2 = u2v2.leftAttribute.name
                        let v2 = u2v2.rightAttribute.name

                        model.subjectTo += "c_" + u1 + v1  
                            + "_" + u2 + v2 
                            + " + x_" + u2 + "_" + u1 
                            + " + x_" + v1 + "_" + u2 
                            + " >= 1\n"

                        model.subjectTo += "c_" + u1 + v1  
                            + "_" + u2 + v2 
                            + " + x_" + u2 + "_" + v1 
                            + " + x_" + u1 + "_" + u2 
                            + " >= 1\n"
                    }
                }
            }
        }

    }

    isSameRankEdge(edge){
        return edge.leftTable.depth == edge.rightTable.depth
    }

    modelToString(model){
        return model.minimize + model.subjectTo + model.bounds + '\nEnd\n'
    }

    apply_solution(solution){
        console.log(solution)
        for (let i=0; i<this.g.maxDepth + 1; i++){
            let layerTables = this.g.tableIndex[i];

            layerTables.sort((a, b) => {
                //console.log(a.name, b.name, solution["x_T" + a.name + "_T" + b.name], solution["x_T" + b.name + "_T" + a.name])
                if (solution["x_T" + a.name + "_T" + b.name] == 0) return 1
                else if (solution["x_T" + a.name + "_T" + b.name] == 1) return -1
                else if (solution["x_T" + b.name + "_T" + a.name] == 1) return 1
                else if (solution["x_T" + b.name + "_T" + a.name] == 0) return -1
            })

            for (let k in layerTables){
                layerTables[k].weight = k;
            }

            for (let table of layerTables){
                table.attributes.sort((a, b) => {
                    //if (b.table.name == "T8y4") console.log(a.name, b.name, solution["x_" + b.name + "_" + a.name])
                    if (solution["x_" + a.name + "_" + b.name] == 0) return 1
                    else if (solution["x_" + a.name + "_" + b.name] == 1) return -1
                    else if (solution["x_" + b.name + "_" + a.name] == 1) return 1
                    else if (solution["x_" + b.name + "_" + a.name] == 0) return -1
                })

                for (let j=0; j<table.attributes.length; j++){
                    table.attributes[j].weight = j;
                }
            }
        }
    }
}