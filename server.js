const express = require ("express");
const bodyParser = require ("body-parser");
const jwt = require("jsonwebtoken");
const mysql =require("mysql2");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT ||5000;
const JWT_SECRET =process.env.JWT_SECRET;


//Database
const db = mysql.createConnection({
    host: "localhost",
    user:"root",
    password:"",
    database:"task",
});
db.connect((err) =>{
    if(err) throw err;
    console.log("Succefull Dtabase Connected");
});

//middleware
const authenticationToken =(req,res,next)=>{
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];
  
    if(!token){
return res.status(401).json({message:"token is missing"});
    } 

    jwt.verify(token, JWT_SECRET, (err, user)=>{
        if(err) return res.status(403).json({message:"token invalid"});
        req.user =user;
        next();
    });
};

//home page
app.get("/",(req,res)=>{
    res.send("Api is working");
});
//login
app.post("/login", (req,res)=>{
    const {email,password} =req.body;
    console.log("Recived", email, password);
    if(email.toLowerCase() === "admin@codesfortomorrow.com" && password === "Admin123!@#"){
        const token =jwt.sign({email},JWT_SECRET,{expiresIn:"1h"});
        return res.json({token});

    }
    return res.status(401).json({message:"Invalid credentials"});
    
});

//Create Category
app.post("/category", authenticationToken , (req,res)=>{
    const {name } = req.body;
    db.query("INSERT INTO categories (name) VALUES (?)",[name],(err, result) =>{
        if(err) return res.status(500).json({error: err.message});
        res.json({message:"Category Created Sussfully!", id: result.insertId});
    });
});
 
app.get("/categories", authenticationToken, (req, res)=>{
    db.query("SELECT * FROM categories", (err, rows)=>{
        if(err) return res.status(500).json ({error: err.message});
        res.json(rows);
    });
});

//Update
app.put("/category/:Id" ,authenticationToken ,(req , res)=>{
    const {id} = req.params;
    const {name} = req.body;
    db.query("UPDATE categories SET name = ? WHERE id =?", [name, id], (err)=>{
        if(err) return res.status(500).json({error: err.message});
        res.json({message:"Category Update Sussfully"});
        } );
});

//Delete
app.delete("/category/:Id" ,authenticationToken ,(req , res)=>{
    const {id} = req.params;

    db.query("SELECT COUNT(*) As count FROM services WHERE category_id = ?", [id], (err, result)=>{
        if(err) return res.status(500).json({error: err.message});
        if (result[0].count >0){
            return   res.status(400).json({message:"Category not empty"});

        }
        db.query("DELETE FROM categories WHERE id = ?" , [id],(err)=>{
            if(err) return res.status(500).json({error: err.message});
            res.json({message:"Category delete Succfully!"})
        });
     
        });
});

//Add Service
app.post("/category/:categoryId/service",authenticationToken,(req,res)=>{
const {categoryID} = req.params;
const {name, type, notes , price_options} =req.body;

db.query("INSERT INTO services (category_id ,name ,type , notes) VALUES (?,?,?,?)", 
[categoryID , name,type,notes],
(err, result)=>{
    if(err) return res.status(500).json({error:err.message});
    const seviceID = result.insertId;

    if(!price_options || price_options.length === 0){
        return res.json({message:"Service created (no prices)",seviceID});
    }
    const values =price_options.map((opt)=> [seviceID,opt.title,opt.price]);
    db.query("INSERT INTO service_price(seviceID,opt.title,opt.price) VALUES ?",[values],
        (err)=>{
            if(err) return res.status(500).json({error:err.message});
            res.json({message:"Service with price created", seviceID});
        }
    );

}
);

});

//get
app.get("/category/:categoryId/service",authenticationToken,(req,res)=>{
    const {categoryID} = req.params;
    db.query("SELECT *FROM services WHERE category_id = ? ", [categoryID],(err, services)=>{
        if(err) return res.status(500).json({error: err.message});

        const ids = services.map((s)=>s.id);
        if(ids.length === 0) return res.json([]);

        db.qurey("SELECT * FROM service_price WHERE service_id IN (?)", [ids], (err,price)=>{
            if(err ) return res.status(500).json({error: err.message});

            const map = {};
            price.forEach((p)=>{
                if(!map[p.services_id]) map[p.services_id] =[];
                map[p.services_id].push(p);
            });
            res.json(result);
        });
    });
});

//update 

app.put("/category/:categoryId/service/:serviceId",authenticationToken,(req,res)=>{
    const {categoryID , serviceId} = req.params;
    const {name, type , notes ,price_options} = req.body;

    db.query(
        "UPDATE services SET name = ?, type = ?, notes = ? WHERE id = ? AND category_id = ? ",
         [name, type , notes ,serviceId,categoryID],
        (err)=>{
        if(err) return res.status(500).json({error: err.message});


        db.query("DELETE  FROM service_prices WHERE service_id = ?", [serviceId], (err)=>{
            if(err ) return res.status(500).json({error: err.message});

           if(!price_options || price_options.length=== 0){
            return res.json({message: "Service update without prices"});
           }
           const values = price_options.map((opt)=>[serviceId,opt.title,opt.price]);
           db.query("INSERT INTO service_price (service_id, title, price) VALUES ?", [values],(err)=>{
            if(err) return res.status(500).json({error: err.message});
            res.json({message: "service and price update "});

            });
            });
        
            
        });
    });

    //Delete
    app.delete("/category/:categoryId/service/:serviceId", authenticationToken, (req,res) =>{
        const {serviceId} = req.params;

        db.query("DELETE FROM service_prices WHERE service_id = ?", [serviceId],(err)=>{
            if(err) return res.status(500).json({error: err.message});

            db.query("DELETE FROM services WHERE id =?",[serviceId], (err)=>{
                if(err) return res.status(500).json({error: err.message});
                res.json({message:"Service deleted"});
            });
        });
    });


    app.listen(PORT, () => console.log(`server running Sussfully at http://localhost:${PORT}`));

